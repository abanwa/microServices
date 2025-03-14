const express = require("express");
const multer = require("multer");

const {
  uploadMedia,
  getAllMedias
} = require("../controllers/media-controller");
const { authenticateRequest } = require("../middleware/authMiddleware");
const logger = require("../utils/logger");

const router = express.Router();

// configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 5 } // 5MB
}).single("file"); // "file" is the form field name or form-data image name that we are sending

router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, function (err) {
      // we will check if there is an error while uploading the file
      if (err instanceof multer.MulterError) {
        logger.error("Multer error while uploading file : ", err);
        return res.status(400).json({
          success: false,
          message: "Multer error while uploading file",
          error: err?.message,
          stack: err?.stack
        });
      } else if (err) {
        logger.error(
          "Unknown Error occured in multer while uploading file : ",
          err
        );
        return res.status(500).json({
          success: false,
          message: "Unknown Error occured in multer while uploading file",
          error: err?.message,
          stack: err?.stack
        });
      }

      if (!req?.file) {
        return res.status(400).json({
          success: false,
          message: "No file found"
        });
      }

      next();
    });
  },
  uploadMedia
);

router.get("/get", authenticateRequest, getAllMedias);

module.exports = router;
