import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

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
    socket.to(data.roomId).emit("receive-message", data.message);
    console.log(`Message sent to room ${data.roomId}`);
  });

  socket.on("typing", (data) => {
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

// Export the app for Vercel
export default app;
