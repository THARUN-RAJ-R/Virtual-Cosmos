# Cosmos: Virtual 2D Universe with Proximity Chat

**Cosmos** is a high-performance, immersive 2D virtual space where users can explore and interact with others in their immediate proximity. Built with **React**, **Pixi.js**, and **Socket.io**, it features a unique "Direct Proximity" communication model designed for privacy and organic social interaction.

---

## 🚀 Core Features

### 📡 Direct Proximity Intelligence
- **Private Conversations**: Chat logic is strictly isolated to a **150px** radius.
- **Dynamic Interaction**: The chat panel automatically opens when you move near someone and closes when you leave.
- **Global Visibility**: Bystanders can see active connection lines between other users, making the universe feel alive and collaborative.

### ⚡ Performance & Visuals
- **Zero-Lag Connections**: Precision coordinate anchoring ensures connection lines stay perfectly locked to players during fast movement.
- **High-Contrast Aesthetics**: A sleek cosmic dark theme with neon-indigo accents and pulsing proximity lines for maximum visual clarity.
- **Smooth Fade-Out**: Connections gracefully fade in/out near the interaction boundary for a polished user experience.

### 🛠️ Technical Stack
- **Frontend**: React (UI), Pixi.js (Rendering Engine), Tailwind CSS (Styling).
- **Backend**: Node.js, Express, Socket.io (WebSocket), MongoDB (Optional Persistence).

---

## 💻 Setup Instructions

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **npm** or **yarn**
- **MongoDB** (Local or Atlas) - *Optional, app will run in session-only mode if not found.*

### 2. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. (Optional) Create a `.env` file with your `MONGO_URI`.
4. Start the server:
   ```bash
   node server.js
   ```
   *The backend will be live at http://localhost:3001*

### 3. Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev -- --host 127.0.0.1
   ```
   *The frontend will be live at http://127.0.0.1:5173/*

---

## 📖 Architecture & Bonuses

- **O(N) Scaling**: The world ticker and proximity engine have been optimized to handle concurrent users efficiently by using pair-check logic and high-frequency coordinate refs.
- **Branding**: Fully customized **Cosmos** branding with a signature "C" initial and minimalist HUD design.
- **Zero-Lag Physics**: Implemented high-frequency coordinate interpolation to prevent the "line lag" typical of network-based 2D worlds.

---

## 🛡️ Privacy Design
Unlike room-based systems, **Cosmos** uses a strict Euclidean distance check (`distSq < 150^2`). This ensures that if User A and User B are chatting, a third User C located far away cannot "eavesdrop" even through a chain of connected nodes.

---
*Created for the Cosmos 2D Universe Challenge.*
