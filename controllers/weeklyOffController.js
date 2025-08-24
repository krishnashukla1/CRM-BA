const WeeklyOff = require('../models/weeklyOff');



// GET all weekly offs
exports.getAllWeeklyOffs = async (req, res) => {
  try {
    const offs = await WeeklyOff.find().populate('employeeId', 'name role');
    res.json(offs);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching all weekly offs' });
  }
};


// GET weekly offs by employeeId
exports.getWeeklyOffsByEmployee = async (req, res) => {
  const { employeeId } = req.params;
  try {
    const offs = await WeeklyOff.find({ employeeId });
    res.json(offs);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching weekly offs' });
  }
};

// POST create new weekly off
// exports.createWeeklyOff = async (req, res) => {
//   const { employeeId, dayOfWeek, reason } = req.body;
//   try {
//     const created = await WeeklyOff.create({ employeeId, dayOfWeek, reason });
//     res.status(201).json(created);
//   } catch (err) {
//     res.status(500).json({ message: 'Error creating weekly off' });
//   }
// };


exports.createWeeklyOff = async (req, res) => {
  const { employeeId, date, reason } = req.body;
  try {
    const created = await WeeklyOff.create({ employeeId, date, reason });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: 'Error creating weekly off', error: err.message });
  }
};



// PUT update weekly off by employeeId
// exports.updateWeeklyOffByEmployeeId = async (req, res) => {
//   const { employeeId } = req.params;
//   const { dayOfWeek, reason } = req.body;
//   try {
//     const updated = await WeeklyOff.findOneAndUpdate(
//       { employeeId },
//       { dayOfWeek, reason },
//       { new: true }
//     );
//     if (!updated) return res.status(404).json({ message: 'Weekly off not found' });
//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ message: 'Error updating weekly off' });
//   }
// };

// DELETE weekly off by employeeId
// exports.deleteWeeklyOffByEmployeeId = async (req, res) => {
//   const { employeeId } = req.params;
//   try {
//     const deleted = await WeeklyOff.findOneAndDelete({ employeeId });
//     if (!deleted) return res.status(404).json({ message: 'Weekly off not found' });
//     res.json({ message: 'Weekly off deleted' });
//   } catch (err) {
//     res.status(500).json({ message: 'Error deleting weekly off' });
//   }
// };

// const mongoose = require('mongoose');

exports.deleteWeeklyOffByEmployeeId = async (req, res) => {
  const { employeeId } = req.params;

  console.log("Received delete request for employeeId:", employeeId);

  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return res.status(400).json({ message: 'Invalid employeeId format' });
  }

  try {
    const deleted = await WeeklyOff.findOneAndDelete({ employeeId });
    if (!deleted) return res.status(404).json({ message: 'Weekly off not found' });
    res.json({ message: 'Weekly off deleted successfully' });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: 'Server error deleting weekly off', error: err.message });
  }
};





exports.deleteWeeklyOffById = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await WeeklyOff.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Weekly off not found' });
    res.json({ message: 'Weekly off deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting weekly off', error: err.message });
  }
};

