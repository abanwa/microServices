const Post = require("../models/Post");
const logger = require("../utils/logger");
const { publishEvent } = require("../utils/rabbitmq");
const { validateCreatePost } = require("../utils/validation");

async function invalidatePostCache(req, input) {
  // invalidate the single post
  const cachedKey = `post:${input}`;
  await req.redisClient.del(cachedKey);
  // invalidate all the post
  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

const createPost = async (req, res) => {
  logger.info("createPost endpoint hit..");
  try {
    const { error } = validateCreatePost(req.body);
    // log the error if there is an error
    if (error) {
      logger.warn("Create Post Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    const { content, mediaIds } = req.body;
    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || []
    });

    await newlyCreatedPost.save();

    // every post the user save in the Post database will also be saved in the search database. we will publish an event so that the post will be sent to the search service
    // we will consume this event in the search service
    await publishEvent("post.created", {
      postId: newlyCreatedPost?._id?.toString(),
      userId: newlyCreatedPost?.user?.toString(),
      content: newlyCreatedPost?.content,
      createdAt: newlyCreatedPost?.createdAt
    });

    await invalidatePostCache(req, newlyCreatedPost?._id.toString());

    logger.info("Post created successfully : ", newlyCreatedPost);
    res.status(201).json({
      success: true,
      message: "Post created successfully"
    });
  } catch (err) {
    logger.error("createPost error occured", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// using the redisClient we parse when we call the post router /api/post, we will cache and invalidate cache for all the posts and also for single post
// whenever we add a new post, we will invalidate the cache
const getAllPosts = async (req, res) => {
  logger.info("getAllPosts endpoint hit..");
  try {
    // we are implementing pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    // we will create the cache key
    const cacheKey = `posts:${page}:${limit}`;
    // if there is any post that is already present in the cache, it will be returned from the cache
    const cachedPosts = await req.redisClient.get(cacheKey); // from server.js we are parsing the redisClient in the postRoutes

    // if there is a cachedPosts, we will return the cachedPosts
    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }

    // we will select the post from the database if there is no cachedPosts
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    // this will give us the total number of records in our post table
    const totalNoOfPosts = await Post.countDocuments();
    const result = {
      success: true,
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalNoOfPosts / limit),
      totalPosts: totalNoOfPosts
    };

    // save our post in redis cache
    // 300 minutes is the minutes before it will invalidate the cache
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

    res.json(result);
  } catch (err) {
    logger.error("getAllPosts error occured : ", err);
    return res.status(500).json({
      success: false,
      message: "Error getting all Post"
    });
  }
};

const getPost = async (req, res) => {
  logger.info("getPost endpoint hit..");
  try {
    const postId = req.params?.id;
    // we will create our cache key
    const cacheKey = `post:${postId}`;
    // if there is any post that is already present in the cache, it will be returned from the cache
    const cachedPost = await req.redisClient.get(cacheKey); // from server.js we are parsing the redisClient in the postRoutes

    // if there is a cachedPosts, we will return the cachedPosts
    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }

    // if there is no cahce key for this post, we will select the post from our database/table
    const singlePostDetailsById = await Post.findById(postId);
    if (!singlePostDetailsById) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    const singleResult = { success: true, data: singlePostDetailsById };

    await req.redisClient.setex(cacheKey, 36000, JSON.stringify(singleResult));

    res.json({
      success: true,
      data: singlePostDetailsById
    });
  } catch (err) {
    logger.error("getPost Error fetching post by ID : ", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching post by ID"
    });
  }
};

const deletePost = async (req, res) => {
  logger.info("getPost endpoint hit..");
  try {
    const postId = req.params?.id;
    const { userId } = req.user; // the req.user is gotten from our middleware. in the authenticate Request middleware that we used in the post routes
    if (!postId || !userId) {
      logger.warn("paramters missing in deletePost");
      return res.status(400).json({
        success: false,
        message: "paramters missing in deletePost"
      });
    }

    const post = await Post.findOneAndDelete({ _id: postId, user: userId });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    // publish post delete method
    // keys are unique identifiers. i will use "post.deleted" as my key
    // whenever we are deleting a post, we are publishing a "post.deleted" event here in the post service and we will consume it in the media service
    await publishEvent("post.deleted", {
      postId: post?._id?.toString(),
      userId,
      mediaIds: post?.mediaIds
    });

    // Here, we will invalidate the post cache
    await invalidatePostCache(req, postId);
    res.json({
      success: true,
      message: "Post deleted successfully"
    });
  } catch (err) {
    logger.error("Error deleting post by ID : ", err);
    return res.status(500).json({
      success: false,
      message: "Error deleting post by ID"
    });
  }
};

module.exports = { createPost, getAllPosts, getPost, deletePost };
