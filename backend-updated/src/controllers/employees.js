const Employee = require('../models/Employee');

exports.list = async (req, res) => {
  const docs = await Employee.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
  res.json(docs);
};
exports.create = async (req, res) => {
  const doc = await Employee.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(doc);
};
exports.update = async (req, res) => {
  const doc = await Employee.findOneAndUpdate({ _id: req.params.id, createdBy: req.user._id }, req.body, { new: true });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
};
exports.remove = async (req, res) => {
  const doc = await Employee.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
};
