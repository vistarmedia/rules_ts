const ts = require('typescript');

function strictDeps(program) {
  const imports    = {};
  const noteImport = (src, impt) => {
    if(imports[src] === undefined) {
      imports[src] = [];
    } else if(imports[src].indexOf(impt) >= 0) {
      return;
    }
    imports[src].push(impt);
  }

  const plugin = (context) => (file) => visitFile(file, program, context, noteImport);
  plugin.imports = () => imports;

  return plugin;
}

function visitFile(file, program, context, noteImport) {
  const tc = program.getTypeChecker();

  for(const stmt of file.statements) {
    if(stmt.kind !== ts.SyntaxKind.ImportDeclaration &&
       stmt.kind !== ts.SyntaxKind.ExportDeclaration) {
      continue;
    }

    const modSpec = stmt.moduleSpecifier;
    if(!modSpec) continue; // E.g. a bare "export {x};"

    const sym = tc.getSymbolAtLocation(modSpec);
    if(!sym || !sym.declarations || sym.declarations.length < 1) {
      continue;
    }

    // Module imports can only have one declaration location
    const declFileName = sym.declarations[0].getSourceFile().fileName;
    noteImport(file.fileName, declFileName);
  }

  return file;
}

module.exports = {
  strictDeps,
};
