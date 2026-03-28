const mongoose = require("mongoose");

const { Schema } = mongoose;

const OTPSchema = new Schema(
  {
    channel: { type: String, enum: ["phone", "email"], default: "phone", index: true },
    purpose: { type: String, default: "register", trim: true, index: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    otp: { type: String, required: true, trim: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OTPSchema.index({ channel: 1, purpose: 1, phone: 1, email: 1, verified: 1 });

module.exports = mongoose.models.OTP || mongoose.model("OTP", OTPSchema);
