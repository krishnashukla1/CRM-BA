const User = require('../models/User');
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET;

// 🔹 Role label mapping (Supervisor removed)
const ROLE_LABELS = {
  admin: 'Admin',
  user: 'Employee'
};

/**
 * @desc Register new user/admin
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    // 1. Required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // 3. Password validation
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters and contain both letters and numbers',
      });
    }

    // 4. Check if user exists
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    // 5. Only 1 admin allowed
    if (role === 'admin') {
      const count = await User.countDocuments({ role: 'admin' });
      if (count >= 1) {
        return res.status(403).json({ message: '❌ Only 1 admin is allowed' });
      }
    }

    // 6. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Create user
    const user = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
    });
    await user.save();

    // 8. Create employee record only for USER
    if (role === 'user') {
      await Employee.create({
        userId: user._id,
        name,
        email,
        role: ROLE_LABELS[role], // "Employee"
        dateOfJoining: new Date(),
        photo: '',
      });
    }

    res.status(201).json({ message: '✅ User registered successfully' });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

/**
 * @desc Login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid credentials' });

    // No supervisor role allowed
    if (user.role !== 'admin' && user.role !== 'user') {
      return res.status(403).json({ message: 'Invalid user role' });
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photo: user.photo || null,
      },
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
};

/**
 * @desc Count admins
 */
exports.getAdminCount = async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'admin' });
    res.status(200).json({ count });
  } catch (err) {
    console.error('Error counting admins:', err);
    res.status(500).json({ message: 'Server error while counting admins' });
  }
};

/**
 * @desc Primary Admin Change Password
 */
exports.adminChangePassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    // Only main admin allowed
    if (req.user.email !== 'krishna@gmail.com') {
      return res.status(403).json({ message: '❌ Only primary admin can change passwords.' });
    }

    // Password validation
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters and contain both letters and numbers',
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Email Notification
    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'krishnaprasad24795@gmail.com',
      subject: '🔐 Password Change Notification (CRM)',
      html: `
        <div style="font-family: Arial; padding: 16px;">
          <h2 style="color: #2563eb;">Password Changed</h2>
          <p><strong>User Email:</strong> ${user.email}</p>
          <p><strong>Role:</strong> ${user.role}</p>
          <p><strong>Changed At:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    if (error) {
      console.error('Email Error:', error);
      return res.status(500).json({ message: 'Password changed, but email failed' });
    }

    res.status(200).json({ message: '✅ Password changed + email sent' });
  } catch (err) {
    console.error('Admin password change error:', err);
    res.status(500).json({ message: 'Server error while updating password' });
  }
};


