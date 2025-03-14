const mongoose = require("mongoose");
const argon2 = require("argon2");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

// we will hash the password when the user is created before the user data is saved into the table
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    try {
      this.password = await argon2.hash(this.password);
    } catch (err) {
      return next(err);
    }
  }
});

// this will compare the user password and the user's password in the database during login
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await argon2.verify(this.password, candidatePassword);
  } catch (err) {
    throw err;
  }
};

// we will create a search functionality
userSchema.index({ username: "text" });

const User = mongoose.models.user || mongoose.model("User", userSchema);
module.exports = User;
