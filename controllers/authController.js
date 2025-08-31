

// const User = require('../models/User');
// const Employee = require('../models/Employee');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { Resend } = require('resend');
// const resend = new Resend(process.env.RESEND_API_KEY);

// const JWT_SECRET = process.env.JWT_SECRET;

// // ✅ Signup Controller
// exports.register = async (req, res) => {
//   try {
//     const { name, email, password, role = 'user' } = req.body;

//     // 1. Check empty fields
//     if (!name || !email || !password) {
//       return res.status(400).json({ message: 'Name, email, and password are required' });
//     }

//     // 2. Email format validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({ message: 'Invalid email format' });
//     }

//     // 3. Password strength validation (min 6 chars, 1 letter & 1 number)
//     const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
//     if (!passwordRegex.test(password)) {
//       return res.status(400).json({
//         message:
//           'Password must be at least 6 characters and contain both letters and numbers'
//       });
//     }

//     // 4. Check if user already exists
//     const normalizedEmail = email.toLowerCase();
//     const existingUser = await User.findOne({ email: normalizedEmail });
//     if (existingUser) {
//       return res.status(409).json({ message: 'User already exists with this email' });
//     }



//     // 🛑 Check if an admin already exists
//     // if (role === 'admin') {
//     //   const existingAdmin = await User.findOne({ role: 'admin' });
//     //   if (existingAdmin) {
//     //     return res.status(403).json({ message: '❌ Admin already registered' });
//     //   }
//     // }

//     // 🛑 Check if more than 2 admins exist
//     if (role === 'admin') {
//       const adminCount = await User.countDocuments({ role: 'admin' });
//       if (adminCount >= 2) {
//         return res.status(403).json({ message: '❌ Maximum of 2 admins are allowed' });
//       }
//     }


//     // 5. Hash the password
//     const hashed = await bcrypt.hash(password, 10);

//     // 6. Create User
//     const user = new User({ name, email: normalizedEmail, password: hashed, role });
//     await user.save();

//     // 7. Create Employee record if normal user
//     if (role === 'user') {
//       await Employee.create({
//         name,
//         email,
//         role: 'Employee',
//         dateOfJoining: new Date(),
//         photo: '',
//       });
//     }

//     res.status(201).json({ message: '✅ User registered successfully' });
//   } catch (err) {
//     console.error('❌ Register error:', err);
//     res.status(500).json({ message: 'Server error during registration' });
//   }
// };

// // ✅ Login Controller
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // 1. Check empty
//     if (!email || !password) {
//       return res.status(400).json({ message: 'Email and password are required' });
//     }

//     // 2. Find user

//     const user = await User.findOne({ email: email.toLowerCase() }).lean();// use fresh DB query

//     if (!user) return res.status(404).json({ message: 'User not found' });

//     // 3. Compare password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

//     // 4. Generate token
//     const token = jwt.sign({ userId: user._id, role: user.role, email: user.email }, JWT_SECRET, {
//       expiresIn: '7d',
//     });

//     // 5. Respond
//     res.json({
//       token,
//       user: {
//         _id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//       },
//     });
//   } catch (err) {
//     console.error('❌ Login error:', err);
//     res.status(500).json({ message: 'Login failed' });
//   }
// };


// exports.getAdminCount = async (req, res) => {
//   try {
//     const count = await User.countDocuments({ role: 'admin' });
//     res.status(200).json({ count });
//   } catch (err) {
//     console.error('Error counting admins:', err);
//     res.status(500).json({ message: 'Server error while counting admins' });
//   }
// };


// //=========================
// // const { Resend } = require('resend');
// // const resend = new Resend(process.env.RESEND_API_KEY);

// exports.adminChangePassword = async (req, res) => {
//   try {
//     const { email, newPassword } = req.body;

//     if (!email || !newPassword) {
//       return res.status(400).json({ message: 'Email and new password are required' });
//     }
//   // ✅ Restrict to primary admin only
//     if (req.user.email !== 'fbadmin@gmail.com') {
//       return res.status(403).json({ message: '❌ Only primary admin can change passwords.' });
//     }

//     // Validate password
//     const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
//     if (!passwordRegex.test(newPassword)) {
//       return res.status(400).json({
//         message: 'Password must be at least 6 characters and contain both letters and numbers'
//       });
//     }

//     // Lookup user
//     const user = await User.findOne({ email: email.toLowerCase() });

//     if (!user) return res.status(404).json({ message: 'User not found' });

//     // Hash and update password
//     const hashed = await bcrypt.hash(newPassword, 10);
//     user.password = hashed;
//     await user.save();

//     // Send Resend Email to meneiljohnson@gmail.com
//     const { data, error } = await resend.emails.send({
//       from: 'onboarding@resend.dev',
//       to: 'meneiljohnson@gmail.com',
//       // to: email,
//       subject: '🔐 Password Change Notification (CRM)',
//       html: `
//         <div style="font-family: Arial, sans-serif; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
//           <h2 style="color: #2563eb;">Password Changed via Admin Panel</h2>
//           <p><strong>User Email:</strong> ${user.email}</p>
//           <p><strong>Role:</strong> ${user.role}</p>
//           <p><strong>Changed At:</strong> ${new Date().toLocaleString()}</p>
//         </div>
//       `,
//       text: `Password for user ${user.email} (role: ${user.role}) was changed by admin at ${new Date().toLocaleString()}`
//     });

//     if (error) {
//       console.error('Resend Email Error:', error);
//       return res.status(500).json({ message: 'Password changed, but failed to notify via email.' });
//     }

//     return res.status(200).json({ message: '✅ Password changed and notification sent.' });
//   } catch (err) {
//     console.error('Admin password change error:', err);
//     res.status(500).json({ message: 'Server error while updating password' });
//   }
// };


//=====================old=======================

const User = require('../models/User');
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET;

// 🔹 Role label mapping
const ROLE_LABELS = {
  admin: 'Admin',
  user: 'Employee',
  supervisor: 'Supervisor'
};
/**
 * @desc Register new user/admin/hr
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

    // 4. Check if already exists
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    // Optional: Limit admin count
    if (role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount >= 1) {
        return res.status(403).json({ message: '❌ Maximum of 1 admins are allowed' });
      }
    }

    // 5. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6. Create user
    const user = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
    });
    await user.save();

    // 7. Create employee record if user or supervisor
    if (role === 'user' || role === 'supervisor') {
      await Employee.create({
           userId: user._id,  
        name,
        email,
        // role: role === 'supervisor' ? 'Supervisor' : 'Employee',
        role: ROLE_LABELS[role],
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

    // 1. Required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // 2. Find user
    const user = await User.findOne({ email: email.toLowerCase() }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // 4. Token
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
         photo: user.photo || null,   // ✅ add this line
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
 * @desc Admin change password (primary admin only)
 */
exports.adminChangePassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    // Only primary admin can change
    if (req.user.email !== 'krishna@gmail.com') {
      return res.status(403).json({ message: '❌ Only primary admin can change passwords.' });
    }

    // Password format
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

    // Send email notification
    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'krishnaprasad24795@gmail.com',
      subject: '🔐 Password Change Notification (CRM)',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
          <h2 style="color: #2563eb;">Password Changed via Admin Panel</h2>
          <p><strong>User Email:</strong> ${user.email}</p>
          <p><strong>Role:</strong> ${user.role}</p>
          <p><strong>Changed At:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `,
      text: `Password for user ${user.email} (role: ${user.role}) was changed by admin at ${new Date().toLocaleString()}`,
    });

    if (error) {
      console.error('Resend Email Error:', error);
      return res
        .status(500)
        .json({ message: 'Password changed, but failed to notify via email.' });
    }

    return res.status(200).json({ message: '✅ Password changed and notification sent.' });
  } catch (err) {
    console.error('Admin password change error:', err);
    res.status(500).json({ message: 'Server error while updating password' });
  }
};



//=====================new code================

// const User = require('../models/User');
// const Employee = require('../models/Employee');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { Resend } = require('resend');
// const LoginHour = require('../models/loginHoursSchema');

// const resend = new Resend(process.env.RESEND_API_KEY);
// const JWT_SECRET = process.env.JWT_SECRET;



// // 🔹 Role label mapping
// const ROLE_LABELS = {
//   admin: 'Admin',
//   user: 'Employee',
//   supervisor: 'Supervisor'
// };
// /**
//  * @desc Register new user/admin/hr
//  */
// exports.register = async (req, res) => {
//   try {
//     const { name, email, password, role = 'user' } = req.body;

//     // 1. Required fields
//     if (!name || !email || !password) {
//       return res.status(400).json({ message: 'Name, email, and password are required' });
//     }

//     // 2. Email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({ message: 'Invalid email format' });
//     }

//     // 3. Password validation
//     const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
//     if (!passwordRegex.test(password)) {
//       return res.status(400).json({
//         message: 'Password must be at least 6 characters and contain both letters and numbers',
//       });
//     }

//     // 4. Check if already exists
//     const normalizedEmail = email.toLowerCase();
//     const existingUser = await User.findOne({ email: normalizedEmail });
//     if (existingUser) {
//       return res.status(409).json({ message: 'User already exists with this email' });
//     }

//     // Optional: Limit admin count
//     if (role === 'admin') {
//       const adminCount = await User.countDocuments({ role: 'admin' });
//       if (adminCount >= 1) {
//         return res.status(403).json({ message: '❌ Maximum of 1 admins are allowed' });
//       }
//     }

//     // 5. Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // 6. Create user
//     const user = new User({
//       name,
//       email: normalizedEmail,
//       password: hashedPassword,
//       role,
//     });
//     await user.save();

//     // 7. Create employee record if user or supervisor
//     if (role === 'user' || role === 'supervisor') {
//       await Employee.create({
//            userId: user._id,  
//         name,
//         email,
//         // role: role === 'supervisor' ? 'Supervisor' : 'Employee',
//         role: ROLE_LABELS[role],
//         dateOfJoining: new Date(),
//         photo: '',
//       });
//     }

//     res.status(201).json({ message: '✅ User registered successfully' });
//   } catch (err) {
//     console.error('❌ Register error:', err);
//     res.status(500).json({ message: 'Server error during registration' });
//   }
// };


// // exports.login = async (req, res) => {
// //   try {
// //     const { email, password } = req.body;

// //     // 1. Required fields
// //     if (!email || !password) {
// //       return res.status(400).json({ message: 'Email and password are required' });
// //     }

// //     // 2. Find user
// //     const user = await User.findOne({ email: email.toLowerCase() }).select('+password'); // Include password for comparison
// //     if (!user) return res.status(404).json({ message: 'User not found' });

// //     // 3. Compare password
// //     const isMatch = await bcrypt.compare(password, user.password);
// //     if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

// //     // 4. Find associated employee
// //     const employee = await Employee.findOne({ userId: user._id });
// //     if (!employee) {
// //       return res.status(404).json({ message: 'Employee record not found for this user' });
// //     }

// //     // 5. Create LoginHour record
// //     const loginHour = await LoginHour.create({
// //       employeeId: employee._id,
// //       date: new Date().toISOString().split('T')[0], // e.g., "2025-08-20"
// //       loginTime: new Date(),
// //       breaks: [],
// //     });
// //     console.log('Created LoginHour:', { employeeId: employee._id, loginHour }); // Debug log

// //     // 6. Generate token
// //     const token = jwt.sign(
// //       { userId: user._id, role: user.role, email: user.email },
// //       JWT_SECRET,
// //       { expiresIn: '7d' }
// //     );

// //     // 7. Store employee data in response
// //     res.json({
// //       token,
// //       user: {
// //         _id: user._id,
// //         name: user.name,
// //         email: user.email,
// //         role: user.role,
// //         photo: user.photo || null,
// //       },
// //       employee: {
// //         _id: employee._id,
// //         name: employee.name,
// //         role: employee.role,
// //       },
// //     });
// //   } catch (err) {
// //     console.error('❌ Login error:', {
// //       message: err.message,
// //       stack: err.stack,
// //     });
// //     res.status(500).json({ message: 'Login failed' });
// //   }
// // };

// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // 1. Required fields
//     if (!email || !password) {
//       return res.status(400).json({ message: 'Email and password are required' });
//     }

//     // 2. Find user
//     const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     // 3. Compare password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

//     // 4. Generate token
//     const token = jwt.sign(
//       { userId: user._id, role: user.role, email: user.email },
//       JWT_SECRET,
//       { expiresIn: '7d' }
//     );

//     // 5. Find associated employee and create LoginHour (only for non-admin roles)
//     let employee = null;
//     let loginHour = null;
//     if (user.role === 'supervisor' || user.role === 'user') {
//       employee = await Employee.findOne({ userId: user._id });
//       if (!employee) {
//         return res.status(404).json({ message: 'Employee record not found for this user' });
//       }

//       // Create LoginHour record
//       loginHour = await LoginHour.create({
//         employeeId: employee._id,
//         date: new Date().toISOString().split('T')[0], // e.g., "2025-08-20"
//         loginTime: new Date(),
//         breaks: [],
//       });
//       console.log('Created LoginHour:', { employeeId: employee._id, loginHour }); // Debug log
//     }

//     // 6. Prepare response
//     const response = {
//       token,
//       user: {
//         _id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         roleLabel: ROLE_LABELS[user.role] || user.role,
//         photo: user.photo || null,
//       },
//     };

//     // Include employee data for non-admin roles
//     if (employee) {
//       response.employee = {
//         _id: employee._id,
//         name: employee.name,
//         role: employee.role,
//         email: employee.email,
//       };
//     }

//     res.json(response);
//   } catch (err) {
//     console.error('❌ Login error:', {
//       message: err.message,
//       stack: err.stack,
//     });
//     res.status(500).json({ message: 'Login failed' });
//   }
// };

// /**
//  * @desc Count admins
//  */
// exports.getAdminCount = async (req, res) => {
//   try {
//     const count = await User.countDocuments({ role: 'admin' });
//     res.status(200).json({ count });
//   } catch (err) {
//     console.error('Error counting admins:', err);
//     res.status(500).json({ message: 'Server error while counting admins' });
//   }
// };

// /**
//  * @desc Admin change password (primary admin only)
//  */
// exports.adminChangePassword = async (req, res) => {
//   try {
//     const { email, newPassword } = req.body;

//     if (!email || !newPassword) {
//       return res.status(400).json({ message: 'Email and new password are required' });
//     }

//     // Only primary admin can change
//     if (req.user.email !== 'fbadmin@gmail.com') {
//       return res.status(403).json({ message: '❌ Only primary admin can change passwords.' });
//     }

//     // Password format
//     const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
//     if (!passwordRegex.test(newPassword)) {
//       return res.status(400).json({
//         message: 'Password must be at least 6 characters and contain both letters and numbers',
//       });
//     }

//     // Find user
//     const user = await User.findOne({ email: email.toLowerCase() });
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     // Update password
//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     user.password = hashedPassword;
//     await user.save();

//     // Send email notification
//     const { error } = await resend.emails.send({
//       from: 'onboarding@resend.dev',
//       to: 'meneiljohnson@gmail.com',
//       subject: '🔐 Password Change Notification (CRM)',
//       html: `
//         <div style="font-family: Arial, sans-serif; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
//           <h2 style="color: #2563eb;">Password Changed via Admin Panel</h2>
//           <p><strong>User Email:</strong> ${user.email}</p>
//           <p><strong>Role:</strong> ${user.role}</p>
//           <p><strong>Changed At:</strong> ${new Date().toLocaleString()}</p>
//         </div>
//       `,
//       text: `Password for user ${user.email} (role: ${user.role}) was changed by admin at ${new Date().toLocaleString()}`,
//     });

//     if (error) {
//       console.error('Resend Email Error:', error);
//       return res
//         .status(500)
//         .json({ message: 'Password changed, but failed to notify via email.' });
//     }

//     return res.status(200).json({ message: '✅ Password changed and notification sent.' });
//   } catch (err) {
//     console.error('Admin password change error:', err);
//     res.status(500).json({ message: 'Server error while updating password' });
//   }
// };
