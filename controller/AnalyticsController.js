const { google } = require("googleapis");
const path = require("path");

const analyticsDataClient = google.analyticsdata("v1beta");

const getAnalyticsData = async () => {
  try {
    // const auth = new google.auth.GoogleAuth({
    //   keyFile: path.join(
    //     __dirname,
    //     "../config/next-14-434204-754186a80356.json"
    //   ),
    //   scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    // });

    // const authClient = await auth.getClient();
    // google.options({ auth: authClient });

    // // Fetch data for daily, weekly, and monthly ranges separately
    // const dateRanges = [
    //   { label: "daily", startDate: "yesterday", endDate: "yesterday" },
    //   { label: "weekly", startDate: "7daysAgo", endDate: "today" },
    //   { label: "monthly", startDate: "30daysAgo", endDate: "today" },
    // ];

    // const results = {};

    // for (const range of dateRanges) {
    //   const response = await analyticsDataClient.properties.runReport({
    //     property: "properties/491865263",
    //     requestBody: {
    //       dimensions: [{ name: "pagePath" }],
    //       metrics: [{ name: "activeUsers" }],
    //       dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
    //     },
    //   });

    //   results[range.label] = response.data;
    // }

    return "results";
  } catch (error) {
    throw error;
  }
};

module.exports = { getAnalyticsData };
