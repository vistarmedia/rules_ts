const ts = require('typescript')

function logError(error) {
  const {
    code,
    file,
    length,
    messageText,
    start,
  } = error


  if(!file) {
    console.error(error)
    return
  }
  const {fileName, text, lineMap} = file

  const {line, character} = error.file.getLineAndCharacterOfPosition(start)
  const lineContent = text.split('\n')[line]

  console.error()
  console.error('[ERROR TS%s] %s %s:%s ', code,
    fileName, line+1, character+1,
    messageText)
  console.error(lineContent)
  console.error(' '.repeat(character) + '^')
}

function exitErrors(errors) {
  errors.forEach(logError)
  process.exit(1)
}


function main(opts) {
  const cmd = ts.parseCommandLine(opts.args)

  if(cmd.errors.length > 0) {
    exitErrors(cmd.errors)
  }

  const program = ts.createProgram(cmd.fileNames, cmd.options)
  const transformers = {
    before: opts.transformers.before.map((t) => require(t).default(program)),
    after:  opts.transformers.after.map((t) => require(t).default(program)),
  }

  const {emitSkipped, diagnostics} = program.emit(
    undefined, undefined, undefined, false, transformers)

  if(emitSkipped) {
    exitErrors(diagnostics)
  }
}

main(JSON.parse(process.argv[2]))
