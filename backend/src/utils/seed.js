require("dotenv").config();
const connectDB = require("../config/db");
const Document = require("../models/Document");

const ast = {
  id: "root-001",
  type: "document",
  content: {},
  attributes: {},
  parentId: null,
  position: 0,
  children: [
    { id: "heading-001", type: "heading", content: { text: "Welcome to SyncDoc" }, attributes: { level: 1 }, parentId: "root-001", position: 0, children: [] },
    { id: "paragraph-001", type: "paragraph", content: { text: "This is our first collaborative document." }, attributes: {}, parentId: "root-001", position: 1, children: [] },
    { id: "list-001", type: "bulletList", content: {}, attributes: {}, parentId: "root-001", position: 2, children: [
      { id: "item-001", type: "listItem", content: {}, attributes: {}, parentId: "list-001", position: 0, children: [
        { id: "item-para-001", type: "paragraph", content: { text: "First collaborative item" }, attributes: {}, parentId: "item-001", position: 0, children: [] }
      ] }
    ] }
  ]
};

(async () => {
  try {
    await connectDB();
    const existing = await Document.findOne({ title: "My First SyncDoc" });
    if (existing) {
      console.log("Seed document already exists:", existing._id.toString());
    } else {
      const created = await Document.create({ title: "My First SyncDoc", ast });
      console.log("Seed document created:", created._id.toString());
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    const mongoose = require("mongoose");
    await mongoose.disconnect();
  }
})();
