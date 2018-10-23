const ts   = require('typescript');
const util = require('util');

const {CompilerHost} = require('./compiler_host');
const {hostRequire}  = require('./compiler_host');
const {newResolver}  = require('./resolver');


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


async function compile(opts) {
  const cmd = ts.parseCommandLine(opts.args)

  if(cmd.errors.length > 0) {
    return exitErrors(cmd.errors)
  }

  const resolver = await newResolver(opts.lib, cmd.fileNames);
  const compiler = new CompilerHost(cmd.options, resolver);

  const program = ts.createProgram(cmd.fileNames, cmd.options, compiler);
  const transformers = {
    before: opts.transformers.before.map((t) =>
      hostRequire(compiler, cmd.options, t).default(program)),
    after: opts.transformers.after.map((t) =>
      hostRequire(compiler, cmd.options, t).default(program)),
  };


  const {emitSkipped, diagnostics} = program.emit(
    undefined, undefined, undefined, false, transformers);

  if(emitSkipped) {
    return exitErrors(diagnostics);
  }

  return {exitCode: 0, output: ''};
}

module.exports = {
  compile,
}
