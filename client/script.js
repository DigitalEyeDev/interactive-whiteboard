window.onload = () => {
  // ---------- DOM ----------
  const canvas = document.getElementById("whiteboard");
  const ctx = canvas.getContext("2d");

  const penToolBtn = document.getElementById("penTool");
  const eraserToolBtn = document.getElementById("eraserTool");
  const colorPicker = document.getElementById("colorPicker");
  const penSizeInput = document.getElementById("penSize");
  const eraserSizeInput = document.getElementById("eraserSize");
  const penSizeLabel = document.getElementById("penSizeLabel");
  const eraserSizeLabel = document.getElementById("eraserSizeLabel");

  const undoBtn = document.getElementById("undoBtn");
  const redoBtn = document.getElementById("redoBtn");
  const clearBtn = document.getElementById("clearBtn");
  const saveBtn = document.getElementById("saveBtn");

  const nextPageBtn = document.getElementById("nextPageBtn");
  const prevPageBtn = document.getElementById("prevPageBtn");
  const pageIndicator = document.getElementById("pageIndicator");

  const themeToggle = document.getElementById("themeToggle");

  // ---------- Socket.IO setup ----------
  // Get room from URL ?room=ROOMID, default 'main'
  const urlParams = new URLSearchParams(window.location.search);
  const ROOM_ID = urlParams.get("room") || "main";
  // Change this to your server URL when deployed
  const SERVER_URL = window.__WB_SOCKET_SERVER_URL || (location.origin.replace(/^http/, "ws").replace(/:[0-9]+$/, "") + ":3000");
  // Use socket.io (assumes <script src="https://cdn.socket.io/..."></script> included)
  const socket = io(SERVER_URL, { transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    console.log("socket connected", socket.id);
    socket.emit("join-room", ROOM_ID);
  });

  socket.on("room-state", (state) => {
    console.log("joined room, received state", state);
    if (state.pageSnapshot) {
      // draw current snapshot onto canvas
      const img = new Image();
      img.src = state.pageSnapshot;
      img.onload = () => {
        resizeCanvas(); // ensure size correct
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
    }
  });

  // Receive drawing events from others
  socket.on("remote-drawing", (payload) => {
    // payload: { x, y, color, size, tool, page }
    // Only render if same page
    if (payload.page !== currentPage) return;
    // draw a single point/stroke from remote (non-smooth)
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = payload.size;
    ctx.strokeStyle = payload.tool === "pen" ? payload.color : getComputedStyle(canvas).backgroundColor;
    ctx.beginPath();
    ctx.moveTo(payload.x, payload.y);
    ctx.lineTo(payload.x + 0.1, payload.y + 0.1); // tiny stroke to render a dot
    ctx.stroke();
    ctx.restore();
  });

  socket.on("page-saved", ({ pageIndex, dataURL }) => {
    // Optionally we could keep a local cache, but server state is authoritative
    if (pageIndex === currentPage && dataURL) {
      const img = new Image();
      img.src = dataURL;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
    }
  });

  socket.on("page-cleared", ({ pageIndex }) => {
    if (pageIndex === currentPage) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });

  socket.on("remote-undo", ({ pageIndex, snapshot }) => {
    if (pageIndex === currentPage) restoreState(snapshot);
  });

  socket.on("remote-redo", ({ pageIndex, snapshot }) => {
    if (pageIndex === currentPage) restoreState(snapshot);
  });

  socket.on("page-changed", ({ newPageIndex, pageSnapshot }) => {
    currentPage = newPageIndex;
    pageIndicator.textContent = `Page ${currentPage + 1}`;
    if (pageSnapshot) {
      const img = new Image();
      img.src = pageSnapshot;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });

  // ---------- Canvas sizing ----------
  function resizeCanvas() {
    const data = canvas.toDataURL();
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const img = new Image();
    img.src = data;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // ---------- State ----------
  let drawing = false;
  let tool = "pen"; // "pen" or "eraser"
  let color = colorPicker ? colorPicker.value : "#000000";
  let penSize = penSizeInput ? +penSizeInput.value : 4;
  let eraserSize = eraserSizeInput ? +eraserSizeInput.value : 15;

  // Multi-page storage (client-side mirror)
  let pages = [null];
  let currentPage = 0;

  // ---------- Helpers ----------
  function savePageToServer() {
    // push the page snapshot to server (called after significant changes)
    const dataURL = canvas.toDataURL();
    socket.emit("save-page", { roomId: ROOM_ID, pageIndex: currentPage, dataURL });
  }

  function restoreState(dataURL) {
    if (!dataURL) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const img = new Image();
    img.src = dataURL;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.beginPath();
    };
  }

  // ---------- Drawing ----------
  function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDrawing(e) {
    e.preventDefault();
    drawing = true;
    // local save state for undo (client-led)
    saveStateLocal();
    draw(e); // draw the first point immediately
  }

  function stopDrawing() {
    drawing = false;
    ctx.beginPath();
    // after finishing stroke, send a full page snapshot to server so new joiners see it
    savePageToServer();
  }

  function draw(e) {
    if (!drawing) return;
    const pos = getPointerPos(e);
    const x = pos.x, y = pos.y;

    ctx.lineCap = "round";
    if (tool === "pen") {
      ctx.lineWidth = penSize;
      ctx.strokeStyle = color;
    } else {
      ctx.lineWidth = eraserSize;
      ctx.strokeStyle = getComputedStyle(canvas).backgroundColor;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    // emit normalized drawing point to server for others to render
    socket.emit("drawing", {
      roomId: ROOM_ID,
      payload: {
        x,
        y,
        color,
        size: (tool === "pen") ? penSize : eraserSize,
        tool,
        page: currentPage
      }
    });
  }

  // Mouse & Touch bindings
  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseout", stopDrawing);

  canvas.addEventListener("touchstart", (e) => { e.preventDefault(); startDrawing(e); });
  canvas.addEventListener("touchmove", (e) => { e.preventDefault(); draw(e); });
  canvas.addEventListener("touchend", (e) => { e.preventDefault(); stopDrawing(); });

  // ---------- Local undo/redo stacks (per page) ----------
  const localHistories = [[]]; // localHistories[page] = [dataURLs]
  const localRedo = [[]];

  function ensureLocalPage(pageIdx) {
    localHistories[pageIdx] = localHistories[pageIdx] || [];
    localRedo[pageIdx] = localRedo[pageIdx] || [];
  }

  function saveStateLocal() {
    ensureLocalPage(currentPage);
    localHistories[currentPage].push(canvas.toDataURL());
    localRedo[currentPage] = []; // clear redo on new action
    if (localHistories[currentPage].length > 100) localHistories[currentPage].shift();
  }

  // Undo
  if (undoBtn) {
    undoBtn.onclick = () => {
      ensureLocalPage(currentPage);
      if (localHistories[currentPage].length === 0) return;
      localRedo[currentPage].push(canvas.toDataURL());
      const prev = localHistories[currentPage].pop();
      restoreState(prev);
      // notify server (send snapshot so remote clients can sync)
      socket.emit("undo", { roomId: ROOM_ID, pageIndex: currentPage, snapshot: prev });
    };
  }

  // Redo
  if (redoBtn) {
    redoBtn.onclick = () => {
      ensureLocalPage(currentPage);
      if (localRedo[currentPage].length === 0) return;
      localHistories[currentPage].push(canvas.toDataURL());
      const next = localRedo[currentPage].pop();
      restoreState(next);
      socket.emit("redo", { roomId: ROOM_ID, pageIndex: currentPage, snapshot: next });
    };
  }

  // Clear
  if (clearBtn) {
    clearBtn.onclick = () => {
      saveStateLocal();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      socket.emit("clear-page", { roomId: ROOM_ID, pageIndex: currentPage });
      // and save page snapshot
      savePageToServer();
    };
  }

  // Save current page locally & server
  if (saveBtn) {
    saveBtn.onclick = () => {
      savePageToServer();
      // also trigger download
      const link = document.createElement("a");
      link.download = `whiteboard-${ROOM_ID}-page-${currentPage + 1}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
  }

  // ---------- Tools wiring ----------
  if (penToolBtn) penToolBtn.onclick = () => { tool = "pen"; };
  if (eraserToolBtn) eraserToolBtn.onclick = () => { tool = "eraser"; };

  if (colorPicker) colorPicker.oninput = (e) => { color = e.target.value; };

  if (penSizeInput) penSizeInput.oninput = (e) => {
    penSize = +e.target.value;
    if (penSizeLabel) penSizeLabel.textContent = penSize + "px";
  };

  if (eraserSizeInput) eraserSizeInput.oninput = (e) => {
    eraserSize = +e.target.value;
    if (eraserSizeLabel) eraserSizeLabel.textContent = eraserSize + "px";
  };

  // ---------- Page controls ----------
  // Next page
  if (nextPageBtn) {
    nextPageBtn.onclick = () => {
      // save current page snapshot locally & server
      const data = canvas.toDataURL();
      pages[currentPage] = data;
      socket.emit("save-page", { roomId: ROOM_ID, pageIndex: currentPage, dataURL: data });

      currentPage++;
      pages[currentPage] = pages[currentPage] || null;
      ensureLocalPage(currentPage);
      // inform server to switch page for everyone
      socket.emit("change-page", { roomId: ROOM_ID, newPageIndex: currentPage, pageSnapshot: pages[currentPage] || null });
      // locally load page
      if (pages[currentPage]) restoreState(pages[currentPage]);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);

      pageIndicator.textContent = `Page ${currentPage + 1}`;
    };
  }

  // Prev page
  if (prevPageBtn) {
    prevPageBtn.onclick = () => {
      if (currentPage === 0) return;
      // save current
      const data = canvas.toDataURL();
      pages[currentPage] = data;
      socket.emit("save-page", { roomId: ROOM_ID, pageIndex: currentPage, dataURL: data });

      currentPage--;
      ensureLocalPage(currentPage);
      // ask server to change page
      socket.emit("change-page", { roomId: ROOM_ID, newPageIndex: currentPage, pageSnapshot: pages[currentPage] || null });

      if (pages[currentPage]) restoreState(pages[currentPage]);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
      pageIndicator.textContent = `Page ${currentPage + 1}`;
    };
  }

  // Theme toggle
  if (themeToggle) {
    themeToggle.onclick = () => {
      const html = document.documentElement;
      const theme = html.getAttribute("data-theme");
      const next = theme === "light" ? "dark" : "light";
      html.setAttribute("data-theme", next);
      themeToggle.textContent = next === "light" ? "🌙" : "☀️";
      // redraw the canvas stroke color may change for eraser logic - no extra action needed
    };
  }

  // Done init
  pageIndicator.textContent = `Page ${currentPage + 1}`;
};
