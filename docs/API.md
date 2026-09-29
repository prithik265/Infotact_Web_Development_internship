# SyncDoc API

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Backend health check |
| GET | `/documents` | List documents |
| POST | `/documents` | Create document |
| GET | `/documents/:id` | Get full AST document |
| PUT | `/documents/:id` | Update title and/or AST |
| DELETE | `/documents/:id` | Delete document |
| GET | `/documents/:id/export/html` | Sanitized HTML export |
| GET | `/documents/:id/export/pdf` | PDF export |

WebSocket endpoint:

```text
ws://localhost:5001/collab?documentId=<mongo-id>&userId=<id>&name=<name>&color=<hex>
```
