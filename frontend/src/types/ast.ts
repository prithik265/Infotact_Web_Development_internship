export type NodeType =
  | "document"
  | "heading"
  | "paragraph"
  | "code"
  | "quote"
  | "bulletList"
  | "orderedList"
  | "listItem"
  | "divider";

export interface ASTNode {
  id: string;
  type: NodeType;
  content: Record<string, unknown>;
  attributes: Record<string, unknown>;
  parentId: string | null;
  position: number;
  children: ASTNode[];
}

export interface DocumentSummary {
  _id: string;
  title: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Document extends DocumentSummary {
  ast: ASTNode;
}

export interface PresenceUser {
  userId: string;
  name: string;
  color: string;
}
