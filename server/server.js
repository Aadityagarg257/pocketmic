const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = {};

app.get("/session", (req, res) => {
  const id = crypto.randomBytes(4).toString("hex");
  res.json({ sessionId: id });
});

io.on("connection", (socket) => {

  socket.on("join", (sessionId) => {
    socket.join(sessionId);

    if (!rooms[sessionId]) rooms[sessionId] = [];
    rooms[sessionId].push(socket.id);

    const count = rooms[sessionId].length;

    // Tell phone (second joiner) to make the offer
    if (count === 2) {
      io.to(rooms[sessionId][1]).emit("start-offer");
      io.to(rooms[sessionId][0]).emit("peer-joined");
    }
  });

  socket.on("offer", ({ sessionId, offer }) => {
    socket.to(sessionId).emit("offer", offer);
  });

  socket.on("answer", ({ sessionId, answer }) => {
    socket.to(sessionId).emit("answer", answer);
  });

  socket.on("ice", ({ sessionId, candidate }) => {
    socket.to(sessionId).emit("ice", candidate);
  });

  socket.on("disconnect", () => {
    for (const id in rooms) {
      rooms[id] = rooms[id].filter(s => s !== socket.id);
      if (rooms[id].length === 0) delete rooms[id];
    }
  });
});

server.listen(3001, () => console.log("Signaling on :3001"));
// Keep alive ping
setInterval(() => {
  console.log("alive");
}, 25000);
