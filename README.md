# SyncDoc — Collaborative Document Engine with AST Conflict Resolution

SyncDoc is a MERN-style collaborative document editor built around an Abstract Syntax Tree (AST) instead of a flat text blob. The current MVP includes:

- React + TypeScript block editor
- Express + Mongoose REST API
- MongoDB Atlas persistence
- Recursive AST validation
- Yjs CRDT document state
- WebSocket real-time synchronization
- Lightweight collaborator presence and block-focus indicators
- HTML export with DOMPurify sanitization
- PDF export
- Seed script for the demo document

## Architecture

```text
React + TypeScript
      │
      ├── REST ───────────────► Express ───► MongoDB Atlas
      │                              │
      │                              └── AST validation
      │
      └── WebSocket ──────────► Yjs + ws
                                  │
                                  ├── CRDT synchronization
                                  ├── presence messages
                                  └── debounced AST persistence
```

## Folder structure

```text
Infotact_Web_Development_internship/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── sync/
│   │   └── utils/
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   └── .env.example
├── docs/
└── tests/
```

## Run locally

### 1. Backend

```powershell
cd backend
npm install
copy .env.example .env
```

Set your Atlas connection string in `backend/.env`:

```env
PORT=5000
WS_PORT=5001
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/syncdoc?retryWrites=true&w=majority
FRONTEND_ORIGIN=http://localhost:5173
```

Then:

```powershell
npm run seed
npm run dev
```

The API runs at `http://localhost:5000` and the collaboration server at `ws://localhost:5001/collab`.

### 2. Frontend

In a second terminal:

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

## Demo flow

1. Open the seeded document.
2. Edit a heading or paragraph.
3. Add a text, heading, code, or divider block.
4. Open the same document in a second browser/incognito window.
5. Edit from both windows and observe the synchronized state.
6. Focus different blocks to show collaborator focus indicators.
7. Export the document as HTML or PDF.
8. Explain that MongoDB stores the durable AST while Yjs handles concurrent shared state.

## Important security note

Never commit `backend/.env`. It is intentionally ignored by Git. Share only the `.env.example` template with teammates.
