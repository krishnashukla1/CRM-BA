const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  status: { type: String, enum: ['Approved', 'Pending', 'Rejected'], default: 'Pending' },
  reason: { type: String },
  document: { type: String }, // store filename
  leaveType: {
    type: String,
    enum: ['Paid Leave', 'Leave Without Pay'], // optional
    default: 'Paid Leave',
  },
  isPaid: {
    type: Boolean,
    default: false, // means it's LWP by default
  },
  createdAt: { type: Date, default: Date.now }
});

// ✅ Indexes for fast filtering/sorting
leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ from: 1, to: 1 });

module.exports = mongoose.model('Leave', leaveSchema);
