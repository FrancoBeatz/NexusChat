import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const PORT = 3000;

  const connectedUsers = new Set<string>();

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    connectedUsers.add(socket.id);
    io.emit("user-status", { userId: socket.id, status: "online" });

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on("send-message", (data) => {
      // data: { roomId, message }
      socket.to(data.roomId).emit("receive-message", data.message);
      console.log(`Message sent to room ${data.roomId}`);
    });

    socket.on("typing", (data) => {
      // data: { roomId, userId, isTyping }
      socket.to(data.roomId).emit("user-typing", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      connectedUsers.delete(socket.id);
      io.emit("user-status", { userId: socket.id, status: "offline" });
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
