require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const searchRoutes = require("./routes/search-routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
// const { rateLimit } = require("express-rate-limit");
// const { RedisStore } = require("rate-limit-redis");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const {
  handlePostCreated,
  handlePostDeleted
} = require("./eventHandlers/search-event-handlers");

const app = express();
const PORT = process.env.PORT || 3004;

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

app.use("/api/search", searchRoutes);

// error handler
app.use(errorHandler);

// we will start the rabbitMQ server
async function startServer() {
  try {
    await connectToRabbitMQ();

    // consume all the events here. we will consume the events here that was published from the post service when creating the post in post controller
    await consumeEvent("post.created", handlePostCreated);
    await consumeEvent("post.deleted", handlePostDeleted);

    app.listen(PORT, () => {
      logger.info(`Search service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Fail to connect to search server : ", err);
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
