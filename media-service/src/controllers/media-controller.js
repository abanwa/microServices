const Media = require("../models/Media");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const uploadMedia = async (req, res) => {
  logger.info("Starting media upload...");
  try {
    const fileToUpload = req?.file;
    if (!fileToUpload) {
      logger.error("No file found. Please add a file and try again!");
      return res.status(400).json({
        success: false,
        message: "No file found. Please add a file and try again!"
      });
    }

    const { originalname, mimetype, buffer } = fileToUpload;
    const userId = req.user?.userId;

    if (!userId) {
      logger.error("No user id found when in media upload");
      return res.status(400).json({
        success: false,
        message: "No user id found when in media upload"
      });
    }

    logger.info(
      `File details: name=${originalname}, mimeType=${mimetype}, userId=${userId}`
    );
    logger.info("Uploading to cloudinary starting...");

    const cloudinaryUploadResult = await uploadMediaToCloudinary(fileToUpload);
    logger.info(
      `Cloudinary uploaded successfully. The Public Id is : ${cloudinaryUploadResult?.public_id}`
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult?.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult?.secure_url,
      userId
    });

    await newlyCreatedMedia.save();
    res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia?._id,
      url: newlyCreatedMedia?.url,
      message: "Media uploaded successfully"
    });
  } catch (err) {
    logger.error("Error uploadMedia uploading file : ", err);
    return res.status(500).json({
      success: false,
      message: "Error uploading file"
    });
  }
};

const getAllMedias = async (req, res) => {
  try {
    const results = await Media.find({});
    res.json({
      success: true,
      data: results
    });
  } catch (err) {
    logger.error("Error getting All medias : ", err);
    return res.status(500).json({
      success: false,
      message: "Error getting All medias"
    });
  }
};

module.exports = { uploadMedia, getAllMedias };
