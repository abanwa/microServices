const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unqiue: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expiresAfterSeconds: 0 });

const RefreshToken =
  mongoose.models.refreshToken ||
  mongoose.model("RefreshToken", refreshTokenSchema);

module.exports = RefreshToken;
