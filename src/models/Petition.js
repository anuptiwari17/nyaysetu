const mongoose = require("mongoose");

const { Schema } = mongoose;

const PetitionSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  thumbnailUrl: { type: String, required: true, trim: true },
  tags: { type: [String], default: [] },
  city: { type: String, default: "", trim: true },
  location: { type: String, default: "", trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  issueId: { type: Schema.Types.ObjectId, ref: "Grievance", default: null },
  signatures: [{ type: Schema.Types.ObjectId, ref: "User" }],
  signerEntries: [
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      signedAt: { type: Date, default: Date.now },
    },
  ],
  type: { type: String, enum: ["linked", "independent"], default: "independent" },
  status: { type: String, enum: ["active", "victory_declared"], default: "active" },
  victoryDeclaredAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

PetitionSchema.index({ title: "text", description: "text", tags: "text", city: "text", location: "text" });

module.exports = mongoose.models.Petition || mongoose.model("Petition", PetitionSchema);
