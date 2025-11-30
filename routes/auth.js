const express = require('express');
const router = express.Router();
const { register, login,getAdminCount } = require('../controllers/authController');

const { adminChangePassword } = require('../controllers/authController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');


router.put('/admin/change-password', verifyToken, isAdmin, adminChangePassword);

router.post('/signup', register);
router.post('/login', login);
router.get('/admin-count', getAdminCount);


module.exports = router;
