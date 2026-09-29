import * as Y from "yjs";
import type { ASTNode, NodeType } from "../types/ast";

export function nodeToY(
  node: ASTNode
): Y.Map<unknown> {
  const map = new Y.Map<unknown>();

  map.set("id", node.id);
  map.set("type", node.type);
  map.set("parentId", node.parentId);
  map.set("position", node.position);

  map.set(
    "attributes",
    JSON.stringify(node.attributes || {})
  );

  /*
   * Every text-bearing AST node gets its own Y.Text.
   *
   * This is the CRDT-managed text state for that block.
   */
  const text = new Y.Text(
    typeof node.content?.text === "string"
      ? node.content.text
      : ""
  );

  map.set("text", text);

  /*
   * Children are represented as a Y.Array so structural
   * changes can also be synchronized.
   */
  const children = new Y.Array<string>();

  if (node.children.length) {
    children.push(
      node.children.map(
        (child) => child.id
      )
    );
  }

  map.set("children", children);

  return map;
}

function resetRoot(
  root: Y.Map<unknown>
) {
  root.forEach((_value, key) => {
    root.delete(key);
  });
}

/**
 * Load the AST into a Y.Doc.
 *
 * This is used for the initial bootstrap of a document.
 */
export function loadAstIntoYDoc(
  doc: Y.Doc,
  ast: ASTNode
) {
  doc.transact(() => {
    const root =
      doc.getMap<unknown>("syncdoc");

    resetRoot(root);

    const nodes =
      new Y.Map<Y.Map<unknown>>();

    root.set("nodes", nodes);
    root.set("rootId", ast.id);

    const visit = (node: ASTNode) => {
      nodes.set(
        node.id,
        nodeToY(node)
      );

      node.children.forEach(visit);
    };

    visit(ast);
  }, "bootstrap");
}

/**
 * Convert the current shared Y.Doc state back
 * into the application's AST representation.
 */
export function yDocToAst(
  doc: Y.Doc
): ASTNode | null {
  const root =
    doc.getMap<unknown>("syncdoc");

  const nodes =
    root.get("nodes") as
      | Y.Map<Y.Map<unknown>>
      | undefined;

  const rootId =
    root.get("rootId") as
      | string
      | undefined;

  if (!nodes || !rootId) {
    return null;
  }

  const visit = (
    id: string
  ): ASTNode | null => {
    const yNode = nodes.get(id);

    if (!yNode) {
      return null;
    }

    const text =
      yNode.get("text") as
        | Y.Text
        | undefined;

    const children =
      yNode.get("children") as
        | Y.Array<string>
        | undefined;

    const attributesRaw =
      (yNode.get("attributes") as string) ||
      "{}";

    let attributes:
      Record<string, unknown> = {};

    try {
      attributes =
        JSON.parse(attributesRaw);
    } catch {
      attributes = {};
    }

    const childIds =
      children?.toArray() || [];

    return {
      id: String(
        yNode.get("id")
      ),

      type: String(
        yNode.get("type")
      ) as NodeType,

      content:
        text && text.length
          ? {
              text: text.toString()
            }
          : {},

      attributes,

      parentId:
        (yNode.get(
          "parentId"
        ) as string | null) ?? null,

      position: Number(
        yNode.get("position") || 0
      ),

      children: childIds
        .map(
          (
            childId,
            index
          ) => {
            const child =
              visit(childId);

            if (child) {
              child.position =
                index;
            }

            return child;
          }
        )
        .filter(
          (
            child
          ): child is ASTNode =>
            Boolean(child)
        )
    };
  };

  return visit(rootId);
}

/**
 * Get a specific Y.Map representing an AST node.
 */
export function getNodeMap(
  doc: Y.Doc,
  id: string
) {
  const root =
    doc.getMap<unknown>("syncdoc");

  const nodes =
    root.get("nodes") as
      | Y.Map<Y.Map<unknown>>
      | undefined;

  return nodes?.get(id) || null;
}

/**
 * Get the complete Y.Map containing all AST nodes.
 */
export function getNodesMap(
  doc: Y.Doc
) {
  const root =
    doc.getMap<unknown>("syncdoc");

  return root.get(
    "nodes"
  ) as Y.Map<Y.Map<unknown>>;
}

/**
 * Apply the local text operation to the Y.Text.
 *
 * IMPORTANT:
 *
 * We receive both the value that THIS USER was editing
 * and the new value produced by THIS USER's input event.
 *
 * This prevents a remote user's concurrent edit from being
 * interpreted as if it were part of this user's local change.
 *
 * Example:
 *
 * Shared:
 *   Hello
 *
 * User A:
 *   Hello -> Hello A
 *
 * User B:
 *   Hello -> Hello B
 *
 * Instead of replacing the entire shared string,
 * each user generates an insertion operation.
 */
export function updateNodeText(
  doc: Y.Doc,
  id: string,
  previousValue: string,
  nextValue: string
) {
  const node =
    getNodeMap(doc, id);

  if (!node) {
    return;
  }

  const text =
    node.get("text") as
      | Y.Text
      | undefined;

  if (!text) {
    return;
  }

  if (
    previousValue === nextValue
  ) {
    return;
  }

  /*
   * Find the common prefix.
   *
   * Example:
   *
   * previous: Hello
   * next:     Hello A
   *
   * start = 5
   */
  let start = 0;

  const maxPrefix =
    Math.min(
      previousValue.length,
      nextValue.length
    );

  while (
    start < maxPrefix &&
    previousValue[start] ===
      nextValue[start]
  ) {
    start++;
  }

  /*
   * Find the common suffix.
   */
  let previousEnd =
    previousValue.length;

  let nextEnd =
    nextValue.length;

  while (
    previousEnd > start &&
    nextEnd > start &&
    previousValue[
      previousEnd - 1
    ] ===
      nextValue[
        nextEnd - 1
      ]
  ) {
    previousEnd--;
    nextEnd--;
  }

  /*
   * What was deleted from the user's local version?
   */
  const deleteCount =
    previousEnd - start;

  /*
   * What was inserted by the user's local edit?
   */
  const insertedText =
    nextValue.slice(
      start,
      nextEnd
    );

  /*
   * Apply the operation to the shared Y.Text.
   *
   * Y.Text handles the actual CRDT synchronization.
   */
  doc.transact(() => {
    if (deleteCount > 0) {
      text.delete(
        start,
        deleteCount
      );
    }

    if (insertedText.length > 0) {
      text.insert(
        start,
        insertedText
      );
    }
  }, "local-edit");
}

/**
 * Add a new child AST node.
 */
export function addChildNode(
  doc: Y.Doc,
  parentId: string,
  type: NodeType,
  text = ""
) {
  const nodes =
    getNodesMap(doc);

  const parent =
    nodes.get(parentId);

  if (!parent) {
    return null;
  }

  const children =
    parent.get(
      "children"
    ) as Y.Array<string>;

  const id =
    `${type}-${crypto.randomUUID()}`;

  const node =
    nodeToY({
      id,
      type,

      content:
        [
          "paragraph",
          "heading",
          "code"
        ].includes(type)
          ? { text }
          : {},

      attributes:
        type === "heading"
          ? { level: 2 }
          : type === "code"
            ? {
                language:
                  "javascript"
              }
            : {},

      parentId,
      position:
        children.length,

      children: []
    });

  doc.transact(() => {
    nodes.set(
      id,
      node
    );

    children.push([id]);
  }, "structure-edit");

  return id;
}

/**
 * Recursively collect a node and all descendants.
 */
function collectIds(
  nodes: Y.Map<
    Y.Map<unknown>
  >,
  id: string,
  output: string[]
) {
  const node =
    nodes.get(id);

  if (!node) {
    return;
  }

  output.push(id);

  const children =
    node.get(
      "children"
    ) as
      | Y.Array<string>
      | undefined;

  children
    ?.toArray()
    .forEach(
      (childId) =>
        collectIds(
          nodes,
          childId,
          output
        )
    );
}

/**
 * Delete a node and its descendants.
 */
export function deleteNode(
  doc: Y.Doc,
  id: string
) {
  const nodes =
    getNodesMap(doc);

  const node =
    nodes.get(id);

  if (
    !node ||
    node.get("type") ===
      "document"
  ) {
    return;
  }

  const parentId =
    node.get(
      "parentId"
    ) as string | null;

  const parent =
    parentId
      ? nodes.get(parentId)
      : null;

  const ids: string[] = [];

  collectIds(
    nodes,
    id,
    ids
  );

  doc.transact(() => {
    if (parent) {
      const children =
        parent.get(
          "children"
        ) as Y.Array<string>;

      const index =
        children
          .toArray()
          .indexOf(id);

      if (index >= 0) {
        children.delete(
          index,
          1
        );
      }

      children
        .toArray()
        .forEach(
          (
            childId,
            index
          ) => {
            nodes
              .get(childId)
              ?.set(
                "position",
                index
              );
          }
        );
    }

    ids.forEach(
      (nodeId) =>
        nodes.delete(
          nodeId
        )
    );
  }, "structure-edit");
}