// Resolvers tsc's interface to the filesystem. The strategy below is to overlay
// some jsar files on top of the real filesystem to convince tsc that we have a
// `node_modules` directory with all of this target's dependencies.
//
// Admittedly, the multiple `Resolver` abstractions below may seem
// over-engineered as each is used only once in practice. However, this allows
// for wildly different combinations to be composed quickly. Given the
// complexity of `tsc` and its resolution algorithm, this is vital for making
// radical but isolated changes to how files reach the compiler.
const path = require('path');
const ts   = require('typescript');
const util = require('util');
const fs   = require('fs');

const {unbundle} = require('io_bazel_rules_js/js/tools/jsar/jsar');

const readFile = util.promisify(fs.readFile);

/**
 *
 * Given a set of files, answer questions about the directory structure. This
 * pertains only to directories -- files are never given in any output. There is
 * no sanitation done on directory names. It is assumed all paths have have
 * leading `/` and no trailing `/`.
 *
 * @private
 */
class Directories {
  constructor() {
    this._dirs = {}
  }

  /**
   * Accumulates all directories leading to this file without storing the file
   * itself.
   */
  visitFile(fileName) {
    this.visitDirectory(path.dirname(fileName));
  }

  visitDirectory(dirName) {
    if(dirName === "/") {
      return;
    }

    if(!(dirName in this._dirs)) {
      this._dirs[dirName] = [];
    }

    const baseName  = path.basename(dirName);
    const parentDir = path.dirname(dirName);

    if(parentDir in this._dirs) {
      const existing = this._dirs[parentDir];
      if(this._dirs[parentDir].indexOf(baseName) < 0) {
        this._dirs[parentDir].push(baseName);
      }
    } else {
      this._dirs[parentDir] = [baseName];
    }

    this.visitDirectory(parentDir);
  }

  exists(dirName) {
    return dirName in this._dirs;
  }

  /**
   * Lists all directories contained in a directory
   */
  get(dirName) {
    return this._dirs[dirName];
  }
}

/**
 * Resolver which can take a mapping of source file names to their contents.
 * Uses the above `Directories` to infer a directory mapping from a flat object
 * of files. File bodies should be node `Buffer`s.
 * All file names must be fully-qualified and begin with a `/`. Directories are
 * not permitted.
 *
 *    >>> const resolver = new LibResolver({
 *      '/etc/passwd':      Buffer(),
 *      '/etc/hosts':       Buffer(),
 *      '/home/zzz/hosts':  Buffer(),
 *    });
 *
 *    >>> resolver.fileExists('/etc/passwd');
 *    true
 *    >>> resolver.getDirectories('/');
 *    ['etc', 'home']
 *
 */
class LibResolver {
  constructor(files) {
    this._files = files;

    this._directories = new Directories();
    for(const file in files) {
      this._directories.visitFile(file);
    }
  }

  fileExists(fileName) {
    if(fileName[0] !== '/') {
      throw Error('non-absolute file name', fileName);
    }
    return fileName in this._files;
  }

  readFile(fileName) {
    const buf = this._files[fileName];
    if(buf) {
      return buf.toString('utf8');
    }
  }

  directoryExists(dirName) {
    if(dirName[0] !== '/') {
      throw Error('non-absolute directory name' + fileName);
    }
    if(dirName !== "/" && dirName[dirName.length-1] === '/') {
      console.error('trailing slash of directory name:' + dirName);
      dirName = dirName.slice(0, -1);
    }
    return this._directories.exists(dirName);
  }

  getDirectories(dirName) {
    return this._directories.get(dirName);
  }
}

/**
 * Allows a `Resolver` to appear at some prefix. For example, if you had a
 * `Resolver` with entries for `/passwd` and `/hosts`, you could create a
 * `StripPrefixResolver` at `/etc`, and consult it as if all the files were
 * `/etc/passwd` and `/etc/hosts`.
 */
class StripPrefixResolver {
  constructor(prefix, resolver) {
    this._prefix = prefix;
    this._resolver = resolver;

    this._directories = new Directories();
    this._directories.visitDirectory(prefix);
  }

  fileExists(fileName) {
    const name = this._path(fileName);
    if(name !== undefined) {
      return this._resolver.fileExists(name);
    }
    return false
  }

  readFile(fileName) {
    const name = this._path(fileName);
    if(name !== undefined) {
      return this._resolver.readFile(name);
    }
  }

  directoryExists(dirName) {
    if(this._directories.exists(dirName)) {
      return true;
    }

    let name = this._path(dirName);
    if(name !== undefined) {
      return this._resolver.directoryExists(name);
    }
    return false;
  }

  getDirectories(dirName) {
    if(dirName === this._prefix) {
      return this._resolver.getDirectories("/");
    }

    const prefixDirs = this._directories.get(dirName);
    if(prefixDirs !== undefined) {
      return prefixDirs;
    }

    let name = this._path(dirName);
    if(name !== undefined) {
      return this._resolver.getDirectories(name);
    }
  }

  _path(fileName) {
    if(!fileName.startsWith(this._prefix)) {
      return;
    }
    return fileName.slice(this._prefix.length);
  }

}


/**
 * Resolve files on the filesystem. Uses Typescript's implementations which are
 * both synchronous (which they need to be), and appear to have some caching
 * built in. At least while the compiler is one-shot, this doesn't seem to be an
 * issue.
 *
 * Note, that this should not be needed for sandboxed workers, however, as
 * things stand, our Typescript package does not include the standard library
 * definition as a `jsar`, and it must fall back to disk. This should be able to
 * be removed at that point.
 */
class FSResolver {
  fileExists(fileName) {
    return ts.sys.fileExists(fileName);
  }

  readFile(fileName) {
    return ts.sys.readFile(fileName);
  }

  directoryExists(dirName) {
    return ts.sys.directoryExists(dirName);
  }

  getDirectories(dirName) {
    return ts.sys.getDirectories(dirName);
  }
}

/**
 * Overlays multiple resolvers on top of each other. Their precedence is
 * determined by the order they are given to the constructor. If calling, say,
 * `fileExists`, this will check the first `Resolver` given to it, then the
 * second, and so-on.
 *
 * When listing directories, it will combine the results of all directory
 * listings for all `Resolver` instances handed to it.
 */
class CompositeResolver {

  constructor() {
    this._resolvers = [];
    for(const arg of arguments) {
      this._resolvers.push(arg);
    }
  }

  fileExists(fileName) {
    for(const resolver of this._resolvers) {
      if(resolver.fileExists(fileName)) {
        return true;
      }
    }
    return false;
  }

  readFile(fileName) {
    for(const resolver of this._resolvers) {
      if(resolver.fileExists(fileName)) {
        return resolver.readFile(fileName);
      }
    }
  }

  directoryExists(dirName) {
    for(const resolver of this._resolvers) {
      if(resolver.directoryExists(dirName)) {
        return true;
      }
    }
    return false;
  }

  getDirectories(dirName) {
    let dirs = {};
    for(const resolver of this._resolvers) {
      if(!resolver.directoryExists(dirName)) {
        continue;
      }
      for(const dir of resolver.getDirectories(dirName)) {
        dirs[dir] = true;
      }
    }
    return Object.keys(dirs);
  }

}


/**
 * Given an array of `jsar` file names, read each and build a mapping of file
 * names to their `jsar` contents as a node `Buffer`. If there are somehow
 * duplicate entries for a file name, the last one read will bildly clobber the
 * existing value.
 */
async function libResolverFromJsars(names) {
  const bundles = names.map(async (name) => {
    return await unbundle(await readFile(name));
  });

  let fileMap = {};
  for(let bundle of await Promise.all(bundles)) {
    Object.assign(fileMap, bundle);
  }

  return new LibResolver(fileMap);
}

/**
 * Given an array of `jsar` file names, create a `Resolver` that should be able
 * to find all files `tsc` is looking for in a valid module.
 *
 * This will take all given `jsar` files, and expose them like they were all in
 * a `node_modules` directory in the current directory on top of the system's
 * actual file-structure.
 *
 * As noted in the documentation for `FSResolver`, we should not need to fall
 * back to the filesystem at all, but as it stands, this is needed to resolved
 * the type definitions for the standard library. This not only prevents
 * sandboxing, but greatly slows down the module resolution process, as queries
 * can not longer be answered entirely from in-memory structures.
 */
async function resolverFromJsars(names) {
  const cwd        = process.cwd();
  const searchPath = path.join(cwd, 'node_modules');

  const libResolver    = await libResolverFromJsars(names);
  const prefixResolver = new StripPrefixResolver(searchPath, libResolver);
  const fsResolver     = new FSResolver();

  return new CompositeResolver(prefixResolver, fsResolver);
}

module.exports = {
  __test__: {LibResolver, StripPrefixResolver},
  resolverFromJsars,
};
