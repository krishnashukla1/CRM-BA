const express = require('express');
const router = express.Router();
const weeklyOffController = require('../controllers/weeklyOffController');


router.get('/', weeklyOffController.getAllWeeklyOffs);
router.get('/:employeeId', weeklyOffController.getWeeklyOffsByEmployee);
router.post('/', weeklyOffController.createWeeklyOff);

// router.put('/:id', weeklyOffController.updateWeeklyOffById);
router.delete('/:id', weeklyOffController.deleteWeeklyOffById);

module.exports = router;
