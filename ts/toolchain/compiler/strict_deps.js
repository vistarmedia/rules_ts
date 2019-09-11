const ts = require("typescript");

function strictDeps(program) {
  const imports = {};
  const noteImport = (src, impt) => {
    if (imports[src] === undefined) {
      imports[src] = [];
    } else if (imports[src].indexOf(impt) >= 0) {
      return;
    }
    imports[src].push(impt);
  };

  const plugin = context => file =>
    visitFile(file, program, context, noteImport);
  plugin.imports = () => imports;

  return plugin;
}

function visitFile(file, program, context, noteImport) {
  // This digs into the TypeScript compiler API in ways the documentation
  // clearly states it cannot. However, we'll try to find the imports the right
  // way below, and if we can't find it, we'll fall back to undocumented means.
  let fallbackImportMap = {};
  const { resolvedModules } = file;
  if (resolvedModules !== undefined) {
    for (const impt of resolvedModules.keys()) {
      const resolution = resolvedModules.get(impt);
      if (!resolution) {
        continue;
      }
      fallbackImportMap[impt] = resolution.resolvedFileName;
    }
  }

  const tc = program.getTypeChecker();

  for (const stmt of file.statements) {
    if (
      stmt.kind !== ts.SyntaxKind.ImportDeclaration &&
      stmt.kind !== ts.SyntaxKind.ExportDeclaration
    ) {
      continue;
    }

    const modSpec = stmt.moduleSpecifier;
    if (!modSpec) continue; // E.g. a bare "export {x};"

    const sym = tc.getSymbolAtLocation(modSpec);
    if (!sym || !sym.declarations || sym.declarations.length < 1) {
      // Here, the type system wasn't able to come up with a concrete type for
      // our import. We may want to continue to warn here, but for now, fall
      // back to the unsafe lookup method.
      const fallback = fallbackImportMap[modSpec.text];
      if (fallback !== undefined) {
        noteImport(file.fileName, fallback);
      }
      continue;
    }

    // Module imports can only have one declaration location
    const declFileName = sym.declarations[0].getSourceFile().fileName;
    noteImport(file.fileName, declFileName);
  }

  return file;
}

module.exports = {
  strictDeps
};
