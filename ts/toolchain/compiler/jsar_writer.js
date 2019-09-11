const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const { bundle } = require("com_vistarmedia_rules_js/js/tools/jsar/jsar");

const { CompilerHost } = require("./compiler_host");

const open = promisify(fs.open);

class JsarWriter extends CompilerHost {
  constructor(file, pkg, options, resolver) {
    super(options, resolver);
    this.file = file;
    this.pkg = pkg;
  }

  async writeFile(name, data, writeBOM, onError, sourceFiles) {
    try {
      const fileName = path.join("/", this.pkg, name);
      fs.writeSync(this.file, bundle(fileName, data));
    } catch (e) {
      onError(e);
    }
  }
}

async function newJsarWriter(fileName, pkg, options, resolver) {
  const file = await open(fileName, "w");
  return new JsarWriter(file, pkg, options, resolver);
}

module.exports = {
  JsarWriter,
  newJsarWriter
};
