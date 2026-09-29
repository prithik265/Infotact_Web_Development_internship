const PDFDocument = require("pdfkit");

function drawNode(pdf, node, depth = 0) {
  const indent = Math.min(depth * 18, 90);
  const text = node.content?.text || "";

  if (node.type === "heading") {
    const size = Math.max(14, 24 - ((node.attributes?.level || 1) - 1) * 2);
    pdf.moveDown(0.5).fontSize(size).font("Helvetica-Bold").text(text, { indent });
    pdf.font("Helvetica").fontSize(11);
  } else if (node.type === "paragraph") {
    pdf.fontSize(11).font("Helvetica").text(text, { indent, lineGap: 4 });
  } else if (node.type === "code") {
    pdf.font("Courier").fontSize(9).text(text, { indent, lineGap: 2 });
    pdf.font("Helvetica").fontSize(11);
  } else if (node.type === "quote") {
    pdf.fontSize(11).fillColor("#6b7280").text(text, { indent: indent + 10, lineGap: 3 });
    pdf.fillColor("#111827");
  } else if (node.type === "listItem") {
    pdf.fontSize(11).text("• ", { indent, continued: true });
    node.children.forEach((child) => drawNode(pdf, child, depth + 1));
  } else if (node.type === "divider") {
    pdf.moveDown(0.5).moveTo(60, pdf.y).lineTo(550, pdf.y).stroke().moveDown(0.5);
  }

  if (!["document", "listItem"].includes(node.type)) {
    node.children.forEach((child) => drawNode(pdf, child, depth + 1));
  }
}

function astToPdf(ast, title) {
  const pdf = new PDFDocument({ margin: 60 });
  pdf.info.Title = title;
  pdf.font("Helvetica-Bold").fontSize(22).text(title).moveDown();
  pdf.font("Helvetica").fontSize(11);
  ast.children.forEach((child) => drawNode(pdf, child));
  pdf.end();
  return pdf;
}

module.exports = { astToPdf };
