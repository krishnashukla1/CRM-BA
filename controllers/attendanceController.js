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


exports.getAllAttendance = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, page = 1, perPage = 100, summaryOnly = false } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(perPage);

    // 🔹 Filter for DB attendance
    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // 🔹 Get raw attendance
    const dbRecords = await Attendance.find(filter)
      .populate('employeeId', 'name email role')
      .sort({ date: -1 });

    // 🔹 Employees list
    const employees = employeeId
      ? [await Employee.findById(employeeId)]
      : await Employee.find();

    // 🔹 Get weekly offs + leaves
    const weeklyOffs = await WeeklyOff.find(
      employeeId ? { employeeId } : {}
    ).populate('employeeId', 'name role');

    const leaves = await Leave.find(
      employeeId ? { employeeId } : {}
    ).populate('employeeId', 'name email role');

    let allRecords = [];
    const employeeStats = {}; // To store employee-wise statistics
    const overallStats = { // To store overall statistics
      totalPresent: 0,
      totalAbsent: 0,
      totalLeave: 0,
      totalWeeklyOff: 0
    };

    for (const emp of employees) {
      if (!emp) continue;

      // Initialize employee stats
      employeeStats[emp._id] = {
        employeeId: emp._id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        present: 0,
        absent: 0,
        leave: 0,
        weeklyOff: 0
      };

      const firstDate = startDate ? dayjs(startDate) : dayjs().startOf('month');
      const lastDate = endDate ? dayjs(endDate) : dayjs();

      // ✅ Map attendance
      const empRecords = dbRecords.filter(
        r => r.employeeId && r.employeeId._id.toString() === emp._id.toString()
      );
      const recordMap = {};
      empRecords.forEach(r => {
        recordMap[dayjs(r.date).format('YYYY-MM-DD')] = r;
      });

      // ✅ Map weekly offs
      const empWeeklyOffs = weeklyOffs.filter(
        w => w.employeeId && w.employeeId._id.toString() === emp._id.toString()
      );
      const weeklyOffMap = {};
      empWeeklyOffs.forEach(w => {
        weeklyOffMap[dayjs(w.date).format('YYYY-MM-DD')] = w;
      });

      // ✅ Map leaves (range based)
      const empLeaves = leaves.filter(
        l => l.employeeId && l.employeeId._id.toString() === emp._id.toString()
      );

      // ✅ Loop dates
      let current = firstDate;
      while (current.isBefore(lastDate) || current.isSame(lastDate)) {
        const dateKey = current.format('YYYY-MM-DD');

        if (recordMap[dateKey]) {
          // Real attendance record exists
          const record = recordMap[dateKey];
          allRecords.push(record);
          
          // Update stats
          if (record.status === 'Present') {
            employeeStats[emp._id].present++;
            overallStats.totalPresent++;
          } else if (record.status === 'Absent') {
            employeeStats[emp._id].absent++;
            overallStats.totalAbsent++;
          } else if (record.status === 'Leave') {
            employeeStats[emp._id].leave++;
            overallStats.totalLeave++;
          } else if (record.status === 'Weekly Off') {
            employeeStats[emp._id].weeklyOff++;
            overallStats.totalWeeklyOff++;
          }
        } else if (weeklyOffMap[dateKey]) {
          // Weekly off
          const virtualRecord = {
            _id: `virtual-weeklyoff-${emp._id}-${dateKey}`,
            employeeId: {
              _id: emp._id,
              name: emp.name,
              role: emp.role,
              email: emp.email,
            },
            date: current.toDate(),
            status: 'Weekly Off',
            reason: weeklyOffMap[dateKey].reason || 'Weekly Off',
            isVirtual: true,
          };
          allRecords.push(virtualRecord);
          
          // Update stats
          employeeStats[emp._id].weeklyOff++;
          overallStats.totalWeeklyOff++;
        } else {
          // Check if date falls in any leave range
          const leaveFound = empLeaves.find(l =>
            current.isAfter(dayjs(l.from).subtract(1, 'day')) &&
            current.isBefore(dayjs(l.to).add(1, 'day'))
          );

          if (leaveFound) {
            const virtualRecord = {
              _id: `virtual-leave-${emp._id}-${dateKey}`,
              employeeId: {
                _id: emp._id,
                name: emp.name,
                role: emp.role,
                email: emp.email,
              },
              date: current.toDate(),
              status: 'Leave',
              reason: leaveFound.reason || 'Leave Applied',
              isVirtual: true,
            };
            allRecords.push(virtualRecord);
            
            // Update stats
            employeeStats[emp._id].leave++;
            overallStats.totalLeave++;
          } else {
            const virtualRecord = {
              _id: `virtual-absent-${emp._id}-${dateKey}`,
              employeeId: {
                _id: emp._id,
                name: emp.name,
                role: emp.role,
                email: emp.email,
              },
              date: current.toDate(),
              status: 'Absent',
              reason: 'No record found',
              isVirtual: true,
            };
            allRecords.push(virtualRecord);
            
            // Update stats
            employeeStats[emp._id].absent++;
            overallStats.totalAbsent++;
          }
        }

        current = current.add(1, 'day');
      }
    }

    // ✅ Sort latest first
    allRecords = allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

    // ✅ Paginate
    const totalCount = allRecords.length;
    const totalPages = Math.ceil(totalCount / perPage);
    const paginatedRecords = allRecords.slice(skip, skip + parseInt(perPage));

    // Convert employeeStats object to array
    const employeeStatsArray = Object.values(employeeStats);

    // Return response based on whether summary is requested
    if (summaryOnly === 'true') {
      res.status(200).json({
        status: 'success',
        message: 'Attendance summary fetched',
        overallStats,
        employeeStats: employeeStatsArray,
        totalEmployees: employeeStatsArray.length
      });
    } else {
      res.status(200).json({
        status: 'success',
        message: 'Attendance records fetched (with Absent, Weekly Off, Leave)',
        currentPage: parseInt(page),
        perPage: parseInt(perPage),
        totalPages,
        totalCount,
        overallStats,
        employeeStats: employeeStatsArray,
        data: paginatedRecords,
      });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// New endpoint to get only the summary
exports.getAttendanceSummary = async (req, res) => {
  try {
    // Reuse the getAllAttendance function with summaryOnly flag
    req.query.summaryOnly = 'true';
    return exports.getAllAttendance(req, res);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
//--------------------------------------------------
// Get attendance records by employee ID
exports.getAttendanceByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const records = await Attendance.find({ employeeId })
      .populate('employeeId', 'name email role')
      .sort({ date: -1 });

    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Enhanced update function to handle Weekly Off properly
exports.updateAttendanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if this is a virtual record (created by the system)
    if (id.startsWith('virtual-')) {
      const parts = id.split('-');
      const recordType = parts[1]; // weeklyoff, leave, or absent
      const employeeId = parts[2];
      const dateStr = parts[3];
      
      // Parse the date from the string format (YYYY-MM-DD)
      const date = new Date(dateStr);
      
      // Check if an attendance record already exists for this date and employee
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const existingRecord = await Attendance.findOne({
        employeeId: employeeId,
        date: {
          $gte: startOfDay,
          $lt: endOfDay
        }
      });
      
      if (existingRecord) {
        // Update the existing record
        existingRecord.status = status;
        // If changing from Weekly Off to something else, clear the isWeeklyOff flag
        if (existingRecord.isWeeklyOff && status !== 'Weekly Off') {
          existingRecord.isWeeklyOff = false;
        }
        const updated = await existingRecord.save();
        await updated.populate('employeeId', 'name email role');
        
        return res.json(updated);
      } else {
        // Create a new attendance record
        const newRecord = new Attendance({
          employeeId: employeeId,
          date: date,
          status: status,
          isWeeklyOff: status === 'Weekly Off',
          reason: `Updated from virtual ${recordType} record`
        });
        
        const saved = await newRecord.save();
        await saved.populate('employeeId', 'name email role');
        
        return res.json(saved);
      }
    } else {
      // Regular attendance record update
      const updateData = { status };
      
      // If changing to/from Weekly Off, update the isWeeklyOff flag
      if (status === 'Weekly Off') {
        updateData.isWeeklyOff = true;
      } else {
        // If changing from Weekly Off to another status, clear the flag
        updateData.isWeeklyOff = false;
      }
      
      const updated = await Attendance.findByIdAndUpdate(
        id, 
        updateData, 
        { new: true, runValidators: true }
      ).populate('employeeId', 'name email role');

      if (!updated) {
        return res.status(404).json({ message: 'Attendance record not found' });
      }

      return res.json(updated);
    }
  } catch (error) {
    res.status(400).json({ 
      message: 'Failed to update attendance status', 
      error: error.message 
    });
  }
};



exports.markAttendance = async (req, res) => {
  try {
    console.log('markAttendance called with:', req.body);
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    // Current IST time using dayjs
    const istNow = dayjs().tz('Asia/Kolkata');

    // Attendance window start: 9:00 PM IST of the previous or same day
    // let windowStart = istNow.hour() < 21
    //   ? istNow.subtract(1, 'day').set('hour', 21).set('minute', 0).set('second', 0).set('millisecond', 0)
    //   : istNow.set('hour', 21).set('minute', 0).set('second', 0).set('millisecond', 0);

    // // Attendance window end: next day 8:59:59 PM IST
    // let windowEnd = windowStart.add(23, 'hour').add(59, 'minute').add(59, 'second').add(999, 'millisecond');



    // Attendance window start: 5:00 PM IST
    let windowStart = istNow.hour() < 17
      ? istNow.subtract(1, 'day').set('hour', 17).set('minute', 0).set('second', 0).set('millisecond', 0)
      : istNow.set('hour', 17).set('minute', 0).set('second', 0).set('millisecond', 0);

    // Attendance window end: next day 4:59:59 PM IST
    let windowEnd = windowStart.add(23, 'hour').add(59, 'minute').add(59, 'second').add(999, 'millisecond');


    // Convert to UTC for MongoDB query
    const utcWindowStart = windowStart.utc().toDate();
    const utcWindowEnd = windowEnd.utc().toDate();

    // Check if attendance is already marked within the window
    const existing = await Attendance.findOne({
      employeeId,
      createdAt: {
        $gte: utcWindowStart,
        $lte: utcWindowEnd
      }
    });

    if (existing) {
      return res.status(200).json({ message: '✅ Attendance already marked' });
    }

    // Mark new attendance
    const attendance = new Attendance({
      employeeId,
      date: istNow.format('YYYY-MM-DD'), // ✅ IST date only
      status: 'Present',
    });

    await attendance.save();
    return res.status(201).json({ message: '✅ Attendance marked successfully', data: attendance });

  } catch (err) {
    console.error('❌ Error in markAttendance:', err);
    return res.status(500).json({ message: 'Server error while marking attendance', error: err.message });
  }
};

//attendance “day” to run from 5:00 PM IST today → 4:59:59 PM IST tomorrow 

exports.checkTodayAttendance = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) return res.status(401).json({ message: 'Unauthorized: No email in token' });

    const employee = await Employee.findOne({ email: userEmail });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // const now = new Date();

    // // ⏰ Calculate 9:00 PM today
    // const windowStart = new Date(now);
    // if (now.getHours() < 21) {
    //   // Before 9 PM, use previous day 9 PM
    //   windowStart.setDate(now.getDate() - 1);
    // }
    // windowStart.setHours(21, 0, 0, 0); // 9:00 PM

    // // ⏰ Calculate 8:59:59 PM next day
    // const windowEnd = new Date(windowStart);
    // windowEnd.setDate(windowStart.getDate() + 1);
    // windowEnd.setHours(20, 59, 59, 999); // 8:59:59 PM next day

    // // Check attendance within window
    // const attendance = await Attendance.findOne({
    //   employeeId: employee._id,
    //   createdAt: {
    //     $gte: windowStart,
    //     $lte: windowEnd
    //   }
    // });



    const now = new Date();

    // Convert current UTC time to IST
    const istOffset = 5.5 * 60 * 60000; // 5.5 hours in ms
    const istNow = new Date(now.getTime() + istOffset);

    // ⏰ Calculate 9:00 PM IST of today (or previous day if current time is before 9 PM IST)
    const windowStartIST = new Date(istNow);

    // if (istNow.getHours() < 21) {
    //   windowStartIST.setDate(istNow.getDate() - 1);
    // }
    // windowStartIST.setHours(21, 0, 0, 0); // 9:00 PM IST

    if (istNow.getHours() < 17) {
      windowStartIST.setDate(istNow.getDate() - 1);
    }
    windowStartIST.setHours(17, 0, 0, 0); // 5:00 PM IST




    // ⏰ Calculate 8:59:59 PM IST of next day
    const windowEndIST = new Date(windowStartIST);
    // windowEndIST.setDate(windowStartIST.getDate() + 1);
    // windowEndIST.setHours(20, 59, 59, 999); // 8:59:59 PM IST

    // ⏰ Calculate 4:59:59 PM IST of next day
    windowEndIST.setDate(windowStartIST.getDate() + 1);
    windowEndIST.setHours(16, 59, 59, 999); // 4:59:59 PM IST

    // Now convert windowStartIST and windowEndIST back to UTC for MongoDB query
    const windowStartUTC = new Date(windowStartIST.getTime() - istOffset);
    const windowEndUTC = new Date(windowEndIST.getTime() - istOffset);

    // Check attendance in UTC range
    const attendance = await Attendance.findOne({
      employeeId: employee._id,
      createdAt: {
        $gte: windowStartUTC,
        $lte: windowEndUTC
      }
    });

    res.status(200).json({ marked: !!attendance });
    console.log("IST now:", istNow.toISOString());
    console.log("Window Start (UTC):", windowStartUTC.toISOString());
    console.log("Window End (UTC):", windowEndUTC.toISOString());

  } catch (err) {
    console.error('Error in checkTodayAttendance:', err);
    res.status(500).json({ message: 'Error checking attendance window' });
  }
};

