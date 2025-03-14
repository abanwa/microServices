require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const logger = require("./utils/logger");
const proxy = require("express-http-proxy");
const errorHandler = require("./middleware/errorHandler");
const { validateToken } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

// rate limiting

const rateLimitOptions = rateLimit({
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

app.use(rateLimitOptions);

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body,  ${req.body}`);
  next();
});

/*
--- proxy ---
api->gateway -> /v1/auth/register -> 3000
identity -> /api/auth/register -> 3001
localhost:3000/v1/auth/register -> localhost:3001/api/auth/register
*/

// creating a proxy
const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error: ${err.message}`);
    res.status(500).json({
      success: false,
      message: `Internal server error`,
      error: err.message
    });
  }
};

// setting up proxy for our identity service
app.use(
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Identity service: ${proxyRes.statusCode}`
      );

      return proxyResData;
    }
  })
);

// --- proxy ---

// setting a proxy for the post service
app.use(
  "/v1/posts",
  validateToken,
  proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId; //D srcReq is the req, D user is D user attached to D req.user in D validateToken
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Post service: ${proxyRes.statusCode}`
      );

      return proxyResData;
    }
  })
);

// setting a proxy for the media service
app.use(
  "/v1/media",
  validateToken,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId; //D srcReq is the req, D user is D user attached to D req.user in D validateToken
      if (!srcReq.headers["content-type"].startsWith("multipart/form-data")) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Media service: ${proxyRes.statusCode}`
      );

      return proxyResData;
    },
    parseReqBody: false
  })
);

// setting a proxy for the search service
app.use(
  "/v1/search",
  validateToken,
  proxy(process.env.SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId; //D srcReq is the req, D user is D user attached to D req.user in D validateToken
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Search service: ${proxyRes.statusCode}`
      );

      return proxyResData;
    }
  })
);

// handle the errors
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API Gateway is running on port : ${PORT}`);
  logger.info(
    `Identity service is running on port : ${process.env.IDENTITY_SERVICE_URL}`
  );
  logger.info(
    `post service is running on port : ${process.env.POST_SERVICE_URL}`
  );
  logger.info(
    `media service is running on port : ${process.env.MEDIA_SERVICE_URL}`
  );
  logger.info(
    `search service is running on port : ${process.env.SEARCH_SERVICE_URL}`
  );
  logger.info(`Redis Url is running on port : ${process.env.REDIS_URL}`);
});
