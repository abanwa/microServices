const Search = require("../models/Search");
const logger = require("../utils/logger");

async function handlePostCreated(event) {
  const { postId, userId, content, createdAt } = event || {};
  try {
    if (!postId || !userId || !content || !createdAt) {
      logger.error("Invalid or data in event : ", event);
      return;
    }

    const newSearchPost = new Search({
      postId,
      userId,
      content,
      createdAt
    });

    await newSearchPost.save();
    logger.info(
      `Search post created: postId is ${postId}, userId is ${userId}, newSearcPost id is ${newSearchPost?._id?.toString()}`
    );
  } catch (err) {
    logger.error("Error handling post creation event : ", err);
    throw err;
  }
}

// when we delete a post from the post service, that same post will aslo be deleted from the search post
async function handlePostDeleted(event) {
  const { postId } = event || {};
  try {
    await Search.findOneAndDelete({ postId: postId });
    logger.info(`Search post deleted and the post id is ${postId}`);
  } catch (err) {
    logger.error(
      "Error handling post deletion event in search service : ",
      err
    );
    throw err;
  }
}

module.exports = { handlePostCreated, handlePostDeleted };
