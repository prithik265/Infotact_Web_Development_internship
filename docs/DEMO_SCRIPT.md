# 90-second SyncDoc Demo

### 0–15 seconds — Problem

“Plain-text collaborative editors can overwrite structural changes. SyncDoc represents the document as an AST, so headings, paragraphs, lists and code blocks are independently addressable.”

### 15–35 seconds — AST editor

Open a document, edit a paragraph, add a code block, and delete a block. Explain that the editor changes the AST rather than a single HTML/text blob.

### 35–65 seconds — Collaboration

Open the same document in a second browser. Edit from both windows. Show the live update and collaborator presence/focus state. Explain that Yjs CRDT updates are exchanged over WebSockets and then persisted back to MongoDB.

### 65–80 seconds — Transformation

Use Export → HTML and Export → PDF.

### 80–90 seconds — Security

Explain that generated HTML passes through DOMPurify before it is returned, preventing unsafe HTML fragments from being emitted directly.
