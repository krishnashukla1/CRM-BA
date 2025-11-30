const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController'); // ✅ FIXED: imported as object
const upload = require('../middleware/upload');

// POST leave request with file upload
router.post('/', upload.single('document'), leaveController.requestLeave);
router.get('/', leaveController.getAllLeaves);
router.put('/:id/status', leaveController.updateLeaveStatus);

module.exports = router;
