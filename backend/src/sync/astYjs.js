const Y = require("yjs");

function nodeToY(node) {
  const map = new Y.Map();
  map.set("id", node.id);
  map.set("type", node.type);
  map.set("parentId", node.parentId ?? null);
  map.set("position", node.position ?? 0);
  map.set("attributes", JSON.stringify(node.attributes || {}));
  const text = new Y.Text(node.content?.text || "");
  map.set("text", text);
  return map;
}

function clearMap(map) {
  Array.from(map.keys()).forEach((key) => map.delete(key));
}

function loadAstIntoYDoc(doc, ast) {
  const root = doc.getMap("syncdoc");
  doc.transact(() => {
    clearMap(root);
    const nodes = new Y.Map();
    root.set("nodes", nodes);
    root.set("rootId", ast.id);

    const visit = (node) => {
      const yNode = nodeToY(node);
      const children = new Y.Array();
      node.children.forEach((child) => {
        children.push([child.id]);
        visit(child);
      });
      yNode.set("children", children);
      nodes.set(node.id, yNode);
    };
    visit(ast);
  }, "bootstrap");
}

function yNodeToAst(yNode, nodes) {
  const attributes = JSON.parse(yNode.get("attributes") || "{}");
  const text = yNode.get("text");
  const childIds = yNode.get("children")?.toArray() || [];
  return {
    id: yNode.get("id"),
    type: yNode.get("type"),
    content: text?.length ? { text: text.toString() } : {},
    attributes,
    parentId: yNode.get("parentId"),
    position: yNode.get("position") || 0,
    children: childIds.map((id) => yNodeToAst(nodes.get(id), nodes)).filter(Boolean)
  };
}

function yDocToAst(doc) {
  const root = doc.getMap("syncdoc");
  const nodes = root.get("nodes");
  const rootId = root.get("rootId");
  if (!nodes || !rootId || !nodes.get(rootId)) return null;
  return yNodeToAst(nodes.get(rootId), nodes);
}

module.exports = { loadAstIntoYDoc, yDocToAst };
