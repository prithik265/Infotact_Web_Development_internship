const assert = require("node:assert/strict");
const { validateDocumentAst } = require("../backend/src/utils/astValidator");

const ast = {
  id: "root",
  type: "document",
  content: {},
  attributes: {},
  parentId: null,
  position: 0,
  children: [
    {
      id: "p1",
      type: "paragraph",
      content: { text: "hello" },
      attributes: {},
      parentId: "root",
      position: 0,
      children: []
    }
  ]
};

assert.equal(validateDocumentAst(ast), true);
assert.throws(() => validateDocumentAst({ ...ast, children: [{ ...ast.children[0], parentId: "wrong" }] }));
console.log("SyncDoc AST smoke tests passed");
