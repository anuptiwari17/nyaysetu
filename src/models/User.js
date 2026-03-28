const mongoose = require("mongoose");

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, default: "", trim: true },
    role: { type: String, enum: ["citizen", "authority"], default: "citizen" },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true, default: "Punjab" },
    authorityId: { type: Schema.Types.ObjectId, ref: "Authority", default: null },
    authorityName: { type: String, default: "", trim: true },
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.post("findOne", function (doc) {
  if (doc) {
    if (doc.isPhoneVerified === undefined) doc.isPhoneVerified = false;
    if (doc.isEmailVerified === undefined) doc.isEmailVerified = false;
  }
});

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
