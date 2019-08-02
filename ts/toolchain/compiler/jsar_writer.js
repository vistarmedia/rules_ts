const fs          = require('fs');
const {promisify} = require('util');

const {bundle} = require('com_vistarmedia_rules_js/js/tools/jsar/jsar');

const {CompilerHost} = require('./compiler_host');

const open = promisify(fs.open);

class JsarWriter extends CompilerHost {

  constructor(file, options, resolver) {
    super(options, resolver);
    this.file = file;
  }

  async writeFile(name, data, writeBOM, onError, sourceFiles) {
    try {
      fs.writeSync(this.file, bundle(name, data));
    } catch(e) {
      onError(e);
    }
  }
}

async function newJsarWriter(fileName, options, resolver) {
  const file = await open(fileName, 'w');
  return new JsarWriter(file, options, resolver);
}

module.exports = {
  JsarWriter,
  newJsarWriter,
}
