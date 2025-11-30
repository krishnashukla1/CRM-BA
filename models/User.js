
const mongoose = require('mongoose');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
// Explanation:
// - At least 6 characters
// - At least one letter (A-Z or a-z)
// - At least one digit (0-9)

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required']
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function (v) {
        return emailRegex.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },


  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
