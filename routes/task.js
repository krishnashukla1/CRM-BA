// // routes/tasks.js
// const express = require('express');
// const router = express.Router();
// const {
//   getAllTasks,
//   createTask,
//   updateTaskStatus
// } = require('../controllers/taskController');

// router.get('/', getAllTasks);
// router.post('/', createTask);
// router.patch('/:id/status', updateTaskStatus);

// module.exports = router;


//===========================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const express = require('express');
const router = express.Router();
const {
  getAllTasks,
  createTask,
  updateTaskStatus,
   updateTask,
  deleteTask
} = require('../controllers/taskController');


// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/tasks');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});

const upload = multer({ storage });


router.post('/', upload.single('attachment'), createTask);

router.get('/', getAllTasks);

router.patch('/:id/status', updateTaskStatus);

router.patch('/:id', upload.single('attachment'), updateTask);

router.delete('/:id', deleteTask);

module.exports = router;