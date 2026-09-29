const express = require("express");
const controller = require("../controllers/documentController");

const router = express.Router();
router.get("/", controller.getDocuments);
router.post("/", controller.createDocument);
router.get("/:id", controller.getDocument);
router.put("/:id", controller.updateDocument);
router.delete("/:id", controller.deleteDocument);
router.get("/:id/export/html", controller.exportHtml);
router.get("/:id/export/pdf", controller.exportPdf);

module.exports = router;
