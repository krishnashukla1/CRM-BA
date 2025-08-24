const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

// exports.protect = (req, res, next) => {
//   const authHeader = req.headers.authorization;
//    console.log('Auth header received:', authHeader); 

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res.status(401).json({ message: 'Unauthorized: No token' });
//   }

//   const token = authHeader.split(" ")[1];
// console.log('Token extracted:', token);
//   try {
//     const decoded = jwt.verify(token, JWT_SECRET);
//       console.log('Decoded token:', decoded); 
//     req.user = decoded;
    
//     next();
//   } catch (err) {
//       console.error('JWT verification failed:', err);
//     return res.status(403).json({ message: 'Token invalid or expired' });
//   }
// };

// Admin only access


// middleware/authMiddleware.js


const Employee = require('../models/Employee');
const User = require('../models/User'); // Assuming you have a User model

exports.protect = async (req, res, next) => {
  try {
    // 1. Get token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    // 3. Find user in either collection
    let user = await Employee.findOne({ 
      $or: [
        { _id: decoded.userId },
        { userId: decoded.userId }
      ]
    }).select('-password');

    if (!user) {
      user = await User.findById(decoded.userId).select('-password');
    }

    if (!user) {
      console.log('User not found in any collection');
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized' 
    });
  }
};

// controllers/authController.js
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id, // Always use _id as the consistent identifier
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};
//==================

exports.adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  next();
};

exports.authenticateUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer token
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user to request
    next(); // ✅ call next to continue
  } catch (err) {
    console.error('JWT verification failed:', err);
    res.status(401).json({ message: 'Invalid token' });
  }
};

//=====================================================================

// ✅ Middleware to verify JWT token
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('Auth header received:', authHeader); 

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: 'Unauthorized: No token' });
  }

  const token = authHeader.split(" ")[1];
  console.log('Token extracted:', token);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded token:', decoded); 
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT verification failed:', err);
    return res.status(403).json({ message: 'Token invalid or expired' });
  }
};

// ✅ Middleware to allow only admin users
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admins only' });
  }
  next();
};
