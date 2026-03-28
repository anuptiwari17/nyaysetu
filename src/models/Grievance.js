const mongoose = require("mongoose");

const { Schema } = mongoose;

const GrievanceSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  location: { type: String, default: "", trim: true },
  isAnonymous: { type: Boolean, default: false },
  evidence: [{ type: String }],
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  supportCount: { type: Number, default: 0, min: 0 },
  supporters: [{ type: Schema.Types.ObjectId, ref: "User" }],
  assignedAuthority: { type: Schema.Types.ObjectId, ref: "Authority", default: null },
  status: {
    type: String,
    enum: ["reported", "in_progress", "resolved"],
    default: "reported",
  },
  resolutionNote: { type: String, default: "", trim: true },
  resolutionProof: { type: String, default: "", trim: true },
  legalContext: { type: String, default: "", trim: true },
  aiStructuredText: { type: String, default: "", trim: true },
  authorityReason: { type: String, default: "", trim: true },
  statusHistory: {
    type: [
      {
        status: { type: String, trim: true },
        note: { type: String, default: "", trim: true },
        proof: { type: String, default: "", trim: true },
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    default: [],
  },
  petitionId: { type: Schema.Types.ObjectId, ref: "Petition", default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Grievance || mongoose.model("Grievance", GrievanceSchema);
