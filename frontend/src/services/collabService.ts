import * as Y from "yjs";
import type { PresenceUser } from "../types/ast";

export interface CollabConnection {
  doc: Y.Doc;
  socket: WebSocket;
  destroy: () => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5001/collab";

export function connectCollaboration(
  documentId: string,
  user: PresenceUser,
  onPresence: (users: PresenceUser[]) => void,
  onCursor: (message: { userId: string; name: string; color: string; nodeId?: string }) => void,
  onStatus: (status: "connecting" | "connected" | "offline") => void,
  onRemoteUpdate: () => void
): CollabConnection {
  const doc = new Y.Doc();
  const query = new URLSearchParams({
    documentId,
    userId: user.userId,
    name: user.name,
    color: user.color
  });
  const socket = new WebSocket(`${WS_URL}?${query.toString()}`);
  socket.binaryType = "arraybuffer";
  onStatus("connecting");

  const handleUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === "remote" || origin === "bootstrap") return;
    if (socket.readyState === WebSocket.OPEN) {
  socket.send(update.buffer as ArrayBuffer);
}
  };
  doc.on("update", handleUpdate);

  socket.onopen = () => onStatus("connected");
  socket.onclose = () => onStatus("offline");
  socket.onerror = () => onStatus("offline");
  socket.onmessage = (event) => {
    if (typeof event.data === "string") {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "presence") onPresence(message.users || []);
        if (message.type === "cursor") onCursor(message);
      } catch { /* ignore malformed messages */ }
      return;
    }
    const update = new Uint8Array(event.data as ArrayBuffer);
    Y.applyUpdate(doc, update, "remote");
    onRemoteUpdate();
  };

  return {
    doc,
    socket,
    destroy: () => {
      doc.off("update", handleUpdate);
      socket.close();
      doc.destroy();
    }
  };
}

export function sendCursor(socket: WebSocket, payload: { nodeId: string; userId: string; name: string; color: string }) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "cursor", ...payload }));
}
