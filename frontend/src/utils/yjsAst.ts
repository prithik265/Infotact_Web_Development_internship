import * as Y from "yjs";
import type { ASTNode, NodeType } from "../types/ast";

export function nodeToY(node: ASTNode): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  map.set("id", node.id);
  map.set("type", node.type);
  map.set("parentId", node.parentId);
  map.set("position", node.position);
  map.set("attributes", JSON.stringify(node.attributes || {}));

  const text = new Y.Text(typeof node.content?.text === "string" ? node.content.text : "");
  map.set("text", text);

  const children = new Y.Array<string>();
  if (node.children.length) children.push(node.children.map((child) => child.id));
  map.set("children", children);

  return map;
}

function resetRoot(root: Y.Map<unknown>) {
  root.forEach((_value, key) => root.delete(key));
}

export function loadAstIntoYDoc(doc: Y.Doc, ast: ASTNode) {
  doc.transact(() => {
    const root = doc.getMap<unknown>("syncdoc");
    resetRoot(root);

    const nodes = new Y.Map<Y.Map<unknown>>();
    root.set("nodes", nodes);
    root.set("rootId", ast.id);

    const visit = (node: ASTNode) => {
      nodes.set(node.id, nodeToY(node));
      node.children.forEach(visit);
    };

    visit(ast);
  }, "bootstrap");
}

export function yDocToAst(doc: Y.Doc): ASTNode | null {
  const root = doc.getMap<unknown>("syncdoc");
  const nodes = root.get("nodes") as Y.Map<Y.Map<unknown>> | undefined;
  const rootId = root.get("rootId") as string | undefined;

  if (!nodes || !rootId) return null;

  const visit = (id: string): ASTNode | null => {
    const yNode = nodes.get(id);
    if (!yNode) return null;

    const text = yNode.get("text") as Y.Text | undefined;
    const children = yNode.get("children") as Y.Array<string> | undefined;
    const attributesRaw = (yNode.get("attributes") as string) || "{}";

    let attributes: Record<string, unknown> = {};
    try {
      attributes = JSON.parse(attributesRaw);
    } catch {
      attributes = {};
    }

    const childIds = children?.toArray() || [];

    return {
      id: String(yNode.get("id")),
      type: String(yNode.get("type")) as NodeType,
      content: text?.length ? { text: text.toString() } : {},
      attributes,
      parentId: (yNode.get("parentId") as string | null) ?? null,
      // The Y.Array order is the authoritative structural order.
      position: Number(yNode.get("position") || 0),
      children: childIds
        .map((childId, index) => {
          const child = visit(childId);
          if (child) child.position = index;
          return child;
        })
        .filter((child): child is ASTNode => Boolean(child))
    };
  };

  return visit(rootId);
}

export function getNodeMap(doc: Y.Doc, id: string) {
  const root = doc.getMap<unknown>("syncdoc");
  const nodes = root.get("nodes") as Y.Map<Y.Map<unknown>> | undefined;
  return nodes?.get(id) || null;
}

export function getNodesMap(doc: Y.Doc) {
  const root = doc.getMap<unknown>("syncdoc");
  return root.get("nodes") as Y.Map<Y.Map<unknown>>;
}

/**
 * Apply the smallest possible Y.Text change instead of deleting and
 * reinserting the entire string. This is important for CRDT behaviour:
 * concurrent insertions/deletions can now be merged instead of becoming
 * competing whole-field replacements.
 */
export function updateNodeText(doc: Y.Doc, id: string, value: string) {
  const node = getNodeMap(doc, id);
  if (!node) return;

  const text = node.get("text") as Y.Text | undefined;
  if (!text) return;

  const current = text.toString();
  if (current === value) return;

  let start = 0;
  const maxPrefix = Math.min(current.length, value.length);

  while (start < maxPrefix && current[start] === value[start]) {
    start += 1;
  }

  let currentEnd = current.length;
  let valueEnd = value.length;

  while (
    currentEnd > start &&
    valueEnd > start &&
    current[currentEnd - 1] === value[valueEnd - 1]
  ) {
    currentEnd -= 1;
    valueEnd -= 1;
  }

  doc.transact(() => {
    if (currentEnd > start) {
      text.delete(start, currentEnd - start);
    }

    if (valueEnd > start) {
      text.insert(start, value.slice(start, valueEnd));
    }
  }, "local-edit");
}

export function addChildNode(
  doc: Y.Doc,
  parentId: string,
  type: NodeType,
  text = ""
) {
  const nodes = getNodesMap(doc);
  const parent = nodes.get(parentId);
  if (!parent) return null;

  const children = parent.get("children") as Y.Array<string>;
  const id = `${type}-${crypto.randomUUID()}`;

  const node = nodeToY({
    id,
    type,
    content: ["paragraph", "heading", "code"].includes(type) ? { text } : {},
    attributes:
      type === "heading"
        ? { level: 2 }
        : type === "code"
          ? { language: "javascript" }
          : {},
    parentId,
    position: children.length,
    children: []
  });

  doc.transact(() => {
    nodes.set(id, node);
    children.push([id]);
  }, "structure-edit");

  return id;
}

function collectIds(
  nodes: Y.Map<Y.Map<unknown>>,
  id: string,
  output: string[]
) {
  const node = nodes.get(id);
  if (!node) return;

  output.push(id);

  const children = node.get("children") as Y.Array<string> | undefined;
  children?.toArray().forEach((childId) => collectIds(nodes, childId, output));
}

export function deleteNode(doc: Y.Doc, id: string) {
  const nodes = getNodesMap(doc);
  const node = nodes.get(id);
  if (!node || node.get("type") === "document") return;

  const parentId = node.get("parentId") as string | null;
  const parent = parentId ? nodes.get(parentId) : null;

  const ids: string[] = [];
  collectIds(nodes, id, ids);

  doc.transact(() => {
    if (parent) {
      const children = parent.get("children") as Y.Array<string>;
      const index = children.toArray().indexOf(id);

      if (index >= 0) children.delete(index, 1);

      children.toArray().forEach((childId, index) => {
        nodes.get(childId)?.set("position", index);
      });
    }

    ids.forEach((nodeId) => nodes.delete(nodeId));
  }, "structure-edit");
}
