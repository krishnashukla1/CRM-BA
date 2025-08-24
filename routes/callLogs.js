const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const callLogController = require('../controllers/callLogController');

// ✅ Routes
router.post('/', callLogController.createCallLog);
router.get('/', callLogController.getAllCallLogs);
router.get('/summary', callLogController.getCallSummaryStats);
router.get('/:employeeId', callLogController.getCallLogsByEmployee);
// routes/callLogs.js
router.get('/summary/today/:employeeId', callLogController.getTodaySummary);
// router.patch('/:callLogId/chargeback-refund', callLogController.updateChargebackAndRefund); // New rout
module.exports = router;
