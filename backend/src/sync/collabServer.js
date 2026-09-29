const { WebSocketServer } = require("ws");
const Y = require("yjs");
const Document = require("../models/Document");
const { loadAstIntoYDoc, yDocToAst } = require("./astYjs");

const rooms = new Map();

function broadcast(room, data, except) {
  for (const client of room.clients) {
    if (client !== except && client.readyState === 1) client.send(data);
  }
}

async function getRoom(documentId) {
  if (rooms.has(documentId)) return rooms.get(documentId);
  const document = await Document.findById(documentId);
  if (!document) throw new Error("Document not found");

  const ydoc = new Y.Doc();
  loadAstIntoYDoc(ydoc, document.ast);
  const room = { ydoc, clients: new Set(), presence: new Map(), persistTimer: null };
  rooms.set(documentId, room);

  ydoc.on("update", (update, origin) => {
    if (origin === "bootstrap") return;
    broadcast(room, update, origin);
    clearTimeout(room.persistTimer);
    room.persistTimer = setTimeout(async () => {
      try {
        const ast = yDocToAst(ydoc);
        if (ast) await Document.findByIdAndUpdate(documentId, { $set: { ast }, $inc: { version: 1 } });
      } catch (error) {
        console.error("Collaboration persistence failed:", error.message);
      }
    }, 700);
  });

  return room;
}

function startCollabServer(server, path = "/collab") {
  const wss = new WebSocketServer({ server, path });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url, "http://localhost");
    const documentId = url.searchParams.get("documentId");
    const userId = url.searchParams.get("userId") || Math.random().toString(36).slice(2);
    const name = url.searchParams.get("name") || "Anonymous";
    const color = url.searchParams.get("color") || "#8b5cf6";

    if (!documentId) {
      ws.close(1008, "documentId is required");
      return;
    }

    try {
      const room = await getRoom(documentId);
      room.clients.add(ws);
      room.presence.set(ws, { userId, name, color });

      ws.send(Y.encodeStateAsUpdate(room.ydoc));
      ws.send(JSON.stringify({ type: "presence", users: Array.from(room.presence.values()) }));
      broadcast(room, JSON.stringify({ type: "presence", users: Array.from(room.presence.values()) }));

      ws.on("message", (data, isBinary) => {
        if (!isBinary) {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === "cursor") {
              broadcast(room, JSON.stringify({ ...message, userId, name, color }), ws);
            }
          } catch (_) {
            // Ignore malformed text messages.
          }
          return;
        }

        try {
          Y.applyUpdate(room.ydoc, new Uint8Array(data), ws);
        } catch (error) {
          console.error("Yjs update failed:", error.message);
        }
      });

      const cleanup = () => {
        room.clients.delete(ws);
        room.presence.delete(ws);
        broadcast(room, JSON.stringify({ type: "presence", users: Array.from(room.presence.values()) }));
        if (room.clients.size === 0) {
          setTimeout(() => {
            const current = rooms.get(documentId);
            if (current && current.clients.size === 0) {
              rooms.delete(documentId);
              current.ydoc.destroy();
            }
          }, 60_000);
        }
      };
      ws.on("close", cleanup);
      ws.on("error", cleanup);
    } catch (error) {
      ws.close(1011, error.message);
    }
  });

  console.log(`SyncDoc collaboration WebSocket listening on ${path}`);
  return wss;
}

module.exports = { startCollabServer };
