
const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  name: String,
  role: String,
  email: String,
  status: { type: String, default: "Active" },
  // image: String, // optional
  photo: {
    type: String,
    default: '',
  },
  dateOfJoining: {
    type: Date,
    required: false, // or true if mandatory
  },
  salary: {
    type: Number,
    required: false // e.g. 30000
  },

  leaveQuota: {
    type: Number,
    default: 20, // Default annual leave quota
    min: 1 // Ensure it's always positive
  },
  usedDays: {
    type: Number,
    default: 0, // Initially, no leaves are used
    min: 0 // Cannot be negative
  },
  remainingDays: {
    type: Number,
    default: function () { return this.leaveQuota - this.usedDays; }, // Auto-calculate
    min: 0 // Cannot be negative
  }


}, { timestamps: true }); // ✅ important!);



// ✅ Index on commonly searched fields
// employeeSchema.index({ name: "text", email: "text", role: 1 });
employeeSchema.index({ name: "text", email: "text", role: 1, userId: 1 });

module.exports = mongoose.model("Employee", employeeSchema);
