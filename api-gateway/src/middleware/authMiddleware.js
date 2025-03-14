const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

const validateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    logger.warn("Access attempted without valid token");
    return res.status(401).json({
      success: false,
      message: "Authentication required! Please login to continue"
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn("Invalid token");
      return res.status(403).json({
        success: false,
        message: "Invalid token"
      });
    }
    req.user = user; // this is the payload that was used to create the accessToken
    next();
  });
};

module.exports = { validateToken };
