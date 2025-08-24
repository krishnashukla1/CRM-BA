/*
const Leave = require('../models/Leave');

exports.getAllLeaves = async (req, res) => {
  try {
    const { employeeId, status, page = 1, perPage = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(perPage);

    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;

    const totalCount = await Leave.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / perPage);

    const leaves = await Leave.find(filter)
      .populate('employeeId', 'name email role')
      .sort({ from: -1 })
      .skip(skip)
      .limit(parseInt(perPage));

    res.status(200).json({
      status: 'success',
      message: 'Leave records fetched',
      currentPage: parseInt(page),
      perPage: parseInt(perPage),
      totalPages,
      totalCount,
      data: leaves,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};


// exports.updateLeaveStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status, leaveType } = req.body;

//     const updateData = { status };
//     if (leaveType) updateData.leaveType = leaveType;

//     const updated = await Leave.findByIdAndUpdate(id, updateData, { new: true });
//     res.json(updated);
//   } catch (err) {
//     res.status(400).json({ message: 'Failed to update leave status' });
//   }
// };


// Update Leave Status + Sync Employee Leave Days
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params; // Leave ID
    const { status, leaveType } = req.body;

    const leave = await Leave.findById(id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Update leave fields
    leave.status = status;
    if (leaveType) leave.leaveType = leaveType;
    await leave.save();

    // If approved, update employee's usedDays and remainingDays
    if (status.toLowerCase() === 'approved') {
      const employee = await employee.findById(leave.employeeId);
      if (employee) {
        const totalUsed = employee.usedDays + leave.daysRequested;
        
        // Prevent exceeding quota
        if (totalUsed > employee.leaveQuota) {
          return res.status(400).json({
            message: `Cannot approve — would exceed quota (${employee.leaveQuota} days)`
          });
        }

        employee.usedDays = totalUsed;
        employee.remainingDays = employee.leaveQuota - totalUsed;
        await employee.save();
      }
    }

    // If rejected, do nothing to usedDays/remainingDays
    res.json({ status: 'success', data: leave });

  } catch (err) {
    res.status(400).json({ message: 'Failed to update leave status', error: err.message });
  }
};

exports.requestLeave = async (req, res) => {
  try {
    // const { employeeId, from, to, reason } = req.body;
    const { employeeId, from, to, reason, leaveType = 'Paid Leave' } = req.body;

    const documentPath = req.file ? req.file.filename : null;

    const leave = new Leave({
      employeeId,
      from,
      to,
      reason,
      leaveType,
        isPaid: leaveType === 'Paid Leave', // ✅ Add this line
      document: documentPath,
    });

    await leave.save();
    res.status(201).json({ message: 'Leave request submitted', leave });
  } catch (err) {
    console.error('Leave request failed:', err);
    res.status(500).json({ message: 'Server error submitting leave' });
  }
};

*/
//http://localhost:5000/uploads/documents/<filename>

//=================================================================

const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const dayjs = require('dayjs');
const moment = require('moment'); // for date handling



/**
 * Request Leave
 */
// exports.requestLeave = async (req, res) => {
//   try {
//     const { employeeId, from, to, reason, leaveType = 'Paid Leave' } = req.body;
//     const documentPath = req.file ? req.file.filename : null;

//     const leave = new Leave({
//       employeeId,
//       from,
//       to,
//       reason,
//       leaveType,
//       isPaid: leaveType === 'Paid Leave',
//       document: documentPath,
//       status: 'Pending',
//     });

//     await leave.save();

//     res.status(201).json({
//       status: 'success',
//       message: 'Leave request submitted successfully',
//       data: leave,
//     });
//   } catch (err) {
//     console.error('Leave request failed:', err);
//     res.status(500).json({ status: 'error', message: 'Server error submitting leave' });
//   }
// };

// ---------------
/*
1] Maximum 5 days at a time. If the requested leave is more than 5 days, return a message: 
"More than 5 days please contact HR."
2] Maximum 4 leave requests per employee per year. If the employee already requested 4 leaves in the current year, return: "Maximum 4 leave requests per year. Please contact HR."
*/

exports.requestLeave = async (req, res) => {
  try {
    const { employeeId, from, to, reason, leaveType = 'Paid Leave' } = req.body;
    const documentPath = req.file ? req.file.filename : null;

    // Calculate number of days
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const dayDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1; // include both from & to

    if (dayDiff > 5) {
      return res.status(400).json({
        status: 'fail',
        message: 'More than 5 days please contact HR.',
      });
    }

    // Count leaves requested by this employee in the current year
    const currentYear = new Date().getFullYear();
    const leaveCount = await Leave.countDocuments({
      employeeId,
      createdAt: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`),
      },
    });

    if (leaveCount >= 4) {
      return res.status(400).json({
        status: 'fail',
        message: 'Maximum 4 leave requests per year. Please contact HR.',
      });
    }

    // Create new leave
    const leave = new Leave({
      employeeId,
      from,
      to,
      reason,
      leaveType,
      isPaid: leaveType === 'Paid Leave',
      document: documentPath,
      status: 'Pending',
    });

    await leave.save();

    res.status(201).json({
      status: 'success',
      message: 'Leave request submitted successfully',
      data: leave,
    });
  } catch (err) {
    console.error('Leave request failed:', err);
    res.status(500).json({ status: 'error', message: 'Server error submitting leave' });
  }
};


/**
 * Update Leave Status (Approve / Reject)
 */
// exports.updateLeaveStatus = async (req, res) => {
//   try {
//     const { id } = req.params; // Leave ID
//     const { status } = req.body;

//     const leave = await Leave.findById(id);
//     if (!leave) {
//       return res.status(404).json({ status: 'error', message: 'Leave not found' });
//     }

//     leave.status = status;
//     await leave.save();

//     // ✅ Only update leave quota if approved and not already approved before
//     if (status === 'Approved' && leave._previousStatus !== 'Approved') {
//       const daysTaken = dayjs(leave.to).diff(dayjs(leave.from), 'day') + 1;

//       const employee = await Employee.findById(leave.employeeId);
//       if (employee) {
//         employee.usedDays += daysTaken;
//         employee.remainingDays = Math.max(employee.leaveQuota - employee.usedDays, 0);
//         await employee.save();
//       }
//     }

//     res.json({ status: 'success', message: 'Leave status updated', data: leave });
//   } catch (err) {
//     console.error('Error updating leave status:', err);
//     res.status(500).json({ status: 'error', message: 'Error updating leave status' });
//   }
// };


// exports.updateLeaveStatus = async (req, res) => {
//   try {
//     const { id } = req.params; // Leave ID
//     const { status } = req.body;

//     const leave = await Leave.findById(id);
//     if (!leave) {
//       return res.status(404).json({ status: 'error', message: 'Leave not found' });
//     }

//     const previousStatus = leave.status;
//     leave.status = status;
//     await leave.save();

//     // Only update leave quota if status changed to/from Approved
//     if (status === 'Approved' && previousStatus !== 'Approved') {
//       const daysTaken = dayjs(leave.to).diff(dayjs(leave.from), 'day') + 1;
//       await exports.incrementUsedDays(leave.employeeId, daysTaken);
//     } else if (previousStatus === 'Approved' && status !== 'Approved') {
//       const daysTaken = dayjs(leave.to).diff(dayjs(leave.from), 'day') + 1;
//       await exports.incrementUsedDays(leave.employeeId, -daysTaken);
//     }

//     res.json({ status: 'success', message: 'Leave status updated', data: leave });
//   } catch (err) {
//     console.error('Error updating leave status:', err);
//     res.status(500).json({ status: 'error', message: 'Error updating leave status' });
//   }
// };



exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params; // Leave ID
    const { status } = req.body;

    const leave = await Leave.findById(id);
    if (!leave) {
      return res.status(404).json({ status: 'error', message: 'Leave not found' });
    }

    const previousStatus = leave.status;
    leave.status = status;
    await leave.save();

    // Calculate number of leave days
    const daysTaken = dayjs(leave.to).diff(dayjs(leave.from), 'day') + 1;

    if (status === 'Approved' && previousStatus !== 'Approved') {
      let employee = await Employee.findById(leave.employeeId);

      // If employee doesn't exist, create new
      if (!employee) {
        employee = new Employee({
          _id: leave.employeeId, // assuming leave.employeeId is ObjectId of employee
          name: leave.employeeName || 'Unknown', // adjust if you store name
          leaveQuota: 21,
          usedDays: daysTaken,
          remainingDays: 21 - daysTaken
        });
        await employee.save();
      } else {
        // If exists, increment used days
        employee.usedDays = (employee.usedDays || 0) + daysTaken;
        employee.remainingDays = (employee.leaveQuota || 0) - employee.usedDays;
        await employee.save();
      }
    } 
    else if (previousStatus === 'Approved' && status !== 'Approved') {
      // Revert used days if leave approval is cancelled
      const employee = await Employee.findById(leave.employeeId);
      if (employee) {
        employee.usedDays = (employee.usedDays || 0) - daysTaken;
        employee.remainingDays = (employee.leaveQuota || 0) - employee.usedDays;
        await employee.save();
      }
    }

    res.json({ status: 'success', message: 'Leave status updated', data: leave });
  } catch (err) {
    console.error('Error updating leave status:', err);
    res.status(500).json({ status: 'error', message: 'Error updating leave status' });
  }
};

/**
 * Get All Leaves (with filters & pagination)
 */
exports.getAllLeaves = async (req, res) => {
  try {
    const { employeeId, status, page = 1, perPage = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(perPage);

    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;

    const totalCount = await Leave.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / parseInt(perPage));

    const leaves = await Leave.find(filter)
      .populate('employeeId', 'name email role')
      .sort({ from: -1 })
      .skip(skip)
      .limit(parseInt(perPage));

    res.status(200).json({
      status: 'success',
      message: 'Leave records fetched successfully',
      currentPage: parseInt(page),
      perPage: parseInt(perPage),
      totalPages,
      totalCount,
      data: leaves,
    });
  } catch (error) {
    console.error('Error fetching leave records:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

