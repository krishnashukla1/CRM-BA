// // routes/leaves.js
// const express = require('express');
// const router = express.Router();
// const {
//   getAllLeaves,
//   createLeave,
//   updateLeaveStatus
// } = require('../controllers/leaveController');

// // GET all leaves
// router.get('/', getAllLeaves);

// // POST new leave
// router.post('/', createLeave);

// // PATCH update leave status
// router.patch('/:id/status', updateLeaveStatus);

// module.exports = router;

//-----------------------------------------


const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController'); // ✅ FIXED: imported as object
const upload = require('../middleware/upload');

// POST leave request with file upload
router.post('/', upload.single('document'), leaveController.requestLeave);
router.get('/', leaveController.getAllLeaves);
router.put('/:id/status', leaveController.updateLeaveStatus);

module.exports = router;
