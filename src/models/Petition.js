const mongoose = require("mongoose");

const { Schema } = mongoose;

const PetitionSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  issueId: { type: Schema.Types.ObjectId, ref: "Grievance", default: null },
  signatures: [{ type: Schema.Types.ObjectId, ref: "User" }],
  type: { type: String, enum: ["linked", "independent"], default: "independent" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Petition || mongoose.model("Petition", PetitionSchema);
