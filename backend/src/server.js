const http = require("http");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const documentRoutes = require("./routes/documentRoutes");
const { startCollabServer } = require("./sync/collabServer");

const app = express();
const PORT = Number(process.env.PORT || 5000);
const WS_PORT = Number(process.env.WS_PORT || 5001);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));
app.get("/api/health", (req, res) => res.json({ success: true, message: "SyncDoc backend is running" }));
app.use("/api/documents", documentRoutes);

async function startServer() {
  await connectDB();

  app.listen(PORT, () => console.log(`SyncDoc API running on http://localhost:${PORT}`));

  const wsServer = http.createServer();
  startCollabServer(wsServer, "/collab");
  wsServer.listen(WS_PORT, () => console.log(`SyncDoc collaboration running on ws://localhost:${WS_PORT}/collab`));
}

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});
