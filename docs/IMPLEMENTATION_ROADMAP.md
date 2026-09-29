# SyncDoc Implementation Roadmap

## Phase 1 — AST Editor (current MVP)

- REST document CRUD
- MongoDB recursive AST persistence
- React block renderer
- Block text editing
- Add/delete basic blocks
- Yjs-backed editor state

## Phase 2 — Collaboration

- WebSocket transport
- Yjs CRDT updates
- Multi-client convergence
- Presence list
- Focus/cursor indicators
- Debounced persistence of collaborative state

## Phase 3 — Transformation & Security

- AST → HTML
- DOMPurify sanitization
- AST → PDF

## Phase 4 — Presentation hardening

- Error/loading states
- Empty states
- Better block controls
- Testing of AST rules and API routes
- Collaboration stress demo with multiple clients
- README, report, PPT, screenshots and architecture diagrams

## Deliberate MVP trade-offs

The first presentable build intentionally does not attempt authentication, enterprise permissions, version-history UI, comments, or production-scale infrastructure. Those features can be documented as future work after the required collaboration path is demonstrated.
