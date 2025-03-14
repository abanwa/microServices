require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const postRoutes = require("./routes/post-routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { connectToRabbitMQ } = require("./utils/rabbitmq");

const app = express();
const PORT = process.env.PORT || 3002;

// connect to mongodb
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("Connected to mongoDB"))
  .catch((err) => logger.error("Mongo connection error", err));

// we will set the redis client
const redisClient = new Redis(process.env.REDIS_URL);

// middlewares
// helmet helps to set various http headers which improves security
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body,  ${req.body}`);
  next();
});

// IP base rate limiting for sensitive endpoints. Allow 100 post in 15mins
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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
app.use("/api/posts/create-post", sensitiveEndpointsLimiter);

// Routes
// routes -> pass redisclient to the routes. we will use the redisClient in our controller
app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes
);
// //app.use("/api/posts", postRoutes);

// error handler
app.use(errorHandler);

// start the rabbitMQ server
async function startServer() {
  try {
    await connectToRabbitMQ();

    app.listen(PORT, () => {
      logger.info(`Post service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Fail to connect to server : ", err);
    process.exit(1);
  }
}

startServer();

// app.listen(PORT, () => {
//   logger.info(`Post service running on port ${PORT}`);
// });

// here we will handle unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at ", promise, " reason : ", reason);
});
