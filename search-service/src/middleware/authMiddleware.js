const logger = require("../utils/logger");

const authenticateRequest = (req, res, next) => {
  // we will get the userId from the header, that mean, when we want to call this endpoint, we will set the user id in the header
  const userId = req.headers["x-user-id"];

  if (!userId) {
    logger.warn(`Access attempted without user ID`);
    return res.status(401).json({
      success: false,
      message: "Authentication required! Please login to continue"
    });
  }

  // this means, req.user is an object of { userId : userId }
  req.user = { userId };
  next();
};

module.exports = { authenticateRequest };
