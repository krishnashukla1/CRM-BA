const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const dailyReportController = require('../controllers/dailyReportController');

// Test endpoint (no authentication)
// router.post('/email-test', dailyReportController.sendDailyReport);

router.post('/email-test', (req, res) => {
  // Bypass authentication completely for testing
  req.user = {
    email: 'krishnaprasad24795@gmail.com', // Your verified Resend email
    name: req.body.name || 'Test User',
    role: 'Tester'
  };
  dailyReportController.sendDailyReport(req, res);
});

// Production endpoint (with authentication)
// router.post('/email', authenticateUser, dailyReportController.sendDailyReport);
router.post('/email', dailyReportController.sendDailyReport);


module.exports = router;