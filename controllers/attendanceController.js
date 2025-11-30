const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const WeeklyOff = require('../models/weeklyOff');
const Leave = require('../models/Leave');
// Top of your file
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

exports.addAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, reason } = req.body; // ✅ accept reason

    const existing = await Attendance.findOne({ employeeId, date });
    if (existing)
      return res.status(400).json({ message: 'Attendance already marked for this date.' });

    const attendance = await Attendance.create({
      employeeId,
      date,
      status,
      // reason: status === 'Leave' ? reason : '', // ✅ only save reason for leave
      reason: status !== 'Present' ? reason : '',  //reason only for Absent and Leave

    });

    const populated = await attendance.populate('employeeId', 'name email role');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
