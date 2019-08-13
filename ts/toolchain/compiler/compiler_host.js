const ts = require('typescript');
const path = require('path');
const crypto = require('crypto');

const {LRU} = require('./lru');

const srcCache = new LRU(1500);

/**
 * A `CompilerHost` is how `tsc` interacts with the host filesystem. It is
 * responsible for file access and module resolution. Below, we proxy most calls
 * to the given `Resolver` to have it consult a virtual filesystem for module
 * resolution.
 *
 * In most examples you find online, you'll find people overriding
 * `resolveModuleNames` to have `require` statements do non-standard things.
 * However here we are assume the `Resolver` is presenting a filesystem
 * consistent with `tsc`'s algorithm, so we simply proxy most calls to that
 * instance.
 */
class CompilerHost {

  constructor(options, resolver) {
    this._delegate = ts.createCompilerHost(options);
    this._resolver = resolver;
  }

  getSourceFile(name, langVersion, onError, shouldCreateNewSourceFile) {
    // The incoming source files will not be fully-qualified. Treat them like
    // they're on the root of the FS. Pass the original to `createSourceFile`
    // for consistent error reporting
    let fsFile = name;
    if(fsFile[0] !== '/') {
      fsFile = '/' + fsFile;
    }

    ts.performance.mark("hashStart");
    const source = this._resolver.readFile(fsFile);
    const hash = crypto.createHash('sha1')
      .update(name)
      .update(source)
      .update(langVersion ? langVersion.toString() : '')
      .digest('hex');
    ts.performance.measure("Hash", "hashStart");

    if(srcCache.hasKey(hash)) {
      return srcCache.get(hash);
    }

    if(source !== undefined) {
      const sf = ts.createSourceFile(name, source, langVersion);
      srcCache.set(hash, sf);
      return sf;
    }
  }

  getDefaultLibFileName(options) {
    return path.join(this.getDefaultLibLocation(), 'lib.d.ts');
  }

  getDefaultLibLocation() {
    return path.join(this.getCurrentDirectory(), 'node_modules', 'typescript',
      'lib');
  }

  writeFile(name, data, writeBOM, onError, sourceFiles) {
    return this._delegate.writeFile(name, data, writeBOM, onError, sourceFiles);
  }

  getCurrentDirectory() {
    return "/";
  }

  getCanonicalFileName(path) {
    return this._delegate.getCanonicalFileName(path);
  }

  getNewLine() {
    return this._delegate.getNewLine();
  }

  useCaseSensitiveFileNames() {
    return this._delegate.useCaseSensitiveFileNames();
  }

  fileExists(fileName) {
    return this._resolver.fileExists(fileName);
  }

  readFile(fileName) {
    return this._resolver.readFile(fileName);
  }

  directoryExists(dirName) {
    return this._resolver.directoryExists(dirName);
  }

  getDirectories(dirName) {
    return this._resolver.getDirectories(dirName);
  }
}


/**
 * Use a `CompilerHost` to require a module. This is needed in the cases where
 * compile-time dependencies are needed at run-time. A concrete example is
 * transforms. That code is written as a library, but must run in the host
 * compiler (not just be used as a data structure to translate Typescript into
 * Javascript).
 *
 * This will expose a `require` function to each module which will first try to
 * resolve the import from the current `tsc` require, then fall back to going
 * back to the `CompilerHost` to import the file.
 *
 * The `require`'ing module is not considered here, so relative imports may
 * prove problematic. Fixing that would be a matter is factoring out calls to
 * `process.cwd()` below to the `path.dirname` of the requiring file.
 *
 * Only `exports` is exposed. Code using `module.exports` will likely crash.
 */
function hostRequire(host, options, module) {
  ts.performance.mark("hostRequireStart");
  const fileName = ts.resolveJSModule(module, '/', host)
  const src = host.readFile(fileName);

  const requireFun = (name) => {
    try {
      return require(name);
    } catch(err) {
      // On to the next thing
    }
    return hostRequire(host, options, name);
  }
  const capturedExports = {};

  new Function('require', 'exports', '__dirname', src)(
    requireFun,
    capturedExports,
    path.dirname(fileName));
  ts.performance.measure("HostRequire", "hostRequireStart");

  return capturedExports;
}

module.exports = {
  CompilerHost,
  hostRequire,
};
