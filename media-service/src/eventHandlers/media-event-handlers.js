// the event will consume all the message that we parse in the publishEvent("psot.deleted") in post service

const Media = require("../models/Media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

// that is the event will be then data/message that was published from post server in deletePost and the key or routingKey is psot.deleted
const handlePostDeleted = async (event) => {
  console.log("eventToHandle in handlePostDeleted : ", event);
  const { postId, mediaIds } = event || {}; // Add fallback to avoid undefined destructuring

  try {
    if (!mediaIds || !Array.isArray(mediaIds)) {
      logger.error("Invalid or missing mediaIds in event : ", event);
      return;
    }

    const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });

    logger.info("mediaToDelete Record is : ", mediaToDelete);

    for (const media of mediaToDelete) {
      if (!media?.publicId) {
        logger.error("Invalid or missing publicId for media : ", media);
        continue; // Skip this media and move to the next one
      }

      logger.info("Media to delete is : ", media);

      // we will delete the image from cloudinary using the uploaded image public_id
      await deleteMediaFromCloudinary(media?.publicId);

      // we will now delete it from our database too
      await Media.findByIdAndDelete(media?._id);

      logger.info(
        `Deleted media and the media id is ${media?._id} and publicId  is ${media?.publicId} and it's associated with this deleted post. the post id is ${postId}`
      );
    }

    logger.info(`Processed deletion of media for post id : ${postId}`);
  } catch (err) {
    logger.error("Error occured during media deletion : ", err);
    throw err;
  }
};

/*
const Media = require("../models/Media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger"); // Assuming logger is imported

const handlePostDeleted = async (event) => {
  console.log("eventToHandle in handlePostDeleted : ", event);
  const { postId, mediaIds } = event || {}; // Add fallback to avoid undefined destructuring
  logger.info(`postId => ${postId}, mediaIds => ${mediaIds}`);
  logger.info("postId => ", postId, " mediaIds => ", mediaIds);

  try {
    // Step 1: Validate event input
    if (!event || typeof event !== "object") {
      const error = new Error("Event is missing or not an object");
      logger.error("Validation error in handlePostDeleted : ", error.message, {
        event
      });
      throw error;
    }

    if (!mediaIds || !Array.isArray(mediaIds)) {
      const error = new Error("Invalid or missing mediaIds in event");
      logger.error("Validation error : ", error.message, { event });
      throw error; // Throw instead of return to propagate the error
    }

    if (!postId) {
      const error = new Error("Missing postId in event");
      logger.error("Validation error : ", error.message, { event });
      throw error;
    }

    // Step 2: Query media records from the database
    let mediaToDelete;
    try {
      mediaToDelete = await Media.find({ _id: { $in: mediaIds } });
      logger.info("mediaToDelete Record is : ", mediaToDelete);
    } catch (dbError) {
      const error = new Error("Failed to fetch media records from database");
      error.cause = dbError; // Attach original error as cause
      logger.error("Database query error : ", error.message, {
        error: dbError.message,
        mediaIds
      });
      throw error;
    }

    if (!mediaToDelete.length) {
      logger.warn(`No media records found for mediaIds : ${mediaIds}`);
    }

    // Step 3: Process each media item
    for (const media of mediaToDelete) {
      try {
        if (!media?.publicId.toString()) {
          const error = new Error("Invalid or missing publicId for media");
          logger.error("Media validation error : ", error.message, { media });
          //   continue; // Skip this iteration
          throw error;
        }

        logger.info("Media to delete is : ", media);

        // Step 3a: Delete from Cloudinary
        try {
          const public_id = media.publicId;
          console.log(public_id);
          console.log("public ID : ", public_id);
          await deleteMediaFromCloudinary(media.publicId.toString());
        } catch (cloudinaryError) {
          const error = new Error("Failed to delete media from Cloudinary");
          error.cause = cloudinaryError;
          logger.error("Cloudinary deletion error : ", error.message, {
            publicId: media.publicId.toString(),
            error: cloudinaryError.message
          });
          throw error; // Re-throw to stop processing this media item
        }

        // Step 3b: Delete from database
        try {
          const deletedMedia = await Media.findByIdAndDelete(
            media._id.toString()
          );
          if (!deletedMedia) {
            logger.warn("Media not found in database during deletion : ", {
              mediaId: media._id.toString()
            });
          } else {
            logger.info(
              `Deleted media with id ${media._id.toString()} and publicId is ${media.publicId.toString()} and associated with post id ${postId}`
            );
          }
        } catch (dbDeleteError) {
          const error = new Error("Failed to delete media from database");
          error.cause = dbDeleteError;
          logger.error("Database deletion error : ", error.message, {
            mediaId: media._id.toString(),
            error: dbDeleteError.message
          });
          throw error;
        }
      } catch (mediaError) {
        logger.error("Error processing media item : ", mediaError.message, {
          mediaId: media._id.toString(),
          cause: mediaError.cause?.message
        });
        // Decide whether to continue or throw based on your needs
        // continue; // Continue to next media item instead of stopping entirely
        throw mediaError;
      }
    }

    logger.info(`Processed deletion of media for post id : ${postId}`);
  } catch (err) {
    // Top-level error handler
    logger.error(
      "Error occurred during media deletion in handlePostDeleted : ",
      {
        message: err.message,
        cause: err.cause?.message || "Unknown cause",
        stack: err.stack,
        event
      }
    );
    throw err; // Re-throw to let the caller (e.g., RabbitMQ consumer) handle it
  }
};

*/
module.exports = { handlePostDeleted };
