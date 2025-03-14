const RefreshToken = require("../models/RefreshToken");
const User = require("../models/User");
const generateTokens = require("../utils/generateToken");
const logger = require("../utils/logger");
const { validateRegistration, validateLogin } = require("../utils/validation");

// user registration
const registerUser = async (req, res) => {
  // log this info
  logger.info("Registration endpoint hit..");
  try {
    // validate the registration data
    const { error } = validateRegistration(req.body);

    // log the error if there is an error
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // now, we will get the data from the req body
    const { email, password, username } = req.body;

    // let user = await User.findOne({}).or([{ email }, { username }]);
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      logger.warn("User already exists");
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    user = new User({ username, email, password });
    await user.save();
    logger.warn("User created successfully : ", user?._id);

    // generate the refresh token and access token here
    const { accessToken, refreshToken } = await generateTokens(user);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      accessToken,
      refreshToken
    });
  } catch (err) {
    // console.log("error occured in registerUser. This is the error : ", err);
    logger.error("Registration error occured", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// user login
const loginUser = async (req, res) => {
  logger.info("Login endpoint hit..");

  try {
    const { error } = validateLogin(req.body);

    // log the error if there is an error
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // now, we will get the data from the req body
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      logger.warn("Invalid credentials");
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // user valid password or not
    const isValidpassword = await user.comparePassword(password);

    if (!isValidpassword) {
      logger.warn("Invalid password");
      return res.status(400).json({
        success: false,
        message: "Invalid password"
      });
    }

    // generate the refresh token and access token here
    const { accessToken, refreshToken } = await generateTokens(user);
    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      userId: user?._id,
      accessToken,
      refreshToken
    });
  } catch (err) {
    // console.log("error occured in loginUser. This is the error : ", err);
    logger.error("loginUser error occured", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// refresh token
const refreshTokenUser = async (req, res) => {
  logger.info("Refresh token endpoint hit..");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token not provided");
      return res.status(400).json({
        success: false,
        message: "Refresh token not provided"
      });
    }
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken?.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token"
      });
    }

    const user = await User.findById(storedToken.userId);
    if (!user) {
      logger.warn("User not found");
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateTokens(user);

    // delete the old token
    await RefreshToken.deleteOne({ _id: storedToken._id });

    // return the new access and refreshToken
    res.json({
      success: true,
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    logger.error("refreshToken error occured", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// logout
logoutUser = async (req, res) => {
  logger.info("Logout endpoint hit..");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token not provided");
      return res.status(400).json({
        success: false,
        message: "Refresh token not provided"
      });
    }
    await RefreshToken.deleteOne({ token: refreshToken });
    logger.info("Refresh token deleted for logout");
    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (err) {
    logger.error("logoutUser error occured", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
module.exports = { registerUser, loginUser, refreshTokenUser, logoutUser };
