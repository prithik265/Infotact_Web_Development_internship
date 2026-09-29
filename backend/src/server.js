const http = require("http");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const documentRoutes = require("./routes/documentRoutes");
const { startCollabServer } = require("./sync/collabServer");

const app = express();

const PORT = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173"
  })
);

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "SyncDoc backend is running"
  });
});

app.use("/api/documents", documentRoutes);

async function startServer() {
  await connectDB();

  // One HTTP server for both Express and WebSocket
  const server = http.createServer(app);

  // Attach Yjs collaboration WebSocket to /collab
  startCollabServer(server, "/collab");

  server.listen(PORT, () => {
    console.log(`SyncDoc backend running on port ${PORT}`);
    console.log(`REST API: http://localhost:${PORT}/api`);
    console.log(`WebSocket: ws://localhost:${PORT}/collab`);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});