// const mongoose = require('mongoose');

// const weeklyOffSchema = new mongoose.Schema({
//   employeeId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Employee',
//     required: true
//   },
//   dayOfWeek: {
//     type: String,
//     enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
//     required: true
//   },
//   reason: {
//     type: String,
//     default: ''
//   },
//   dateApplied: {
//     type: Date,
//     default: Date.now
//   }
// });

// module.exports = mongoose.model('WeeklyOff', weeklyOffSchema);


//=================
const mongoose = require('mongoose');

const weeklyOffSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date, // ✅ Store exact date
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  dateApplied: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WeeklyOff', weeklyOffSchema);
