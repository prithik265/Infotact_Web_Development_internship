import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { BlockRenderer } from "./components/BlockRenderer";
import { DocumentBrowser } from "./components/DocumentBrowser";
import { createDocument, exportUrl, getDocument, getDocuments } from "./services/documentService";
import { connectCollaboration, sendCursor, type CollabConnection } from "./services/collabService";
import { addChildNode, deleteNode, updateNodeText, yDocToAst } from "./utils/yjsAst";
import type { ASTNode, Document, DocumentSummary, PresenceUser } from "./types/ast";

const COLORS = ["#8b5cf6", "#0ea5e9", "#10b981", "#f97316", "#ec4899"];
const USER_ID = crypto.randomUUID();
const USER_NAME = "Prithik";
const USER_COLOR = COLORS[Math.floor(Math.random() * COLORS.length)];

const emptyAst = (): ASTNode => ({
  id: `root-${crypto.randomUUID()}`,
  type: "document",
  content: {},
  attributes: {},
  parentId: null,
  position: 0,
  children: [
    { id: `heading-${crypto.randomUUID()}`, type: "heading", content: { text: "Untitled SyncDoc" }, attributes: { level: 1 }, parentId: "TEMP", position: 0, children: [] },
    { id: `paragraph-${crypto.randomUUID()}`, type: "paragraph", content: { text: "Start collaborating here..." }, attributes: {}, parentId: "TEMP", position: 1, children: [] }
  ]
});

function normalizeRoot(ast: ASTNode) {
  ast.children.forEach((child, index) => { child.parentId = ast.id; child.position = index; });
  return ast;
}

function App() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [ast, setAst] = useState<ASTNode | null>(null);
  const [status, setStatus] = useState<"loading" | "saved" | "syncing" | "offline" | "connected">("loading");
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [remoteNodeId, setRemoteNodeId] = useState<string | undefined>();
  const [collabReady, setCollabReady] = useState(false);
  const [error, setError] = useState("");
  const collabRef = useRef<CollabConnection | null>(null);
  const saveTimer = useRef<number | undefined>();

  const currentUser = useMemo(() => ({ userId: USER_ID, name: USER_NAME, color: USER_COLOR }), []);

  async function refreshDocuments(selectFirst = false) {
    const items = await getDocuments();
    setDocuments(items);
    if (selectFirst && items[0]) setActiveId(items[0]._id);
  }

  useEffect(() => {
    refreshDocuments(true).catch((err) => setError(err.message));
    return () => collabRef.current?.destroy();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setStatus("loading");
    setCollabReady(false);
    setError("");
    collabRef.current?.destroy();
    collabRef.current = null;

    getDocument(activeId).then((loaded) => {
      if (cancelled) return;
      setDocument(loaded);
      const connection = connectCollaboration(
        activeId,
        currentUser,
        setPresence,
        (message) => setRemoteNodeId(message.nodeId),
        setStatus,
        () => {
          setCollabReady(true);
          const next = yDocToAst(connection.doc);
          if (next) setAst(next);
        }
      );
      collabRef.current = connection;
      setAst(normalizeRoot(loaded.ast));
    }).catch((err) => setError(err.message));

    return () => {
      cancelled = true;
      collabRef.current?.destroy();
      collabRef.current = null;
    };
  }, [activeId, currentUser]);

  useEffect(() => {
    if (!ast || !document) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setStatus("saved"), 450);
    return () => window.clearTimeout(saveTimer.current);
  }, [ast, document]);

  const handleTextChange = (node: ASTNode, value: string) => {
    if (!collabRef.current) return;
    updateNodeText(collabRef.current.doc, node.id, value);
    const next = yDocToAst(collabRef.current.doc);
    if (next) setAst(next);
    setStatus("syncing");
  };

  const handleFocus = (node: ASTNode) => {
    const socket = collabRef.current?.socket;
    if (socket) sendCursor(socket, { nodeId: node.id, ...currentUser });
  };

  const handleDelete = (node: ASTNode) => {
    if (!collabRef.current || !confirm(`Delete this ${node.type} block?`)) return;
    deleteNode(collabRef.current.doc, node.id);
    const next = yDocToAst(collabRef.current.doc);
    if (next) setAst(next);
  };

  const addBlock = (type: "paragraph" | "heading" | "code" | "divider") => {
    if (!collabRef.current) return;
    const rootId = collabRef.current.doc.getMap("syncdoc").get("rootId") as string;
    addChildNode(collabRef.current.doc, rootId, type, type === "heading" ? "New heading" : "");
    const next = yDocToAst(collabRef.current.doc);
    if (next) setAst(next);
  };

  async function handleCreate() {
    try {
      const ast = normalizeRoot(emptyAst());
      const created = await createDocument("New SyncDoc", ast);
      await refreshDocuments();
      setActiveId(created._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create document");
    }
  }

  function download(format: "html" | "pdf") {
    if (!activeId) return;
    window.open(exportUrl(activeId, format), "_blank");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">S</span><div><strong>SyncDoc</strong><small>AST Collaboration Engine</small></div></div>
        <div className="top-actions">
          <div className={`connection ${status === "connected" ? "online" : ""}`}><span /> {status === "connected" ? "Live" : status === "syncing" ? "Syncing" : status}</div>
          <div className="avatars">
            {presence.slice(0, 4).map((user) => <span key={user.userId} title={user.name} style={{ background: user.color }}>{user.name[0]}</span>)}
            {presence.length > 4 && <span className="more">+{presence.length - 4}</span>}
          </div>
          <div className="current-user"><span className="user-dot" style={{ background: currentUser.color }} />{currentUser.name}</div>
        </div>
      </header>

      <div className="workspace">
        <DocumentBrowser documents={documents} activeId={activeId} onSelect={setActiveId} onCreate={handleCreate} />
        <main className="main-area">
          <div className="editor-toolbar">
            <div>
              <span className="eyebrow">Collaborative workspace</span>
              <h1>{document?.title || "Select a document"}</h1>
            </div>
            <div className="toolbar-actions">
              <button onClick={() => addBlock("paragraph")}>+ Text</button>
              <button onClick={() => addBlock("heading")}>+ Heading</button>
              <button onClick={() => addBlock("code")}>+ Code</button>
              <button onClick={() => addBlock("divider")}>+ Divider</button>
              <div className="export-menu"><button className="primary">Export ▾</button><div className="export-pop"><button onClick={() => download("html")}>HTML</button><button onClick={() => download("pdf")}>PDF</button></div></div>
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="editor-page">
            {!ast ? <div className="loading-card">Loading document…</div> : <div className="document-canvas">
              <div className="document-meta"><span>v{document?.version || 1}</span><span>•</span><span>{presence.length || 1} collaborator{presence.length === 1 ? "" : "s"} online</span></div>
              <div className="blocks">
                {ast.children.map((node) => <BlockRenderer key={node.id} node={node} activeNodeId={null} remoteNodeId={remoteNodeId} onTextChange={handleTextChange} onFocus={handleFocus} onDelete={handleDelete} editable={collabReady} />)}
                <button className="add-block" onClick={() => addBlock("paragraph")}>+ Add a block</button>
              </div>
            </div>}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
