const Search = require("../models/Search");
const logger = require("../utils/logger");

const searchPostController = async (req, res) => {
  logger.info("SEarch endpoint hit!...");
  try {
    const { query } = req.query;
    const results = await Search.find(
      {
        $text: { $search: query }
      },
      {
        score: { $meta: "textScore" }
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);

    res.json({
      success: true,
      results
    });
  } catch (err) {
    logger.error("Error in searchPostController : ", err);
    return res.status(500).json({
      success: false,
      message: "Error searching post"
    });
  }
};

module.exports = { searchPostController };
