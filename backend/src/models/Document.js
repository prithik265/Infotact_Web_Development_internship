const mongoose = require("mongoose");
const NodeSchema = require("./node.schema");
const { validateDocumentAst } = require("../utils/astValidator");

const DocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    ast: { type: NodeSchema, required: true },
    version: { type: Number, default: 1, min: 1 }
  },
  { timestamps: true }
);

DocumentSchema.pre("validate", function () {
  validateDocumentAst(this.ast);
});

module.exports = mongoose.model("Document", DocumentSchema);
