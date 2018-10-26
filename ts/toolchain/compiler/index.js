const ts   = require('typescript');
const util = require('util');

const {CompilerHost} = require('./compiler_host');
const {hostRequire}  = require('./compiler_host');
const {newResolver}  = require('./resolver');
const {strictDeps}   = require('./strict_deps');


function logError(error) {
  const {
    code,
    file,
    length,
    messageText,
    start,
  } = error


  if(!file) {
    return error
  }
  const {fileName, text, lineMap} = file

  const {line, character} = error.file.getLineAndCharacterOfPosition(start)
  const lineContent = text.split('\n')[line]

  const buf = [''];
  buf.push(util.format('[ERROR TS%s] %s %s:%s ', code,
    fileName, line+1, character+1,
    messageText));
  buf.push(lineContent);
  buf.push(' '.repeat(character));
  return buf.join('\n');
}

function exitErrors(errors) {
  const msgs = errors.map(logError);
  return {exitCode: 1, output: msgs.join('\n') };
}

function checkStrictImports(label, imports, jsarByFile, depByJsar, ignored) {
  const prefix = '/node_modules/';
  const usedJsars = [];
  const errors = [];

  // Warn about transitive imports
  for(const src of Object.keys(imports)) {
    for(const imptPath of imports[src]) {
      if(!imptPath.startsWith(prefix)) {
        // TODO: Look more into this. I believe there are some things that sneak
        // by that aren't correct, but it all gets bogged down in the specifics
        // of type resolution
        continue;
      }
      const file = imptPath.slice(prefix.length-1);
      const jsar = jsarByFile[file];
      const dep  = depByJsar[jsar];
      if(dep === undefined) {
        errors.push(util.format('%s: %s imports %s through %s transitively',
          label, src, file, jsar));
      } else {
        if(usedJsars.indexOf(dep) < 0) {
          usedJsars.push(dep);
        }
      }
    }
  }

  // Warn about unused deps
  for(const dep of Object.values(depByJsar)) {
    if(ignored.indexOf(dep) >= 0) {
      continue;
    }
    if(usedJsars.indexOf(dep) < 0) {
      errors.push(util.format('%s Unused dep %s should be removed', label, dep));
    }
  }

  return errors;
}

async function compile(opts, inputs) {
  const checksums = inputs.reduce((acc, input) => {
    acc[input.path] = input.digest.toHex();
    return acc;
  }, {});

  const depByJsar = opts.deps.reduce((acc, [dep, jsar]) => {
    acc[jsar] = dep;
    return acc;
  }, {});

  const cmd = ts.parseCommandLine(opts.args)

  if(cmd.errors.length > 0) {
    return exitErrors(cmd.errors)
  }

  const resolver = await newResolver(opts.lib, cmd.fileNames, checksums);
  const compiler = new CompilerHost(cmd.options, resolver);

  const program = ts.createProgram(cmd.fileNames, cmd.options, compiler);

  const beforeTransforms = opts.transformers.before.map((t) =>
      hostRequire(compiler, cmd.options, t).default(program));

  const afterTransforms = opts.transformers.after.map((t) =>
      hostRequire(compiler, cmd.options, t).default(program));

  const strictDepsPlugin = strictDeps(program);
  const transformers = {
    before: beforeTransforms.concat([strictDepsPlugin]),
    after:  afterTransforms,
  };

  const {emitSkipped, diagnostics} = program.emit(
    undefined, undefined, undefined, false, transformers);

  if(emitSkipped) {
    return exitErrors(diagnostics);
  }

  if(opts.strict_deps) {
    const errors = checkStrictImports(
      opts.label,
      strictDepsPlugin.imports(),
      resolver.jsarByFile,
      depByJsar,
      opts.ignored_strict_deps);
    return {exitCode: errors.length, output: errors.join("\n")};
  }

  return {exitCode: 0, output: ''};
}

module.exports = {
  compile,
}
