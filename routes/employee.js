
const express = require("express");
const Employee = require("../models/Employee");

const router = express.Router();
const {
  getAllEmployees,
  addEmployee,
  upload,
  uploadEmployeePhoto,getSalaryByMonth,updateEmployee,deleteEmployee,updateLeaveQuota,
  updateUsedDays,getEmployeeByUserId,getCurrentEmployee,
} = require("../controllers/employeeController");

const { protect } = require("../middleware/authMiddleware");


router.get("/", getAllEmployees);
router.post("/", upload, addEmployee); // ✅ fixed
// router.patch("/:id/photo", protect, upload, uploadEmployeePhoto);
router.patch("/:id/photo", protect, upload, uploadEmployeePhoto);

// router.get('/salary/:employeeId/:month',protect, getSalaryByMonth);
router.get('/salary/:employeeId/:month', getSalaryByMonth);

// router.put("/:id", protect, upload, updateEmployee); // PUT to update employee fully (FOR PROTECTED)
router.put("/:id", upload, updateEmployee); // PUT to update employee fully

router.delete("/:id", deleteEmployee); // Add this line

// In your backend routes

// router.get('/me', protect, async (req, res) => {
//   try {
//     const employee = await Employee.findById(req.user.id);
//     if (!employee) {
//       return res.status(404).json({ message: 'Employee not found' });
//     }
//     res.json(employee);
//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });

router.get('/me', protect, getCurrentEmployee);

// ✅ Update Annual Quota
router.patch('/:id/leave-quota', updateLeaveQuota);

// ✅ Update Used Days
router.patch("/:id/used-days", updateUsedDays);
router.get("/by-user/:userId", getEmployeeByUserId);

// router.get("/supervisors", getSupervisors); // Add this route

module.exports = router;

