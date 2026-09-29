# SyncDoc AST Design

## Root

```text
Document
├── Heading
├── Paragraph
├── CodeBlock
├── Quote
├── BulletList
│   └── ListItem
├── OrderedList
│   └── ListItem
└── Divider
```

## Common node fields

```json
{
  "id": "node-001",
  "type": "paragraph",
  "content": { "text": "Hello" },
  "attributes": {},
  "parentId": "root-001",
  "position": 0,
  "children": []
}
```

The root document has `parentId: null`. Child `position` values are validated recursively. Heading levels are 1–6 and code nodes may carry an optional language attribute.
