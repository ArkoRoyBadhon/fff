const Notification = require("../models/Notification");

const createNotificationFunc = async (
  userId,
  role,
  type,
  module,
  message,
  link,
  metadata = {}
) => {
  try {
    const notification = new Notification({
      userId,
      role,
      type,
      module,
      message,
      link,
      metadata,
    });
    await notification.save();
    console.log(`Notification created for user ${userId} with role ${role}: ${message}`);
  } catch (error) {
    console.error(`Error creating notification for user ${userId}:`, error);
    throw error;
  }
};


module.exports = createNotificationFunc;