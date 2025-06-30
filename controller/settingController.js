const Setting = require("../models/Setting");

// Utility functions
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

const validateSettingsData = (type, data) => {
  switch (type) {
    case "general":
      if (!data.title || typeof data.title !== "string") {
        return {
          isValid: false,
          message: "Title is required and must be a string",
        };
      }
      break;

    case "social-media":
      const socialFields = ["facebook", "youtube", "instagram", "telegram"];
      for (const field of socialFields) {
        if (data[field] && !isValidUrl(data[field])) {
          return { isValid: false, message: `Invalid URL format for ${field}` };
        }
      }
      break;

    case "seo":
      if (!data.seoTitle || typeof data.seoTitle !== "string") {
        return { isValid: false, message: "SEO Title is required" };
      }
      if (data.seoDescription && data.seoDescription.length > 500) {
        return {
          isValid: false,
          message: "SEO Description must be less than 500 characters",
        };
      }
      break;

    case "social-login":
      if (!data.googleClientId || typeof data.googleClientId !== "string") {
        return { isValid: false, message: "Google Client ID is required" };
      }
      if (!data.facebookClientId || typeof data.facebookClientId !== "string") {
        return { isValid: false, message: "Facebook Client ID is required" };
      }
      break;

    default:
      return { isValid: false, message: "Invalid settings type" };
  }
  return { isValid: true };
};

// Base Controller Methods
const getSettingsByType = async (type) => {
  return await Setting.findOne({ type });
};

const updateSettings = async (type, updateData, userId) => {
  // For social-login, handle secret masking
  if (type === "social-login") {
    const existingSettings = await Setting.findOne({ type });
    if (existingSettings) {
      if (updateData.googleClientSecret === "***HIDDEN***") {
        updateData.googleClientSecret =
          existingSettings.data.googleClientSecret;
      }
      if (updateData.facebookClientSecret === "***HIDDEN***") {
        updateData.facebookClientSecret =
          existingSettings.data.facebookClientSecret;
      }
    }
  }

  const settings = await Setting.findOneAndUpdate(
    { type },
    {
      data: updateData,
      lastUpdated: Date.now(),
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  if (userId) {
    // await logActivity(userId, `Updated ${type} settings`);
    console.log(`Updated ${type} settings`);
  }

  return settings;
};

// Exportable Controller Functions
const getAllSettings = async (req, res) => {
  try {
    const settings = await Setting.find({});
    const formattedSettings = settings.map((setting) => ({
      type: setting.type,
      lastUpdated: setting.lastUpdated,
      data:
        setting.type === "social-login"
          ? {
              ...setting.data,
              googleClientSecret: "***HIDDEN***",
              facebookClientSecret: "***HIDDEN***",
            }
          : setting.data,
    }));

    res.status(200).json({
      success: true,
      data: formattedSettings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch all settings",
      error: error.message,
    });
  }
};

const getGeneralSettings = async (req, res) => {
  try {
    const settings = await getSettingsByType("general");
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "General settings not found",
      });
    }

    res.status(200).json({
      success: true,
      data: settings.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch general settings",
      error: error.message,
    });
  }
};

const updateGeneralSettings = async (req, res) => {
  try {
    const { title, largeLogo, smallLogo } = req.body;
    const validation = validateSettingsData("general", { title });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const settings = await updateSettings(
      "general",
      { title, largeLogo: largeLogo || "", smallLogo: smallLogo || "" },
      req.user?.id
    );

    res.status(200).json({
      success: true,
      message: "General settings updated successfully",
      data: settings.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update general settings",
      error: error.message,
    });
  }
};

const getSocialMediaSettings = async (req, res) => {
  try {
    const settings = await getSettingsByType("social-media");
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Social media settings not found",
      });
    }

    res.status(200).json({
      success: true,
      data: settings.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch social media settings",
      error: error.message,
    });
  }
};

const updateSocialMediaSettings = async (req, res) => {
  try {
    // const { facebook, youtube, instagram, telegram } = req.body;
    // const updateData = { facebook, youtube, instagram, telegram };
    // const validation = validateSettingsData("social-media", updateData);

    // if (!validation.isValid) {
    //   return res.status(400).json({
    //     success: false,
    //     message: validation.message,
    //   });
    // }

    const settings = await updateSettings(
      "social-media",
      req.body,
      req.user?.id
    );

    res.status(200).json({
      success: true,
      message: "Social media settings updated successfully",
      data: settings.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update social media settings",
      error: error.message,
    });
  }
};

const getSEOSettings = async (req, res) => {
  try {
    const settings = await getSettingsByType("seo");
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "SEO settings not found",
      });
    }

    res.status(200).json({
      success: true,
      data: settings.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch SEO settings",
      error: error.message,
    });
  }
};

const updateSEOSettings = async (req, res) => {
  try {
    const { seoTitle, seoKeywords, seoDescription, ogImage } = req.body;
    const updateData = { seoTitle, seoKeywords, seoDescription, ogImage };
    const validation = validateSettingsData("seo", updateData);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const settings = await updateSettings("seo", updateData, req.user?.id);

    res.status(200).json({
      success: true,
      message: "SEO settings updated successfully",
      data: settings.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update SEO settings",
      error: error.message,
    });
  }
};

const getSocialLoginSettings = async (req, res) => {
  try {
    const settings = await getSettingsByType("social-login");
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Social login settings not found",
      });
    }

    const responseData = {
      ...settings.data,
      googleClientSecret: "***HIDDEN***",
      facebookClientSecret: "***HIDDEN***",
    };

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch social login settings",
      error: error.message,
    });
  }
};

const updateSocialLoginSettings = async (req, res) => {
  try {
    const {
      googleClientId,
      googleClientSecret,
      googleRedirectUri,
      facebookClientId,
      facebookClientSecret,
      facebookRedirectUri,
    } = req.body;
    const updateData = {
      googleClientId,
      googleClientSecret,
      facebookClientId,
      facebookClientSecret,
      googleRedirectUri,
      facebookRedirectUri,
    };
    const validation = validateSettingsData("social-login", updateData);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const settings = await updateSettings(
      "social-login",
      updateData,
      req.user?.id
    );

    const responseData = {
      ...settings.data,
      googleClientSecret: "***HIDDEN***",
      facebookClientSecret: "***HIDDEN***",
    };

    res.status(200).json({
      success: true,
      message: "Social login settings updated successfully",
      data: responseData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update social login settings",
      error: error.message,
    });
  }
};

module.exports = {
  getAllSettings,
  // general
  getGeneralSettings,
  updateGeneralSettings,
  //social media
  getSocialMediaSettings,
  updateSocialMediaSettings,
  //seo
  getSEOSettings,
  updateSEOSettings,
  //social login
  getSocialLoginSettings,
  updateSocialLoginSettings,
};
