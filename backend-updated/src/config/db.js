const mongoose = require("mongoose");

module.exports = async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log("MongoDB connected");
  } catch (error) {
    const localMongoUri = /^mongodb:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\//i;

    if (
      process.env.NODE_ENV !== "production" &&
      localMongoUri.test(process.env.MONGO_URI || "")
    ) {
      process.env.USE_LOCAL_FILE_DB = "true";
      console.warn(
        "MongoDB is unavailable; using data/dev-users.json for local authentication."
      );
      return;
    }

    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};
