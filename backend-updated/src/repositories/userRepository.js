const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const User = require("../models/User");

function getLocalDatabasePath() {
  return process.env.LOCAL_USER_DB_PATH
    ? path.resolve(process.env.LOCAL_USER_DB_PATH)
    : path.resolve(__dirname, "../../data/dev-users.json");
}

function usesLocalFileDatabase() {
  return process.env.USE_LOCAL_FILE_DB === "true";
}

async function readLocalUsers() {
  const localDatabasePath = getLocalDatabasePath();
  try {
    return JSON.parse(await fs.readFile(localDatabasePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeLocalUsers(users) {
  const localDatabasePath = getLocalDatabasePath();
  await fs.mkdir(path.dirname(localDatabasePath), { recursive: true });
  await fs.writeFile(localDatabasePath, JSON.stringify(users, null, 2), "utf8");
}

async function findByEmail(email) {
  if (!usesLocalFileDatabase()) {
    return User.findOne({ email });
  }

  const users = await readLocalUsers();
  return users.find((user) => user.email === email) || null;
}

async function findById(userId) {
  if (!usesLocalFileDatabase()) return User.findById(userId);
  const users = await readLocalUsers();
  return users.find((user) => String(user._id) === String(userId)) || null;
}

async function create(userData) {
  if (!usesLocalFileDatabase()) {
    const user = new User(userData);
    await user.save();
    return user;
  }

  const users = await readLocalUsers();
  if (users.some((user) => user.email === userData.email)) {
    const error = new Error("Email already registered");
    error.code = 11000;
    throw error;
  }

  const now = new Date().toISOString();
  const user = {
    _id: crypto.randomUUID(),
    ...userData,
    onboardingComplete: false,
    onboardingData: null,
    createdAt: now,
    updatedAt: now,
  };

  users.push(user);
  await writeLocalUsers(users);
  return user;
}

async function updateById(userId, changes) {
  if (!usesLocalFileDatabase()) {
    return User.findByIdAndUpdate(userId, changes, { new: true, runValidators: true });
  }
  const users = await readLocalUsers();
  const index = users.findIndex((user) => String(user._id) === String(userId));
  if (index < 0) return null;
  users[index] = { ...users[index], ...changes, updatedAt: new Date().toISOString() };
  await writeLocalUsers(users);
  return users[index];
}

async function getPoints(userId) {
  const user = await findById(userId);
  if (!user) return null;
  return {
    points: Number(user.welxPoints || 0),
    activities: [...(user.pointActivities || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  };
}

async function awardPoints(userId, activity) {
  if (!usesLocalFileDatabase()) {
    const updated = await User.findOneAndUpdate(
      { _id: userId, "pointActivities.eventId": { $ne: activity.eventId } },
      {
        $inc: { welxPoints: activity.points },
        $push: { pointActivities: { $each: [activity], $slice: -100 } },
      },
      { new: true, runValidators: true },
    );
    if (updated) return { points: Number(updated.welxPoints || 0), awarded: activity.points, activity };
    const existing = await findById(userId);
    return existing ? { points: Number(existing.welxPoints || 0), awarded: 0, activity: null } : null;
  }

  const users = await readLocalUsers();
  const index = users.findIndex((user) => String(user._id) === String(userId));
  if (index < 0) return null;
  const activities = users[index].pointActivities || [];
  if (activities.some((item) => item.eventId === activity.eventId)) {
    return { points: Number(users[index].welxPoints || 0), awarded: 0, activity: null };
  }
  users[index].welxPoints = Number(users[index].welxPoints || 0) + activity.points;
  users[index].pointActivities = [...activities, activity].slice(-100);
  users[index].updatedAt = new Date().toISOString();
  await writeLocalUsers(users);
  return { points: users[index].welxPoints, awarded: activity.points, activity };
}

module.exports = { findByEmail, findById, create, updateById, getPoints, awardPoints, usesLocalFileDatabase };
