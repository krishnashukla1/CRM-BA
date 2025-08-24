const express = require('express');
const Performance = require('../models/Performance'); // ✅ Add this

const router = express.Router();
const performanceController = require('../controllers/performanceController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/top', performanceController.getTopPerformers);  //this line keep on top otherwise errro will be showing


router.get('/employee/:id', protect, performanceController.getEmployeePerformance);
router.post('/', protect, adminOnly, performanceController.createOrUpdatePerformance);

// GET /api/performance/:employeeId
router.get('/:employeeId', async (req, res) => {
  try {
    const perf = await Performance.findOne({ employeeId: req.params.employeeId });
    if (!perf) return res.status(404).json({ message: 'Performance not found' });

    res.json({ data: perf });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching performance', error: err.message });
  }
});
router.get('/performance/all', performanceController.getAllPerformance); 


module.exports = router;
