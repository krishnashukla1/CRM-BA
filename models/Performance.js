const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: String, required: true }, // e.g., 'Jan', 'Feb'
  target: { type: Number, required: true },
  sales: { type: Number, required: false },
}, { timestamps: true });

// performanceSchema.index({ userId: 1, month: 1 }, { unique: true });
performanceSchema.index({ employeeId: 1, month: 1 }, { unique: true });


module.exports = mongoose.model('Performance', performanceSchema);
