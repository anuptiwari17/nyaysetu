const mongoose = require("mongoose");

const { Schema } = mongoose;

const OTPSchema = new Schema(
  {
    phone: { type: String, required: true, trim: true },
    otp: { type: String, required: true, trim: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.OTP || mongoose.model("OTP", OTPSchema);
