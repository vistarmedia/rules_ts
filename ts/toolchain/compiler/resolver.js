// Resolvers are tsc's interface to the filesystem. The strategy below is to
// create an in-memory filesystem from the source files and its dependencies
// being compiled. Source files will be laid out on the root, while dependencies
// will live in `node_modules`.
//
//    /my/source/File1.ts
//    /my/source/File2.ts
//    /node_modules/lodash/package.json
//    /node_modules/lodash/index.js
const path = require("path");
const util = require("util");
const fs = require("fs");

const AdmZip = require("adm-zip");
const ts = require("typescript");
const { unbundle } = require("com_vistarmedia_rules_js/js/tools/jsar/jsar");

const { LRU } = require("./lru");

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
    this._dirs = {};
  }

  /**
   * Accumulates all directories leading to this file without storing the file
   * itself.
   */
  visitFile(fileName) {
    this.visitDirectory(path.dirname(fileName));
  }

  visitDirectory(dirName) {
    if (dirName === "/") {
      return;
    }

    if (!(dirName in this._dirs)) {
      this._dirs[dirName] = [];
    }

    const baseName = path.basename(dirName);
    const parentDir = path.dirname(dirName);

    if (parentDir in this._dirs) {
      const existing = this._dirs[parentDir];
      if (this._dirs[parentDir].indexOf(baseName) < 0) {
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
    for (const file in files) {
      this._directories.visitFile(file);
    }
  }

  fileExists(fileName) {
    if (fileName[0] !== "/") {
      throw Error("non-absolute file name", fileName);
    }
    return fileName in this._files;
  }

  readFile(fileName) {
    if (fileName[0] !== "/") {
      throw Error("non-absolute file name", fileName);
    }
    const buf = this._files[fileName];
    if (buf) {
      return buf.toString("utf8");
    }
  }

  directoryExists(dirName) {
    if (dirName[0] !== "/") {
      throw Error("non-absolute directory name " + dirName);
    }
    if (dirName !== "/" && dirName[dirName.length - 1] === "/") {
      console.error("trailing slash of directory name:" + dirName);
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
    if (name !== undefined) {
      return this._resolver.fileExists(name);
    }
    return false;
  }

  readFile(fileName) {
    const name = this._path(fileName);
    if (name !== undefined) {
      return this._resolver.readFile(name);
    }
  }

  directoryExists(dirName) {
    if (this._directories.exists(dirName)) {
      return true;
    }

    let name = this._path(dirName);
    if (name !== undefined) {
      return this._resolver.directoryExists(name);
    }
    return false;
  }

  getDirectories(dirName) {
    if (dirName === this._prefix) {
      return this._resolver.getDirectories("/");
    }

    const prefixDirs = this._directories.get(dirName);
    if (prefixDirs !== undefined) {
      return prefixDirs;
    }

    let name = this._path(dirName);
    if (name !== undefined) {
      return this._resolver.getDirectories(name);
    }
  }

  _path(fileName) {
    if (!fileName.startsWith(this._prefix)) {
      return;
    }
    return fileName.slice(this._prefix.length);
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
    for (const arg of arguments) {
      this._resolvers.push(arg);
    }
  }

  fileExists(fileName) {
    for (const resolver of this._resolvers) {
      if (resolver.fileExists(fileName)) {
        return true;
      }
    }
    return false;
  }

  readFile(fileName) {
    for (const resolver of this._resolvers) {
      if (resolver.fileExists(fileName)) {
        return resolver.readFile(fileName);
      }
    }
  }

  directoryExists(dirName) {
    for (const resolver of this._resolvers) {
      if (resolver.directoryExists(dirName)) {
        return true;
      }
    }
    return false;
  }

  getDirectories(dirName) {
    let dirs = {};
    for (const resolver of this._resolvers) {
      if (!resolver.directoryExists(dirName)) {
        continue;
      }
      for (const dir of resolver.getDirectories(dirName)) {
        dirs[dir] = true;
      }
    }
    return Object.keys(dirs);
  }
}

/**
 * Given an array of `jsar` file names, read each and build a mapping of file
 * names to their `jsar` contents as a node `Buffer`.  If the checksum of any
 * `jsar` has been seen recently, it will use the value found in the cache.
 */
const libCache = new LRU(500);
async function libResolverFromJsars(names, checksums) {
  const jsarByFile = {};
  const bundles = names.map(async name => {
    let bundle;
    const checksum = checksums[name];
    if (checksum !== undefined && libCache.hasKey(checksum)) {
      bundle = libCache.get(checksum);
    } else {
      bundle = await unbundle(await readFile(name));
      if (checksum !== undefined) {
        libCache.set(checksum, bundle);
      }
    }

    for (const file of Object.keys(bundle)) {
      jsarByFile[file] = name;
    }

    return bundle;
  });

  let fileMap = {};
  for (let bundle of await Promise.all(bundles)) {
    Object.assign(fileMap, bundle);
  }
  const resolver = new LibResolver(fileMap);

  return { resolver, jsarByFile };
}

async function libResolverFromFiles(names, root) {
  let fileMap = {};
  let files = [];
  await Promise.all(
    names.map(async name => {
      const fname = name.startsWith(root) ? name.slice(root.length) : name;

      files.push(fname);
      fileMap[`/${fname}`] = await readFile(name);
    })
  );
  return [new LibResolver(fileMap), files];
}

function libResolverFromSrcJars(srcJars) {
  let fileMap = {};
  let files = [];

  for (srcJar of srcJars) {
    const zip = new AdmZip(srcJar);
    for ({ entryName, getData } of zip.getEntries()) {
      const name = `/${entryName}`;

      if (name.endsWith(".ts")) {
        fileMap[name] = getData().toString("utf-8");
        files.push(entryName);
      }
    }
  }

  const resolver = new LibResolver(fileMap);
  return [new LibResolver(fileMap), files];
}

/**
 * Given an array of `jsar` file names, create a `Resolver` that should be able
 * to find all files `tsc` is looking for in a valid module.
 *
 * This will take all given `jsar` files, and expose them like they were all in
 * a `node_modules` directory in the current directory on top of the system's
 * actual file-structure.
 */
async function newResolver(jsars, files, checksums, root) {
  ts.performance.mark("newResolverStart");

  const [srcs, srcJars] = files.reduce(
    ([srcs, jars], file) => {
      if (file.endsWith(".srcjar")) {
        return [srcs, jars.concat([file])];
      } else {
        return [srcs.concat([file]), jars];
      }
      return [srcs, jars];
    },
    [[], []]
  );

  const [srcJarResolver, srcJarFiles] = libResolverFromSrcJars(srcJars);
  const [srcFileResolver, srcFiles] = await libResolverFromFiles(srcs, root);

  const srcResolver = new CompositeResolver(srcFileResolver, srcJarResolver);

  const { resolver, jsarByFile } = await libResolverFromJsars(jsars, checksums);
  const libResolver = new StripPrefixResolver("/node_modules", resolver);

  const workspace = new CompositeResolver(libResolver, srcResolver);
  workspace.jsarByFile = jsarByFile;

  ts.performance.mark("newResolverEnd");
  ts.performance.measure("NewResolver", "newResolverStart", "newResolverEnd");
  return [workspace, srcFiles.concat(srcJarFiles)];
}

module.exports = {
  __test__: { LibResolver, StripPrefixResolver },
  newResolver
};
