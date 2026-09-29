const mongoose = require("mongoose");
const Document = require("../models/Document");
const { validateDocumentAst } = require("../utils/astValidator");
const { astToHtml } = require("../services/astHtml");
const { sanitizeHtml } = require("../services/sanitize");
const { astToPdf } = require("../services/pdfExport");

const sendNotFound = (res) => res.status(404).json({ success: false, message: "Document not found" });

async function createDocument(req, res) {
  try {
    const title = String(req.body.title || "Untitled Document").trim();
    const ast = req.body.ast;
    if (!ast) return res.status(400).json({ success: false, message: "AST is required" });
    validateDocumentAst(ast);
    const document = await Document.create({ title, ast });
    res.status(201).json({ success: true, data: document });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getDocuments(req, res) {
  try {
    const documents = await Document.find().select("title version createdAt updatedAt").sort({ updatedAt: -1 });
    res.json({ success: true, count: documents.length, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getDocument(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return sendNotFound(res);
    const document = await Document.findById(req.params.id);
    if (!document) return sendNotFound(res);
    res.json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateDocument(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return sendNotFound(res);
    const document = await Document.findById(req.params.id);
    if (!document) return sendNotFound(res);

    if (req.body.title !== undefined) document.title = String(req.body.title).trim();
    if (req.body.ast !== undefined) {
      validateDocumentAst(req.body.ast);
      document.ast = req.body.ast;
    }
    document.version += 1;
    await document.save();
    res.json({ success: true, data: document });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteDocument(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return sendNotFound(res);
    const deleted = await Document.findByIdAndDelete(req.params.id);
    if (!deleted) return sendNotFound(res);
    res.json({ success: true, message: "Document deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function exportHtml(req, res) {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return sendNotFound(res);
    const html = sanitizeHtml(astToHtml(document.ast, document.title));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${document.title.replace(/[^a-z0-9]+/gi, "-")}.html"`);
    res.send(html);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function exportPdf(req, res) {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return sendNotFound(res);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${document.title.replace(/[^a-z0-9]+/gi, "-")}.pdf"`);
    astToPdf(document.ast, document.title).pipe(res);
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { createDocument, getDocuments, getDocument, updateDocument, deleteDocument, exportHtml, exportPdf };
