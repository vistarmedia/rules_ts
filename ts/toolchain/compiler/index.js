const ts   = require('typescript');
const util = require('util');
const fs   = require('fs');

const {CompilerHost}  = require('./compiler_host');
const {hostRequire}   = require('./compiler_host');
const {newJsarWriter} = require('./jsar_writer');
const {newResolver}   = require('./resolver');
const {strictDeps}    = require('./strict_deps');

const readFile = util.promisify(fs.readFile);


function logError(error) {
  const {
    code,
    file,
    messageText,
    start,
  } = error

  if(file) {
    const {line, character} = file.getLineAndCharacterOfPosition(start);
    const message = ts.flattenDiagnosticMessageText(messageText, "\n");
    return `[TS${code}] ${file.fileName} ({$line+1}:${character+1}) ${message}`
  } else {
    return ts.flattenDiagnosticMessageText(
      `[TS${code}] ${messageText}` + error.messageText, "\n");
  }
}

function exitErrors(diagnostics, host) {
  let output = '';

  if(host) {
    output = ts.formatDiagnosticsWithColorAndContext(diagnostics, host);
  } else {
    output = diagnostics.map(logError).join("\n");
  }

  return {exitCode: 1, output};
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

// Generate a performance log if the total time is greater than the given
// `perfMaxMs`. Otherwise, return an empty string
function perfLog(label, perfMaxMs) {
  let totalTimeMs = 0;
  let output = '';

  ts.performance.forEachMeasure((key, measure) => {
    totalTimeMs += measure;
    output += `[PERF ${label}] ${key}: ${measure}ms\n`;
  });

  output += `[PERF ${label}] TOTAL ${totalTimeMs}ms\n`;
  ts.performance.disable();

  if(totalTimeMs > perfMaxMs) {
    return output;
  }
  return '';
}

async function compile(opts, inputs, perfMaxMs=0) {
  if(perfMaxMs) {
    ts.performance.enable();
  }

  const checksums = inputs.reduce((acc, input) => {
    acc[input.path] = input.digest.toHex();
    return acc;
  }, {});

  const depByJsar = opts.deps.reduce((acc, [dep, jsar]) => {
    acc[jsar] = dep;
    return acc;
  }, {});

  const argFileContent = await readFile(opts.args_file);
  const cmd = ts.parseCommandLine(argFileContent.toString().trim().split("\n"));

  if(cmd.errors.length > 0) {
    return exitErrors(cmd.errors)
  }

  const libFileContent = await readFile(opts.lib_file);
  const libs = libFileContent.toString().trim().split("\n");
  const [resolver, srcFiles] =
    await newResolver(libs, cmd.fileNames, checksums, opts.src_root);

  // Choose the compiler host based on which type of output we've been requested
  // to build
  let compiler;
  if(opts.output_jsar) {
    compiler = await newJsarWriter(opts.output_jsar, cmd.options, resolver);
  } else {
    compiler = new CompilerHost(cmd.options, resolver);
  }

  const program = ts.createProgram(srcFiles, cmd.options, compiler);

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

  if(diagnostics.length > 0) {
    return exitErrors(diagnostics, compiler);
  }

  if(opts.strict_deps) {
    const errors = checkStrictImports(
      opts.label,
      strictDepsPlugin.imports(),
      resolver.jsarByFile,
      depByJsar,
      opts.ignored_strict_deps);

    if(errors.length > 0) {
      return {exitCode: 3, output: errors.join("\n")};
    }
  }

  const output = perfMaxMs ? perfLog(opts.label, perfMaxMs) : '';
  return {exitCode: 0, output: output};
}

module.exports = {
  compile,
}
