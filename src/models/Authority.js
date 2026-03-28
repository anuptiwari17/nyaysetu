const mongoose = require("mongoose");

const { Schema } = mongoose;

const AuthoritySchema = new Schema({
  name: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  categoriesHandled: [{ type: String, trim: true }],
  contactInfo: {
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    address: { type: String, default: "", trim: true },
  },
});

module.exports = mongoose.models.Authority || mongoose.model("Authority", AuthoritySchema);
