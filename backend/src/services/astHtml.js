function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderNode(node) {
  const text = escapeHtml(node.content?.text || "");

  switch (node.type) {
    case "document":
      return node.children.map(renderNode).join("\n");
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attributes?.level || 1)));
      return `<h${level}>${text}</h${level}>`;
    }
    case "paragraph":
      return `<p>${text || "<br>"}</p>`;
    case "code":
      return `<pre><code class="language-${escapeHtml(node.attributes?.language || "text")}">${text}</code></pre>`;
    case "quote":
      return `<blockquote>${node.children.map(renderNode).join("\n")}</blockquote>`;
    case "bulletList":
      return `<ul>${node.children.map(renderNode).join("\n")}</ul>`;
    case "orderedList":
      return `<ol>${node.children.map(renderNode).join("\n")}</ol>`;
    case "listItem":
      return `<li>${node.children.map(renderNode).join("\n")}</li>`;
    case "divider":
      return "<hr>";
    default:
      return "";
  }
}

function astToHtml(ast, title) {
  const body = renderNode(ast);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;max-width:850px;margin:40px auto;padding:0 24px;line-height:1.6;color:#1f2937}pre{background:#111827;color:#f9fafb;padding:16px;border-radius:10px;overflow:auto}blockquote{border-left:4px solid #8b5cf6;padding-left:16px;color:#4b5563}hr{border:0;border-top:1px solid #e5e7eb;margin:24px 0}</style></head><body>${body}</body></html>`;
}

module.exports = { astToHtml };
