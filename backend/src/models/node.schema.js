const mongoose = require("mongoose");

const { Schema } = mongoose;

const NodeSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: [
        "document",
        "heading",
        "paragraph",
        "code",
        "quote",
        "bulletList",
        "orderedList",
        "listItem",
        "divider"
      ]
    },
    content: { type: Schema.Types.Mixed, default: {} },
    attributes: { type: Schema.Types.Mixed, default: {} },
    parentId: { type: String, default: null },
    position: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

NodeSchema.add({
  children: { type: [NodeSchema], default: [] }
});

module.exports = NodeSchema;
