const VALID_TYPES = new Set([
  "document",
  "heading",
  "paragraph",
  "code",
  "quote",
  "bulletList",
  "orderedList",
  "listItem",
  "divider"
]);

const TEXT_TYPES = new Set(["paragraph", "heading", "code"]);

const CHILD_RULES = {
  document: ["heading", "paragraph", "code", "quote", "bulletList", "orderedList", "divider"],
  quote: ["heading", "paragraph", "code", "quote", "bulletList", "orderedList", "divider"],
  bulletList: ["listItem"],
  orderedList: ["listItem"],
  listItem: ["heading", "paragraph", "code", "quote", "bulletList", "orderedList", "divider"],
  heading: [],
  paragraph: [],
  code: [],
  divider: []
};

function validateNode(node, parentNode = null) {
  if (!node || typeof node !== "object") throw new Error("AST node cannot be null");
  if (!node.id) throw new Error("Every AST node must have an id");
  if (!VALID_TYPES.has(node.type)) throw new Error(`Invalid AST node type: ${node.type}`);

  if (node.type === "document" && node.parentId !== null) {
    throw new Error("Document node must have parentId = null");
  }
  if (node.type !== "document" && !parentNode) {
    throw new Error(`Node ${node.id} must have a parent`);
  }
  if (parentNode && node.parentId !== parentNode.id) {
    throw new Error(`Invalid parentId for node ${node.id}`);
  }

  if (TEXT_TYPES.has(node.type) && typeof node.content?.text !== "string") {
    throw new Error(`${node.type} node ${node.id} must contain content.text`);
  }

  if (node.type === "heading") {
    const level = node.attributes?.level;
    if (![1, 2, 3, 4, 5, 6].includes(level)) {
      throw new Error(`Heading ${node.id} must have a level between 1 and 6`);
    }
  }

  if (node.type === "code" && node.attributes?.language !== undefined && typeof node.attributes.language !== "string") {
    throw new Error(`Code node ${node.id} must have a string language`);
  }

  const children = Array.isArray(node.children) ? node.children : [];
  const allowed = CHILD_RULES[node.type] || [];

  children.forEach((child, index) => {
    if (!allowed.includes(child.type)) throw new Error(`${child.type} cannot be a child of ${node.type}`);
    if (child.position !== index) throw new Error(`Invalid position for node ${child.id}`);
    validateNode(child, node);
  });

  return true;
}

function validateDocumentAst(ast) {
  if (ast?.type !== "document") throw new Error("AST root must be a document node");
  return validateNode(ast);
}

module.exports = { validateNode, validateDocumentAst };
