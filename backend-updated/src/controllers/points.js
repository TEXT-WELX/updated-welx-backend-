const { getPointsSummary, awardUserPoints } = require("../services/welxPoints");

exports.me = async (req, res) => {
  try {
    const summary = await getPointsSummary(String(req.user._id));
    return summary ? res.json(summary) : res.status(404).json({ message: "User not found" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.award = async (req, res) => {
  try {
    const result = await awardUserPoints(String(req.user._id), req.body || {});
    return result ? res.json(result) : res.status(404).json({ message: "User not found" });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
};
