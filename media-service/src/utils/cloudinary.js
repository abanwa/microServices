const cloudinary = require("cloudinary").v2;
const logger = require("./logger");

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret
});

// to upload media to cloudinary
// file is the file that we want to upload
const uploadMediaToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto"
      },
      (error, result) => {
        // if there is an error, this will happen
        if (error) {
          logger.error("Error while uploading media to cloudinary : ", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(file.buffer);
  });
};

/*
// if we want to use async await
// Promisify the upload_stream function promisify is from Nodejs
const uploadStreamAsync = promisify(cloudinary.uploader.upload_stream);

const uploadMediaToCloudinary = async (file) => {
  try {
    const result = await uploadStreamAsync({
      resource_type: "auto"
    });

    logger.info("Media uploaded successfully to Cloudinary:", result);
    return result;
  } catch (error) {
    logger.error("Error while uploading media to Cloudinary:", error);
    throw error; // Re-throw the error for the caller to handle
  }
};

*/

// to delete image/file that we uploaded to cloudinary
const deleteMediaFromCloudinary = async (publicId) => {
  logger.info(`deletMediaFromCloudinary public id is: ${publicId}`);
  logger.info(`Raw publicId: ${publicId}`); // Additional log for clarity
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(
      `Media deleted successfully from cloud storage (cloudinary): ${publicId}`
    );

    return result;
  } catch (err) {
    logger.error("Error deleting media from cloudinary : ", err);
    throw err;
  }
};

module.exports = { uploadMediaToCloudinary, deleteMediaFromCloudinary };
