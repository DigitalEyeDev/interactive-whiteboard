
# ✨ Real-Time Collaborative Whiteboard  
A fully-featured, real-time collaborative whiteboard built using **HTML, CSS, JavaScript, and Socket.IO**.  
Users can draw together live in shared rooms, change pages, save drawings, and switch tools without UI refresh.

---

## 🚀 Features

### 🎨 Drawing Tools
- Pen tool  
- Eraser tool  
- Color picker  
- Separate **Pen size + Eraser size sliders**  
- Smooth freehand drawing  
- Undo & Redo  
- Clear canvas  
- Save current page as PNG  
- Dark / Light mode

### 📄 Multi-Page System
- Create unlimited pages  
- Switch between pages (Next / Previous)  
- Each page saves its drawing automatically  
- Undo/Redo/Erase works per page

### 🌐 Real-Time Collaboration
- Built using **Socket.IO**
- Multiple users can draw together **live**  
- Works across devices (desktop, mobile, tablet)  
- Every action is synced:
  - Drawing  
  - Erasing  
  - Page switching  
  - Undo / Redo  
  - Clearing page  

### 📡 Room System
Anyone can join a shared room by URL:

```

[https://your-frontend.netlify.app/?room=class1](https://your-frontend.netlify.app/?room=class1)
[https://your-frontend.netlify.app/?room=team](https://your-frontend.netlify.app/?room=team)
[https://your-frontend.netlify.app/?room=mynotes](https://your-frontend.netlify.app/?room=mynotes)

```

Users in the same room see each other drawing instantly.

---

## 🛠️ Tech Stack

### Frontend:
- HTML5 Canvas API  
- Vanilla JavaScript  
- CSS (responsive, no frameworks)  
- Socket.IO client  

### Backend:
- Node.js  
- Express  
- Socket.IO server  
- Hosted on **Render**  

### Deployment:
- **Frontend** → Netlify / Render Static Site  
- **Backend** → Render Web Service  

---

## 📁 Project Structure

```

/client
index.html
style.css
script.js

/server
server.js
package.json

README.md

````

---

## ▶️ Running the Project Locally

### 1️⃣ Clone the repository

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
````

---

## Backend Setup (Socket.IO server)

### 2️⃣ Install dependencies

```bash
cd server
npm install
```

### 3️⃣ Start backend server

```bash
node server.js
```

Backend runs on:

```
http://localhost:3000
```

---

## Frontend Setup

### 4️⃣ Open the frontend

```bash
cd client
```

Open **index.html** in Live Server (VSCode) or any HTTP server:

```bash
npx serve .
```

or simply drag-drop `index.html` into your browser.

### 5️⃣ Connect to a room

```
http://localhost:5000/?room=test
```

(Open the same URL in 2 tabs to test real-time drawing.)

---

## 🚀 Deployment Guide

### Deploy Backend (Socket.IO) on Render

1. Go to [https://render.com](https://render.com)
2. Create **New → Web Service**
3. Select your GitHub repo
4. Set **Root directory:** `server`
5. **Build command:** `npm install`
6. **Start command:** `node server.js`
7. Deploy — Render gives you a live URL like:

```
https://whiteboard-realtime-server.onrender.com
```

### Update `script.js` with your server URL:

```js
const SERVER_URL = "https://whiteboard-realtime-server.onrender.com";
```

---

### Deploy Frontend on Netlify

1. Go to [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the **client folder**
3. Get a live frontend URL like:

```
https://whiteboard-live.netlify.app
```


## 💡 Future Enhancements

* Shapes (circle, square, arrow, line)
* Text tool
* Zoom + pan (infinite canvas)
* Export full session as PDF
* User cursors
* Laser pointer
* Presence indicators ("User is typing/drawing")

---

## 📜 License

This project is open-source and free to use.

---

## ❤️ Credits

Developed by **Subhrajit Nayak**

