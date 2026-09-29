import type { ASTNode, Document, DocumentSummary } from "../types/ast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Request failed");
  return payload.data as T;
}

export function getDocuments(): Promise<DocumentSummary[]> {
  return request<DocumentSummary[]>(`${API_URL}/documents`);
}

export function getDocument(id: string): Promise<Document> {
  return request<Document>(`${API_URL}/documents/${id}`);
}

export function createDocument(title: string, ast: ASTNode): Promise<Document> {
  return request<Document>(`${API_URL}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, ast })
  });
}

export function updateDocument(id: string, ast: ASTNode, title?: string): Promise<Document> {
  return request<Document>(`${API_URL}/documents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ast, ...(title !== undefined ? { title } : {}) })
  });
}

export function exportUrl(id: string, format: "html" | "pdf") {
  return `${API_URL}/documents/${id}/export/${format}`;
}
