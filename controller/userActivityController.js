const mongoose = require("mongoose");
const UserActivity = require("../models/UserActivity");
const requestIp = require("request-ip");
const logSearch = async (req, res) => {
  try {
    const { searchString } = req.body;

    if (!searchString) {
      return res
        .status(400)
        .send({ message: "IP address and search string are required." });
    }

    const ipAddress = requestIp.getClientIp(req);

    let userActivity = await UserActivity.findOne({ ipAddress });

    const lowercasedSearchString = searchString.toLowerCase();

    if (!userActivity) {
      userActivity = new UserActivity({
        ipAddress,
        searches: [{ searchString: lowercasedSearchString, count: 1 }],
      });
    } else {
      const existingSearch = userActivity.searches.find(
        (search) => search.searchString === lowercasedSearchString
      );

      if (existingSearch) {
        existingSearch.count += 1;
      } else {
        userActivity.searches.push({
          searchString: lowercasedSearchString,
          count: 1,
        });
      }
    }

    await userActivity.save();
    res.status(200).send({
      message: "Search logged successfully",
      searches: userActivity.searches,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const logCategoryClick = async (req, res) => {
  try {
    const { categoryName } = req.body;

    if (!categoryName) {
      return res.status(400).send({ message: "Category ID is required." });
    }

    const ipAddress = requestIp.getClientIp(req);

    let userActivity = await UserActivity.findOne({ ipAddress });

    const categoryId = mongoose.Types.ObjectId(categoryName); // Convert to ObjectId

    if (!userActivity) {
      userActivity = new UserActivity({
        ipAddress,
        categoryClicks: [{ categoryName: categoryId, clickCount: 1 }],
      });
    } else {
      const existingCategory = userActivity.categoryClicks.find(
        (category) => category.categoryName.toString() === categoryId.toString()
      );

      if (existingCategory) {
        existingCategory.clickCount += 1;
      } else {
        userActivity.categoryClicks.push({
          categoryName: categoryId,
          clickCount: 1,
        });
      }
    }

    await userActivity.save();

    const populatedUserActivity = await UserActivity.findById(
      userActivity._id
    ).populate("categoryClicks.categoryName"); // Populate category details

    res.status(200).send({
      message: "Category click logged successfully",
      categoryClicks: populatedUserActivity.categoryClicks,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const getUserActivity = async (req, res) => {
  try {
    const { ipAddress } = req.params;

    if (!ipAddress) {
      return res.status(400).send({ message: "IP address is required." });
    }

    const userActivity = await UserActivity.findOne({ ipAddress });

    if (!userActivity) {
      return res
        .status(404)
        .send({ message: "No activity found for this IP address." });
    }

    res.status(200).send(userActivity);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

module.exports = {
  logSearch,
  logCategoryClick,
  getUserActivity,
};
