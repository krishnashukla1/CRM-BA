const LoginHour = require('../models/loginHoursSchema');
const Attendance = require('../models/Attendance');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
// Constants
const BREAK_LIMITS = {
  HALF_DAY: 70 * 60 * 1000, // 1h 10m
  ABSENT: 90 * 60 * 1000,   // 1h 30m
  AUTO_LOGIN: 70 * 60 * 1000
};

// Helper: Convert to IST
function getISTDateTime(date = new Date()) {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}

const SHIFT_START_HOUR = 17; // 5 PM IST

function getShiftDate(date = new Date()) {
  const istNow = getISTDateTime(date);
  const shiftDate = new Date(istNow);

  if (istNow.getHours() < SHIFT_START_HOUR) {
    shiftDate.setDate(shiftDate.getDate() - 1);
  }

  return shiftDate.toISOString().split("T")[0];
}

// Mark Login
exports.markLogin = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const shiftDate = getShiftDate();

    let record = await LoginHour.findOne({ employeeId, date: shiftDate });
    if (!record) {
      record = await LoginHour.create({
        employeeId,
        date: shiftDate,
        loginTime: new Date(),
        breaks: []
      });
    }

    res.status(200).json(record);
  } catch (err) {
    console.error("Login tracking error:", err);
    res.status(500).json({ message: "Failed to mark login" });
  }
};


exports.markLogout = async (req, res) => {
  try {
    console.log('markLogout called with:', req.body);
    const { employeeId } = req.body;
    
    // Get current time in IST
    const istNow = dayjs().tz('Asia/Kolkata');
    console.log('Current IST time:', istNow.format());
    
    // Calculate shift date (5 PM to next day 4:59 PM)
    let shiftDate = istNow;
    if (istNow.hour() < 17) { // Before 5 PM IST
      shiftDate = istNow.subtract(1, 'day');
    }
    shiftDate = shiftDate.format('YYYY-MM-DD');
    
    console.log('Calculated shift date:', shiftDate);

    const record = await LoginHour.findOneAndUpdate(
      { employeeId, date: shiftDate },
      { logoutTime: new Date() },
      { new: true }
    );

    console.log('Updated record:', record);
    
    if (!record) {
      console.log('No login record found for shift date:', shiftDate);
      return res.status(404).json({ 
        message: "No login record found for this shift",
        details: {
          currentIST: istNow.format(),
          calculatedShiftDate: shiftDate
        }
      });
    }

    res.status(200).json(record);
  } catch (err) {
    console.error("Logout tracking error:", err);
    res.status(500).json({ 
      message: "Failed to mark logout",
      error: err.message 
    });
  }
};

exports.startBreak = async (req, res) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ message: "Employee ID is required" });
    }

    const shiftDate = getShiftDate();
    const record = await LoginHour.findOne({ employeeId, date: shiftDate });
    if (!record) {
      return res.status(404).json({ message: "Login record not found for today" });
    }

    const newBreak = {
      start: new Date(),
      autoEndScheduled: false
    };

    record.breaks.push(newBreak);
    await record.save();

    res.json({
      success: true,
      message: "Break started successfully",
      record
    });
  } catch (err) {
    console.error("Start break error:", err);
    res.status(500).json({ message: "Failed to start break" });
  }
};

exports.endBreak = async (req, res) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ message: "Employee ID is required" });
    }

    const shiftDate = getShiftDate();
    const record = await LoginHour.findOne({ employeeId, date: shiftDate });

    if (!record) {
      return res.status(404).json({ message: "No attendance record found" });
    }

    if (record.breaks.length === 0) {
      return res.status(400).json({
        message: "No breaks recorded",
        hasBreaks: false
      });
    }

    const activeBreak = record.breaks.find(b => !b.end);
    if (!activeBreak) {
      return res.status(400).json({
        message: "No active break to end",
        hasBreaks: true
      });
    }

    activeBreak.end = new Date();
    await record.save();

    await checkBreakLimits(employeeId, shiftDate);

    res.json({
      success: true,
      message: "Break ended successfully",
      record,
      endedBreak: activeBreak
    });
  } catch (err) {
    console.error("End break error:", err);
    res.status(500).json({
      message: "Failed to end break",
      error: err.message
    });
  }
};

//------------------------test above-----------------

// 🔧 Utility Functions

function calculateTotalBreakTime(breaks) {
  return breaks.reduce((total, b) => {
    const start = new Date(b.start);
    const end = b.end ? new Date(b.end) : new Date();
    return total + (end - start);
  }, 0);
}

function calculateBreakStatus(breaks) {
  let breakDurationMs = 0;
  let isOnBreak = false;

  if (Array.isArray(breaks)) {
    for (const b of breaks) {
      if (b.start && b.end) {
        breakDurationMs += new Date(b.end) - new Date(b.start);
      } else if (b.start && !b.end) {
        breakDurationMs += new Date() - new Date(b.start);
        isOnBreak = true;
      }
    }
  }

  return { breakDurationMs, isOnBreak };
}

function formatMilliseconds(ms) {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

async function checkBreakLimits(employeeId, date) {
  try {
    const record = await LoginHour.findOne({ employeeId, date });
    if (!record) return;

    const totalBreakMs = calculateTotalBreakTime(record.breaks);
    let newStatus = null;

    if (totalBreakMs >= BREAK_LIMITS.ABSENT) {
      newStatus = "Absent";
    } else if (totalBreakMs >= BREAK_LIMITS.HALF_DAY) {
      newStatus = "Half-Day";
    }

    if (newStatus) {
      await Attendance.findOneAndUpdate(
        { employeeId, date },
        { status: newStatus },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error("Error checking break limits:", err);
  }
}


// =========with break worked hour==============
exports.getTodayStats = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const shiftDate = getShiftDate();

    const record = await LoginHour.findOne({ employeeId, date: shiftDate });
    if (!record) {
      return res.json({
        workedHoursToday: 0,
        totalWorkedWithBreak: 0,   // new field
        totalBreaksToday: 0,
        totalBreakTimeToday: "00:00:00",
        isOnBreak: false,
        breakStatus: "normal"
      });
    }

    const login = new Date(record.loginTime);
    const logout = record.logoutTime ? new Date(record.logoutTime) : new Date();

    const { breakDurationMs, isOnBreak } = calculateBreakStatus(record.breaks);
    const totalBreakMs = calculateTotalBreakTime(record.breaks);

    let breakStatus = "normal";
    if (totalBreakMs >= BREAK_LIMITS.ABSENT) breakStatus = "absent";
    else if (totalBreakMs >= BREAK_LIMITS.HALF_DAY) breakStatus = "half-day";

    // 🕐 Pure worked hours (without break)
    const workedMs = logout - login - breakDurationMs;
    const workedHoursToday = +(workedMs / (1000 * 60 * 60)).toFixed(2);

    // 🕐 Worked + break = total login duration
    const totalWorkedWithBreak = +((logout - login) / (1000 * 60 * 60)).toFixed(2);

    res.json({
      workedHoursToday,
      totalWorkedWithBreak,   // 👈 added here
      totalBreaksToday: record.breaks.length,
      totalBreakTimeToday: formatMilliseconds(breakDurationMs),
      isOnBreak,
      breakStatus,
      remainingBreakTime: formatMilliseconds(BREAK_LIMITS.HALF_DAY - totalBreakMs)
    });
  } catch (err) {
    console.error("Error in getTodayStats:", err);
    res.status(500).json({ message: "Failed to fetch today's stats" });
  }
};



// Get all login hours with employee details
exports.getAllLoginHours = async (req, res) => {
  try {
    const loginHours = await LoginHour.find()
      .populate('employeeId', 'name email') // Only fetch name/email from Employee
      .sort({ date: -1, loginTime: -1 }); // Latest first

    res.status(200).json(loginHours);
  } catch (error) {
    console.error('Error fetching login hours:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



//===============================time zone--------------

// const LoginHour = require('../models/loginHoursSchema');
// const Attendance = require('../models/Attendance');
// const dayjs = require('dayjs');
// const utc = require('dayjs/plugin/utc');
// const timezone = require('dayjs/plugin/timezone');

// // Extend dayjs with plugins
// dayjs.extend(utc);
// dayjs.extend(timezone);

// // Constants
// const BREAK_LIMITS = {
//   HALF_DAY: 70 * 60 * 1000, // 1h 10m
//   ABSENT: 90 * 60 * 1000,   // 1h 30m
//   AUTO_LOGIN: 70 * 60 * 1000
// };

// // Helper: Convert to IST
// function getISTDateTime(date = new Date()) {
//   return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
// }

// const SHIFT_START_HOUR = 17; // 5 PM IST

// function getShiftDate(date = new Date()) {
//   const istNow = getISTDateTime(date);
//   const shiftDate = new Date(istNow);

//   if (istNow.getHours() < SHIFT_START_HOUR) {
//     shiftDate.setDate(shiftDate.getDate() - 1);
//   }

//   return shiftDate.toISOString().split("T")[0];
// }

// // Mark Login
// exports.markLogin = async (req, res) => {
//   try {
//     const { employeeId, timeZone = "Asia/Kolkata" } = req.body;
//     const loginTime = dayjs.tz(new Date(), timeZone).tz("Asia/Kolkata").toDate();
//     const shiftDate = getShiftDate(loginTime);

//     let record = await LoginHour.findOne({ employeeId, date: shiftDate });
//     if (!record) {
//       record = await LoginHour.create({
//         employeeId,
//         date: shiftDate,
//         loginTime,
//         breaks: []
//       });
//     } else {
//       record.loginTime = loginTime;
//       await record.save();
//     }

//     res.status(200).json(record);
//   } catch (err) {
//     console.error("Login tracking error:", err);
//     res.status(500).json({ message: "Failed to mark login" });
//   }
// };

// // Mark Logout
// exports.markLogout = async (req, res) => {
//   try {
//     const { employeeId, timeZone = "Asia/Kolkata" } = req.body;
//     const istNow = dayjs().tz("Asia/Kolkata");
//     let shiftDate = istNow;
//     if (istNow.hour() < 17) shiftDate = istNow.subtract(1, 'day');
//     shiftDate = shiftDate.format('YYYY-MM-DD');

//     const logoutTime = dayjs.tz(new Date(), timeZone).tz("Asia/Kolkata").toDate();
//     const record = await LoginHour.findOneAndUpdate(
//       { employeeId, date: shiftDate },
//       { 
//         logoutTime,
//         workedSeconds: Math.floor((logoutTime - new Date(record.loginTime) - calculateTotalBreakTime(record.breaks)) / 1000)
//       },
//       { new: true }
//     );

//     if (!record) {
//       return res.status(404).json({ message: "No login record found for this shift" });
//     }

//     res.status(200).json(record);
//   } catch (err) {
//     console.error("Logout tracking error:", err);
//     res.status(500).json({ message: "Failed to mark logout" });
//   }
// };

// // Start Break
// exports.startBreak = async (req, res) => {
//   try {
//     const { employeeId, timeZone = "Asia/Kolkata" } = req.body;
//     const shiftDate = getShiftDate();
//     const record = await LoginHour.findOne({ employeeId, date: shiftDate });
//     if (!record) return res.status(404).json({ message: "Login record not found for today" });

//     const newBreak = {
//       start: dayjs.tz(new Date(), timeZone).tz("Asia/Kolkata").toDate(),
//       autoEndScheduled: false
//     };

//     record.breaks.push(newBreak);
//     await record.save();

//     res.json({ success: true, message: "Break started successfully", record });
//   } catch (err) {
//     console.error("Start break error:", err);
//     res.status(500).json({ message: "Failed to start break" });
//   }
// };

// // End Break
// exports.endBreak = async (req, res) => {
//   try {
//     const { employeeId, timeZone = "Asia/Kolkata" } = req.body;
//     const shiftDate = getShiftDate();
//     const record = await LoginHour.findOne({ employeeId, date: shiftDate });

//     if (!record) return res.status(404).json({ message: "No attendance record found" });
//     const activeBreak = record.breaks.find(b => !b.end);
//     if (!activeBreak) return res.status(400).json({ message: "No active break to end" });

//     activeBreak.end = dayjs.tz(new Date(), timeZone).tz("Asia/Kolkata").toDate();
//     await record.save();
//     await checkBreakLimits(employeeId, shiftDate);

//     res.json({ success: true, message: "Break ended successfully", record, endedBreak: activeBreak });
//   } catch (err) {
//     console.error("End break error:", err);
//     res.status(500).json({ message: "Failed to end break" });
//   }
// };

// // Get Today Stats
// exports.getTodayStats = async (req, res) => {
//   try {
//     const { employeeId } = req.params;
//     const shiftDate = getShiftDate();

//     const record = await LoginHour.findOne({ employeeId, date: shiftDate });
//     if (!record) {
//       return res.json({
//         workedHoursToday: 0,
//         totalWorkedWithBreak: 0,
//         totalBreaksToday: 0,
//         totalBreakTimeToday: "00:00:00",
//         isOnBreak: false,
//         breakStatus: "normal"
//       });
//     }

//     const login = new Date(record.loginTime); // Stored in IST via markLogin
//     const logout = record.logoutTime ? new Date(record.logoutTime) : getISTDateTime();

//     const { breakDurationMs, isOnBreak } = calculateBreakStatus(record.breaks);
//     const totalBreakMs = calculateTotalBreakTime(record.breaks);

//     let breakStatus = "normal";
//     if (totalBreakMs >= BREAK_LIMITS.ABSENT) breakStatus = "absent";
//     else if (totalBreakMs >= BREAK_LIMITS.HALF_DAY) breakStatus = "half-day";

//     const workedMs = logout - login - breakDurationMs;
//     const workedSeconds = Math.floor(workedMs / 1000);
//     const workedHoursToday = +(workedMs / (1000 * 60 * 60)).toFixed(2);
//     const totalWorkedSeconds = Math.floor((logout - login) / 1000);
//     const totalWorkedWithBreak = +(totalWorkedSeconds / 3600).toFixed(2);

//     res.json({
//       workedSeconds,
//       workedHoursToday,
//       totalWorkedWithBreak,
//       totalBreaksToday: record.breaks.length,
//       totalBreakTimeToday: formatMilliseconds(breakDurationMs),
//       isOnBreak,
//       breakStatus,
//       remainingBreakTime: formatMilliseconds(BREAK_LIMITS.HALF_DAY - totalBreakMs)
//     });
//   } catch (err) {
//     console.error("Error in getTodayStats:", err);
//     res.status(500).json({ message: "Failed to fetch today's stats" });
//   }
// };

// // Get All Login Hours
// exports.getAllLoginHours = async (req, res) => {
//   try {
//     const loginHours = await LoginHour.find()
//       .populate('employeeId', 'name email') // Only fetch name/email from Employee
//       .sort({ date: -1, loginTime: -1 }); // Latest first

//     res.status(200).json(loginHours);
//   } catch (error) {
//     console.error('Error fetching login hours:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Utility Functions
// function calculateTotalBreakTime(breaks) {
//   return breaks.reduce((total, b) => {
//     const start = new Date(b.start);
//     const end = b.end ? new Date(b.end) : new Date();
//     return total + (end - start);
//   }, 0);
// }

// function calculateBreakStatus(breaks) {
//   let breakDurationMs = 0;
//   let isOnBreak = false;

//   if (Array.isArray(breaks)) {
//     for (const b of breaks) {
//       if (b.start && b.end) {
//         breakDurationMs += new Date(b.end) - new Date(b.start);
//       } else if (b.start && !b.end) {
//         breakDurationMs += new Date() - new Date(b.start);
//         isOnBreak = true;
//       }
//     }
//   }

//   return { breakDurationMs, isOnBreak };
// }

// function formatMilliseconds(ms) {
//   const seconds = Math.floor(ms / 1000);
//   const hours = Math.floor(seconds / 3600);
//   const minutes = Math.floor((seconds % 3600) / 60);
//   const secs = seconds % 60;

//   return `${hours.toString().padStart(2, "0")}:${minutes
//     .toString()
//     .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
// }

// async function checkBreakLimits(employeeId, date) {
//   try {
//     const record = await LoginHour.findOne({ employeeId, date });
//     if (!record) return;

//     const totalBreakMs = calculateTotalBreakTime(record.breaks);
//     let newStatus = null;

//     if (totalBreakMs >= BREAK_LIMITS.ABSENT) {
//       newStatus = "Absent";
//     } else if (totalBreakMs >= BREAK_LIMITS.HALF_DAY) {
//       newStatus = "Half-Day";
//     }

//     if (newStatus) {
//       await Attendance.findOneAndUpdate(
//         { employeeId, date },
//         { status: newStatus },
//         { upsert: true }
//       );
//     }
//   } catch (err) {
//     console.error("Error checking break limits:", err);
//   }
// }