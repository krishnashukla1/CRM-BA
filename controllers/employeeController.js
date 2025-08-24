// const multer = require('multer');
// const path = require('path');
// const Employee = require("../models/Employee");
// const Attendance = require('../models/Attendance');
// const Leave = require('../models/Leave')
// const mongoose =require('mongoose')


// exports.getAllEmployees = async (req, res) => {
//   try {
//     const { search = '', page = 1, perPage = 100 } = req.query;
//     const skip = (parseInt(page) - 1) * parseInt(perPage);

//     const filter = search
//       ? { name: { $regex: search, $options: 'i' } }
//       : {};

//     const totalCount = await Employee.countDocuments(filter);
//     const totalPages = Math.ceil(totalCount / perPage);

//     const employees = await Employee.find(filter)
//       // .sort({ name: 1 })
//         .select('name email role status photo dateOfJoining salary') // ✅ include salary
//        .sort({ createdAt: -1 })  // ✅ shows latest created first
//       .skip(skip)
//       .limit(parseInt(perPage));

//     res.status(200).json({
//       status: 'success',
//       message: 'Employees fetched successfully',
//       currentPage: parseInt(page),
//       perPage: parseInt(perPage),
//       totalPages,
//       totalCount,
//       data: employees,
//     });
//   } catch (error) {
//     res.status(500).json({ status: 'error', message: error.message });
//   }
// };


// exports.addEmployee = async (req, res) => {
//   try {
//     const { name, role, email, dateOfJoining ,salary} = req.body;

//     const photo = req.file ? req.file.filename : null;

//     const newEmp = new Employee({
//       name,
//       role,
//       email,
//       photo,
//       salary,
//       dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
//     });

//     await newEmp.save();
//     res.status(201).json(newEmp);
//   } catch (error) {
//     console.error('Employee creation error:', error);
//     res.status(500).json({ message: 'Failed to create employee' });
//   }
// };


// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, 'uploads/'),
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     cb(null, `employee_${Date.now()}${ext}`);
//   },
// });

// const upload = multer({ storage });

// // ✅ Export correctly
// exports.upload = upload.single('photo'); // middleware
// exports.uploadEmployeePhoto = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ message: 'No file uploaded' });
//     }

//     const employeeId = req.params.id;
//     const updated = await Employee.findByIdAndUpdate(
//       employeeId,
//       { photo: req.file.filename },
//       { new: true }
//     );

//     if (!updated) {
//       return res.status(404).json({ message: 'Employee not found' });
//     }

//     res.status(200).json({
//       status: 'success',
//       message: 'Photo uploaded and saved',
//       filename: req.file.filename,
//       employee: updated,
//     });
//   } catch (err) {
//     console.error('Upload error:', err);
//     res.status(500).json({ message: 'Photo upload failed' });
//   }
// };


// exports.getSalaryByMonth = async (req, res) => {
//   const { employeeId, month } = req.params;

//   try {
//     const employee = await Employee.findById(employeeId);
//     if (!employee) return res.status(404).json({ message: 'Employee not found' });

//     const salary = employee.salary;
//     const perDaySalary = salary / 30;

//     const start = new Date(`${month}-01`);
//     const end = new Date(new Date(start).setMonth(start.getMonth() + 1));

//     // 1. Get Present Days from Attendance
//     const presentAttendance = await Attendance.find({
//       employeeId,
//       date: { $gte: start, $lt: end },
//       status: 'Present'
//     });

//     const presentDays = presentAttendance.length;

//     // 2. Get Approved Leaves in Month
//     const allLeaves = await Leave.find({
//       employeeId,
//       status: 'Approved',
//       from: { $lte: end },
//       to: { $gte: start }
//     });

//     let paidLeaveDays = 0;
//     let unpaidLeaveDays = 0;

//     allLeaves.forEach((leave) => {
//       const leaveStart = new Date(leave.from) < start ? start : new Date(leave.from);
//       const leaveEnd = new Date(leave.to) > end ? end : new Date(leave.to);

//       const days = Math.floor((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;

//       if (leave.lwp) {
//         unpaidLeaveDays += days;
//       } else {
//         paidLeaveDays += days;
//       }
//     });

//     const totalWorkingDays = 30; // static value
//     const calculatedPresent = presentDays + paidLeaveDays;
//     const calculatedSalary = Math.round(calculatedPresent * perDaySalary);
//     const totalAbsent = totalWorkingDays - (presentDays + paidLeaveDays + unpaidLeaveDays);

//     res.json({
//       employeeId,
//       name: employee.name,
//       month,
//       totalWorkingDays,
//       presentDays,
//       paidLeaveDays,
//       unpaidLeaveDays,
//       totalAbsent,
//       perDaySalary: perDaySalary.toFixed(2),
//       totalSalary: salary,
//       calculatedSalary,
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server Error' });
//   }
// };

// // Updated updateEmployee controller
// exports.updateEmployee = async (req, res) => {
//   try {
//     const { id } = req.params;
    
//     // Verify the ID is valid
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ message: 'Invalid employee ID' });
//     }

//     let updates = req.body;

//     // Handle file upload if present
//     if (req.file) {
//       updates.photo = req.file.filename;
//     }

//     // Convert date if provided
//     if (updates.dateOfJoining) {
//       updates.dateOfJoining = new Date(updates.dateOfJoining);
//     }
//    const options = { 
//       new: true,
//       runValidators: true
//     };

//   const updated = await Employee.findByIdAndUpdate(id, updates, options);

//     if (!updated) {
//       return res.status(404).json({ message: 'Employee not found' });
//     }

//     res.status(200).json({
//       status: 'success',
//       message: 'Employee updated successfully',
//       employee: updated,
//     });
//   } catch (err) {
//     console.error('Update error:', err);
//     res.status(500).json({ 
//       message: 'Failed to update employee',
//       error: err.message 
//     });
//   }
// };

// exports.deleteEmployee = async (req, res) => {
//   try {
//     const deletedEmployee = await Employee.findByIdAndDelete(req.params.id);
    
//     if (!deletedEmployee) {
//       return res.status(404).json({ message: 'Employee not found' });
//     }
    
//     res.status(200).json({
//       status: 'success',
//       message: 'Employee deleted successfully'
//     });
//   } catch (err) {
//     console.error('Delete employee error:', err);
//     res.status(500).json({ 
//       message: 'Failed to delete employee',
//       error: err.message
//     });
//   }
// };


//==============================================
// controllers/employeeController.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Employee = require("../models/Employee");
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const mongoose = require('mongoose');

const asyncHandler = require('express-async-handler');
const dayjs = require('dayjs');

// ---------------------------
// ✅ Multer Config for File Upload
// ---------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `employee_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });
exports.upload = upload.single('photo'); // middleware for routes

// ---------------------------
// ✅ Get All Employees
// ---------------------------
exports.getAllEmployees = async (req, res) => {
  try {
    const { search = '', page = 1, perPage = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(perPage);

    const filter = search ? { name: { $regex: search, $options: 'i' } } : {};
    const totalCount = await Employee.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / perPage);

    const employees = await Employee.find(filter)
      // .select('name email role status photo dateOfJoining salary leaveQuota')
      .select('name email role status photo dateOfJoining salary leaveQuota usedDays remainingDays userId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(perPage));

    res.status(200).json({
      status: 'success',
      message: 'Employees fetched successfully',
      currentPage: parseInt(page),
      perPage: parseInt(perPage),
      totalPages,
      totalCount,
      data: employees,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ---------------------------
// ✅ Add Employee with Photo
// ---------------------------
exports.addEmployee = async (req, res) => {
  try {
    // const { name, role, email, status, dateOfJoining, salary } = req.body;
      const { userId, name, role, email, status, dateOfJoining, salary} = req.body;
    const photo = req.file ? req.file.filename : null;

    const newEmployee = new Employee({
       userId, 
      name,
      role,
      email,
      status,
      dateOfJoining,
      salary,
      photo,
    });

    await newEmployee.save();

    res.status(201).json({
      status: 'success',
      message: 'Employee added',
      employee: newEmployee,
    });
  } catch (err) {
    console.error('Error adding employee:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add employee',
    });
  }
};


// ---------------------------
// ✅ Update Employee (with optional photo)
// ---------------------------
// exports.updateEmployee = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ message: 'Invalid employee ID' });
//     }

//     let updates = req.body;

//     if (req.file) {
//       updates.photo = req.file.filename;
//     }

//     if (updates.dateOfJoining) {
//       updates.dateOfJoining = new Date(updates.dateOfJoining);
//     }

//     const updated = await Employee.findByIdAndUpdate(id, updates, {
//       new: true,
//       runValidators: true,
//     });

//     if (!updated) {
//       return res.status(404).json({ message: 'Employee not found' });
//     }

//     res.status(200).json({
//       status: 'success',
//       message: 'Employee updated successfully',
//       employee: updated,
//     });
//   } catch (err) {
//     console.error('Update error:', err);
//     res.status(500).json({
//       message: 'Failed to update employee',
//       error: err.message,
//     });
//   }
// };


// exports.updateEmployee = async (req, res) => {
//   try {
//     const employeeId = req.params.id;
//     const { name, role, email, status, dateOfJoining, salary } = req.body;

//     const employee = await Employee.findById(employeeId);
//     if (!employee) {
//       return res.status(404).json({
//         status: 'error',
//         message: 'Employee not found',
//       });
//     }

//     // Delete old photo if a new one is uploaded
//     if (req.file && employee.photo) {
//       const oldPhotoPath = path.join('uploads', employee.photo);
//       if (fs.existsSync(oldPhotoPath)) {
//         fs.unlinkSync(oldPhotoPath);
//       }
//     }

//     // Update employee fields
//     employee.name = name || employee.name;
//     employee.role = role || employee.role;
//     employee.email = email || employee.email;
//     employee.status = status || employee.status;
//     employee.dateOfJoining = dateOfJoining || employee.dateOfJoining;
//     employee.salary = salary || employee.salary;
//     if (req.file) employee.photo = req.file.filename;

//     await employee.save();

//     res.status(200).json({
//       status: 'success',
//       message: 'Employee updated',
//       employee,
//     });
//   } catch (err) {
//     console.error('Error updating employee:', err);
//     res.status(500).json({
//       status: 'error',
//       message: 'Failed to update employee',
//     });
//   }
// };
// // ---------------------------
// // ✅ Upload Only Photo (Optional Separate API)
// // ---------------------------
// exports.uploadEmployeePhoto = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!req.file) {
//       return res.status(400).json({ message: 'No photo uploaded' });
//     }

//     const updated = await Employee.findByIdAndUpdate(
//       id,
//       { photo: req.file.filename },
//       { new: true }
//     );

//     if (!updated) {
//       return res.status(404).json({ message: 'Employee not found' });
//     }

//     res.status(200).json({
//       status: 'success',
//       message: 'Photo uploaded and saved',
//       filename: req.file.filename,
//       employee: updated,
//     });
//   } catch (err) {
//     console.error('Upload error:', err);
//     res.status(500).json({ message: 'Photo upload failed' });
//   }
// };
//------------new if update then old photo will be deleted------------

exports.updateEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { name, role, email, status, dateOfJoining, salary } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
    }

    // Delete old photo if a new one is uploaded
    if (req.file && employee.photo) {
      const oldPhotoPath = path.join('uploads', employee.photo);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update employee fields
    employee.name = name || employee.name;
    employee.role = role || employee.role;
    employee.email = email || employee.email;
    employee.status = status || employee.status;
    employee.dateOfJoining = dateOfJoining || employee.dateOfJoining;
    employee.salary = salary || employee.salary;
    if (req.file) employee.photo = req.file.filename;

    await employee.save();

    res.status(200).json({
      status: 'success',
      message: 'Employee updated',
      employee,
    });
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update employee',
    });
  }
};

// ---------------------------
// ✅ Upload Only Photo (Now with Old Photo Cleanup)
// ---------------------------
// exports.uploadEmployeePhoto = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!req.file) {
//       return res.status(400).json({ message: 'No photo uploaded' });
//     }

//     // First get the current employee to check for existing photo
//     const currentEmployee = await Employee.findById(id);
//     if (!currentEmployee) {
//       return res.status(404).json({ message: 'Employee not found' });
//     }

//     // Delete old photo if it exists
//     if (currentEmployee.photo) {
//       const oldPhotoPath = path.join('uploads', currentEmployee.photo);
//       if (fs.existsSync(oldPhotoPath)) {
//         fs.unlinkSync(oldPhotoPath);
//       }
//     }

//     // Update with new photo
//     const updated = await Employee.findByIdAndUpdate(
//       id,
//       { photo: req.file.filename },
//       { new: true }
//     );

//     res.status(200).json({
//       status: 'success',
//       message: 'Photo uploaded and saved',
//       filename: req.file.filename,
//       employee: updated,
//     });
//   } catch (err) {
//     console.error('Upload error:', err);
//     res.status(500).json({ message: 'Photo upload failed' });
//   }
// };

exports.uploadEmployeePhoto = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }

    // First get the current employee to check for existing photo
    const currentEmployee = await Employee.findById(id);
    if (!currentEmployee) {
      // Clean up the uploaded file if employee doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Delete old photo if it exists
    if (currentEmployee.photo) {
      const oldPhotoPath = path.join(__dirname, '..', 'uploads', currentEmployee.photo);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update with new photo - make sure to save the filename correctly
    const updated = await Employee.findByIdAndUpdate(
      id,
      { 
        photo: req.file.filename,
        updatedAt: new Date() // Force update timestamp
      },
      { new: true, runValidators: true } // Return updated document and validate
    );

    // Save the changes
    await updated.save();

    res.status(200).json({
      status: 'success',
      message: 'Photo uploaded and saved',
      filename: req.file.filename,
      employee: updated,
    });
  } catch (err) {
    console.error('Upload error:', err);
    
    // Clean up the uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: 'Photo upload failed', error: err.message });
  }
};

// ---------------------------
// ✅ Get Salary by Month
// ---------------------------
exports.getSalaryByMonth = async (req, res) => {
  const { employeeId, month } = req.params;

  try {
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const salary = employee.salary;
    const perDaySalary = salary / 30;
    const start = new Date(`${month}-01`);
    const end = new Date(new Date(start).setMonth(start.getMonth() + 1));

    const presentDays = await Attendance.countDocuments({
      employeeId,
      date: { $gte: start, $lt: end },
      status: 'Present'
    });

    const allLeaves = await Leave.find({
      employeeId,
      status: 'Approved',
      from: { $lte: end },
      to: { $gte: start }
    });

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    allLeaves.forEach((leave) => {
      const leaveStart = new Date(leave.from) < start ? start : new Date(leave.from);
      const leaveEnd = new Date(leave.to) > end ? end : new Date(leave.to);
      const days = Math.floor((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;

      if (leave.lwp) unpaidLeaveDays += days;
      else paidLeaveDays += days;
    });

    const totalWorkingDays = 30;
    const calculatedPresent = presentDays + paidLeaveDays;
    const calculatedSalary = Math.round(calculatedPresent * perDaySalary);
    const totalAbsent = totalWorkingDays - (presentDays + paidLeaveDays + unpaidLeaveDays);

    res.json({
      employeeId,
      name: employee.name,
      month,
      totalWorkingDays,
      presentDays,
      paidLeaveDays,
      unpaidLeaveDays,
      totalAbsent,
      perDaySalary: perDaySalary.toFixed(2),
      totalSalary: salary,
      calculatedSalary,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ---------------------------
// ✅ Delete Employee
// ---------------------------
exports.deleteEmployee = async (req, res) => {
  try {
    const deleted = await Employee.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(200).json({ status: 'success', message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({
      message: 'Failed to delete employee',
      error: err.message
    });
  }
};




// exports.updateLeaveQuota = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { leaveQuota } = req.body;

//     // Validate input
//     if (!leaveQuota || isNaN(leaveQuota)) {
//       return res.status(400).json({
//         status: 'fail',
//         message: 'Please provide a valid leave quota number'
//       });
//     }

//     const employee = await Employee.findByIdAndUpdate(
//       id,
//       { leaveQuota: Number(leaveQuota) }, // Ensure it's stored as a number
//       { new: true, runValidators: true } // Return updated doc and run schema validators
//     );

//     if (!employee) {
//       return res.status(404).json({
//         status: 'fail',
//         message: 'No employee found with that ID'
//       });
//     }

//     res.status(200).json({
//       status: 'success',
//       data: {
//         employee
//       }
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: 'fail',
//       message: err.message
//     });
//   }
// };






// ✅ Update Annual Quota (existing)
// exports.updateLeaveQuota = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { leaveQuota } = req.body;

//     if (!leaveQuota || isNaN(leaveQuota)) {
//       return res.status(400).json({ status: 'fail', message: 'Invalid leave quota' });
//     }

//     const employee = await Employee.findByIdAndUpdate(
//       id,
//       { 
//         leaveQuota: Number(leaveQuota),
//         remainingDays: Number(leaveQuota) - req.body.usedDays || 0 // Auto-update remaining
//       },
//       { new: true, runValidators: true }
//     );

//     if (!employee) {
//       return res.status(404).json({ status: 'fail', message: 'Employee not found' });
//     }

//     res.status(200).json({ status: 'success', data: employee });
//   } catch (err) {
//     res.status(400).json({ status: 'fail', message: err.message });
//   }
// };

// // ✅ NEW: Update Used Days
// exports.updateUsedDays = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { usedDays } = req.body;

//     if (usedDays === undefined || isNaN(usedDays)) {
//       return res.status(400).json({ status: 'fail', message: 'Invalid used days value' });
//     }

//     const employee = await Employee.findById(id);
//     if (!employee) {
//       return res.status(404).json({ status: 'fail', message: 'Employee not found' });
//     }

//     // Validate that usedDays ≤ quota
//     if (usedDays > employee.leaveQuota) {
//       return res.status(400).json({ 
//         status: 'fail', 
//         message: `Used days (${usedDays}) cannot exceed quota (${employee.leaveQuota})` 
//       });
//     }

//     // Update usedDays and auto-calculate remainingDays
//     employee.usedDays = Number(usedDays);
//     employee.remainingDays = employee.leaveQuota - employee.usedDays;
//     await employee.save();

//     res.status(200).json({ status: 'success', data: employee });
//   } catch (err) {
//     res.status(400).json({ status: 'fail', message: err.message });
//   }
// };










//---------------

// ✅ Keep this as is but fix remainingDays calc
exports.updateLeaveQuota = async (req, res) => {
  try {
    const { id } = req.params;
    const { leaveQuota } = req.body;

    if (leaveQuota === undefined || isNaN(leaveQuota)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid leave quota' });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ status: 'fail', message: 'Employee not found' });
    }

    employee.leaveQuota = Number(leaveQuota);
    employee.remainingDays = employee.leaveQuota - (employee.usedDays || 0);
    await employee.save();

    res.status(200).json({ status: 'success', data: employee });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};


// ✅ When leave is approved, update usedDays automatically
// exports.incrementUsedDays = async (employeeId, daysToAdd) => {
//   const employee = await Employee.findById(employeeId);
//   if (!employee) return;

//   employee.usedDays = (employee.usedDays || 0) + daysToAdd;
//   employee.remainingDays = employee.leaveQuota - employee.usedDays;

//   // Prevent negative remainingDays
//   if (employee.remainingDays < 0) employee.remainingDays = 0;

//   await employee.save();
// };

exports.incrementUsedDays = async (employeeId, daysToAdd) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) return;

  employee.usedDays = (employee.usedDays || 0) + daysToAdd;
  employee.remainingDays = employee.leaveQuota - employee.usedDays;

  // Prevent negative remainingDays
  if (employee.remainingDays < 0) employee.remainingDays = 0;

  await employee.save();
};
// // ✅ Existing manual update endpoint
// exports.updateUsedDays = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { usedDays } = req.body;

//     if (usedDays === undefined || isNaN(usedDays)) {
//       return res.status(400).json({ status: 'fail', message: 'Invalid used days value' });
//     }

//     const employee = await Employee.findById(id);
//     if (!employee) {
//       return res.status(404).json({ status: 'fail', message: 'Employee not found' });
//     }

//     if (usedDays > employee.leaveQuota) {
//       return res.status(400).json({ 
//         status: 'fail', 
//         message: `Used days (${usedDays}) cannot exceed quota (${employee.leaveQuota})` 
//       });
//     }

//     employee.usedDays = Number(usedDays);
//     employee.remainingDays = employee.leaveQuota - employee.usedDays;
//     await employee.save();

//     res.status(200).json({ status: 'success', data: employee });
//   } catch (err) {
//     res.status(400).json({ status: 'fail', message: err.message });
//   }
// };
// ✅ Existing manual update endpoint - Modified to ensure remainingDays is calculated

// exports.updateUsedDays = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { usedDays } = req.body;

//     if (usedDays === undefined || isNaN(usedDays)) {
//       return res.status(400).json({ status: 'fail', message: 'Invalid used days value' });
//     }

//     const employee = await Employee.findById(id);
//     if (!employee) {
//       return res.status(404).json({ status: 'fail', message: 'Employee not found' });
//     }

//     // Calculate approved leave days to ensure we don't go below that
//     const approvedLeaves = await Leave.find({ 
//       employeeId: id, 
//       status: 'Approved' 
//     });
    
//     const minUsedDays = approvedLeaves.reduce((sum, leave) => {
//       const from = new Date(leave.from);
//       const to = new Date(leave.to);
//       return sum + (dayjs(to).diff(dayjs(from), 'day') + 1);
//     }, 0);

//     if (usedDays < minUsedDays) {
//       return res.status(400).json({ 
//         status: 'fail', 
//         message: `Used days cannot be less than ${minUsedDays} (approved leaves)` 
//       });
//     }

//     if (usedDays > employee.leaveQuota) {
//       return res.status(400).json({ 
//         status: 'fail', 
//         message: `Used days (${usedDays}) cannot exceed quota (${employee.leaveQuota})` 
//       });
//     }

//     employee.usedDays = Number(usedDays);
//     employee.remainingDays = Math.max(employee.leaveQuota - employee.usedDays, 0);
//     await employee.save();

//     res.status(200).json({ 
//       status: 'success', 
//       data: employee 
//     });
//   } catch (err) {
//     res.status(400).json({ 
//       status: 'fail', 
//       message: err.message 
//     });
//   }
// };


exports.updateUsedDays = async (req, res) => {
  try {
    const { id } = req.params;
    const { usedDays } = req.body;

    if (usedDays === undefined || isNaN(usedDays)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid used days value' });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ status: 'fail', message: 'Employee not found' });
    }

    // Calculate approved leave days to ensure we don't go below that
    const approvedLeaves = await Leave.find({ 
      employeeId: id, 
      status: 'Approved' 
    });
    
    const minUsedDays = approvedLeaves.reduce((sum, leave) => {
      const from = new Date(leave.from);
      const to = new Date(leave.to);
      return sum + (dayjs(to).diff(dayjs(from), 'day') + 1);
    }, 0);

    if (usedDays < minUsedDays) {
      return res.status(400).json({ 
        status: 'fail', 
        message: `Used days cannot be less than ${minUsedDays} (approved leaves)` 
      });
    }

    if (usedDays > employee.leaveQuota) {
      return res.status(400).json({ 
        status: 'fail', 
        message: `Used days (${usedDays}) cannot exceed quota (${employee.leaveQuota})` 
      });
    }

    employee.usedDays = Number(usedDays);
    employee.remainingDays = Math.max(employee.leaveQuota - employee.usedDays, 0);
    await employee.save();

    res.status(200).json({ 
      status: 'success', 
      data: employee 
    });
  } catch (err) {
    res.status(400).json({ 
      status: 'fail', 
      message: err.message 
    });
  }
};

//-------------------




exports.getEmployeeByUserId = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.params.userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json({ employee });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// module.exports = {
//   getEmployeeByUserId,
// };


// -------------------------
// controllers/employeeController.js
exports.getCurrentEmployee = async (req, res) => {
  try {
    // Check if user exists from middleware
    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return appropriate data based on user type
    const responseData = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    };

    // Add employee-specific fields if available
    if (req.user.dateOfJoining) {
      responseData.dateOfJoining = req.user.dateOfJoining;
      responseData.leaveQuota = req.user.leaveQuota;
    }

    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};



//--------------supervisor------------

exports.getSupervisors = async (req, res) => {
  try {
    const supervisors = await Employee.find({ role: "supervisor" }, "_id");
    res.status(200).json(supervisors);
  } catch (err) {
    console.error("Error fetching supervisors:", err);
    res.status(500).json({ message: "Failed to fetch supervisors" });
  }
};