import type { DocumentSummary } from "../types/ast";

interface Props {
  documents: DocumentSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function DocumentBrowser({ documents, activeId, onSelect, onCreate }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-heading">
        <div>
          <span className="eyebrow">Workspace</span>
          <h2>Documents</h2>
        </div>
        <button className="icon-button" onClick={onCreate} title="New document">+</button>
      </div>
      <div className="document-list">
        {documents.map((document) => (
          <button
            key={document._id}
            className={`document-item ${activeId === document._id ? "active" : ""}`}
            onClick={() => onSelect(document._id)}
          >
            <span className="doc-icon">▤</span>
            <span className="doc-title">{document.title}</span>
          </button>
        ))}
        {!documents.length && <div className="empty-sidebar">No documents yet.</div>}
      </div>
    </aside>
  );
}
