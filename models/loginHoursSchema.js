const mongoose = require('mongoose');

const breakSchema = new mongoose.Schema({
  start: Date,
  end: Date
});

const loginHourSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  loginTime: { type: Date, required: true },
  logoutTime: { type: Date },
  breaks: [breakSchema]
  
});
loginHourSchema.index({ employeeId: 1, date: 1 }, { unique: false });
module.exports = mongoose.model('LoginHour', loginHourSchema);
