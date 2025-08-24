// controllers/taskController.js
const Task = require('../models/Task');

exports.getAllTasks = async (req, res) => {
  try {
    const { assignedTo, status, page = 1, perPage = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(perPage);

    const filter = {};
    if (assignedTo) filter.assignedTo = assignedTo;
    if (status) filter.status = status;

    const totalCount = await Task.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / perPage);

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email role')
      .sort({ _id: -1 })
      .skip(skip)
      .limit(parseInt(perPage));

    res.status(200).json({
      status: 'success',
      message: 'Tasks fetched successfully',
      currentPage: parseInt(page),
      perPage: parseInt(perPage),
      totalPages,
      totalCount,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};



// exports.createTask = async (req, res) => {
//   try {
//     const newTask = new Task(req.body);
//     await newTask.save();
//     res.status(201).json(newTask);
//   } catch (err) {
//     res.status(400).json({ message: 'Failed to create task' });
//   }
// };


// exports.createTask = async (req, res) => {
//   try {
//     const newTask = new Task(req.body);
//     await newTask.save();

//     // Use consistent response structure
//     res.status(201).json({
//       status: 'success',
//       message: 'Task created successfully',
//       data: newTask,
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: 'error',
//       message: 'Failed to create task',
//       error: err.message,
//     });
//   }
// };


exports.createTask = async (req, res) => {
  try {
    const { title, description, status, assignedTo, dueDate, priority } = req.body;

    const newTask = new Task({
      title,
      description,
      status,
      assignedTo,
      dueDate,
      priority,
      attachment: req.file ? `/uploads/tasks/${req.file.filename}` : null,
    });

    await newTask.save();

    res.status(201).json({
      status: 'success',
      message: 'Task created successfully',
      data: newTask,
    });
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: 'Failed to create task',
      error: err.message,
    });
  }
};


exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await Task.findByIdAndUpdate(id, { status }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update task status' });
  }
};

// Update full task
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      assignedTo: req.body.assignedTo,
      dueDate: req.body.dueDate,
      priority: req.body.priority,
    };

    // If file is attached
    if (req.file) {
      updateData.attachment = `/uploads/tasks/${req.file.filename}`;
    }

    const updatedTask = await Task.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedTask) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Task updated successfully',
      data: updatedTask,
    });
  } catch (err) {
    res.status(400).json({ status: 'error', message: 'Failed to update task', error: err.message });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTask = await Task.findByIdAndDelete(id);

    if (!deletedTask) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Task deleted successfully',
      data: deletedTask,
    });
  } catch (err) {
    res.status(400).json({ status: 'error', message: 'Failed to delete task', error: err.message });
  }
};

