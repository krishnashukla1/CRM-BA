
const express = require('express');
const router = express.Router();

const { authenticateUser } = require('../middleware/authMiddleware');
const {protect} = require('../middleware/authMiddleware');
const attendanceController = require('../controllers/attendanceController'); // ✅ import controller properly

// router.get('/today', authenticateUser, attendanceController.checkTodayAttendance); // ✅ secure route properly
router.get('/today', protect, attendanceController.checkTodayAttendance); // ✅ secure route properly



router.post('/mark', attendanceController.markAttendance);
router.post('/', attendanceController.addAttendance);
router.get('/', attendanceController.getAllAttendance);
router.get('/:employeeId', attendanceController.getAttendanceByEmployee);
router.patch('/:id/status', attendanceController.updateAttendanceStatus);

router.get('/emp/summary', attendanceController.getAttendanceSummary)
module.exports = router;

