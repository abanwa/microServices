require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const mediaRoutes = require("./routes/media-routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const { handlePostDeleted } = require("./eventHandlers/media-event-handlers");

const app = express();
const PORT = process.env.PORT || 3003;

// connect to mongodb
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("Connected to mongoDB"))
  .catch((err) => {
    logger.error("Mongo connection error", err);
    process.exit(1); // Exit the process if MongoDB connection fails
  });

// we will set the redis client
const redisClient = new Redis(process.env.REDIS_URL);

app.use(cors());
app.use(helmet());
app.use(express.json());

// IP base rate limiting for sensitive endpoints. Allow 100 post in 15mins
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many request"
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  })
});

// apply this sensitiveEndpointsLimiter to our routes
app.use("/api/media/upload", sensitiveEndpointsLimiter);

app.use("/api/media", mediaRoutes);

// error handler
app.use(errorHandler);

// we will start the rabbitMQ server
async function startServer() {
  try {
    await connectToRabbitMQ();

    // consume all the events here. we will consume the events here that was published from the post service when deleting the post in post controller
    await consumeEvent("post.deleted", handlePostDeleted);

    app.listen(PORT, () => {
      logger.info(`Media service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Fail to connect to server : ", err);
    process.exit(1);
  }
}

startServer();

// app.listen(PORT, () => {
//   logger.info(`Media service running on port ${PORT}`);
// });

// here we will handle unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at ", promise, " reason : ", reason);
});
