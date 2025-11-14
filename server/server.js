// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // tighten for production
});

// In-memory room store: { [roomId]: { pages: [dataURL|null], histories: [...], redoStacks: [...] , currentPage: 0 } }
const rooms = {};

function ensureRoom(room) {
  if (!rooms[room]) {
    rooms[room] = {
      pages: [null],
      histories: [[]],
      redoStacks: [[]],
      currentPage: 0
    };
  }
  return rooms[room];
}

io.on("connection", (socket) => {
  console.log("client connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} joined ${roomId}`);
    const room = ensureRoom(roomId);

    // send current page snapshot and metadata to joiner
    socket.emit("room-state", {
      pages: room.pages,
      currentPage: room.currentPage,
      // We do not send full histories for privacy, but could if needed
      pageSnapshot: room.pages[room.currentPage] // may be null
    });
  });

  // Broadcast drawing strokes to others in same room
  socket.on("drawing", ({ roomId, payload }) => {
    // payload: { x, y, color, size, tool, page }
    socket.to(roomId).emit("remote-drawing", payload);
  });

  // When a client saves a page snapshot (e.g. after finishing stroke or on demand)
  socket.on("save-page", ({ roomId, pageIndex, dataURL }) => {
    const room = ensureRoom(roomId);
    room.pages[pageIndex] = dataURL;
    // broadcast the updated snapshot so late joiners or others can sync
    socket.to(roomId).emit("page-saved", { pageIndex, dataURL });
  });

  // Clear action
  socket.on("clear-page", ({ roomId, pageIndex }) => {
    const room = ensureRoom(roomId);
    room.pages[pageIndex] = null;
    room.histories[pageIndex] = room.histories[pageIndex] || [];
    room.histories[pageIndex].push(null); // mark cleared state
    socket.to(roomId).emit("page-cleared", { pageIndex });
  });

  // Undo / redo events (we'll accept client-provided snapshot after operation)
  socket.on("undo", ({ roomId, pageIndex, snapshot }) => {
    const room = ensureRoom(roomId);
    room.pages[pageIndex] = snapshot;
    socket.to(roomId).emit("remote-undo", { pageIndex, snapshot });
  });

  socket.on("redo", ({ roomId, pageIndex, snapshot }) => {
    const room = ensureRoom(roomId);
    room.pages[pageIndex] = snapshot;
    socket.to(roomId).emit("remote-redo", { pageIndex, snapshot });
  });

  // Page navigation
  socket.on("change-page", ({ roomId, newPageIndex, pageSnapshot }) => {
    const room = ensureRoom(roomId);
    // ensure arrays exist
    room.pages[newPageIndex] = room.pages[newPageIndex] || pageSnapshot || null;
    room.histories[newPageIndex] = room.histories[newPageIndex] || [];
    room.redoStacks[newPageIndex] = room.redoStacks[newPageIndex] || [];
    room.currentPage = newPageIndex;

    // tell everyone (including sender) to load the page
    io.in(roomId).emit("page-changed", {
      newPageIndex,
      pageSnapshot: room.pages[newPageIndex] || null
    });
  });

  socket.on("disconnect", () => {
    console.log("client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Socket server listening on ${PORT}`));
