const path = require('path'); // ✅ required for express.static()
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const PORT = process.env.PORT || 5000;
const User = require('./models/User');


const app = express();
// app.use(cors());

const allowedOrigins = ['http://localhost:5173', 'https://crm-fr.onrender.com'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true, // if you're using cookies/auth headers
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//db connected
mongoose.connect(process.env.MONGO_URI)
  .then(() => {console.log("✅ MongoDB connected")})
  .catch((err) => {console.error("❌ MongoDB connection error:", err)});

// ✅ Route Imports (make sure these files export a router correctly)
const employeeRoutes = require("./routes/employee");
const taskRoutes = require("./routes/task");
const leaveRoutes = require("./routes/leave");
const attendanceRoutes = require("./routes/attendance");
const authRoutes = require('./routes/auth');
const { protect, adminOnly } = require('./middleware/authMiddleware');
const performanceRoutes = require('./routes/performanceRoutes');
const loginRoutes = require('./routes/loginHour');
const callLogs = require ('./routes/callLogs')
const dailyReportRoutes = require('./routes/dailyReport')
const weeklyOffRoutes = require('./routes/weeklyOffRoutes');


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ALSO serve from `/api/uploads/...` if needed
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads/documents', express.static(path.join(__dirname, 'uploads/documents')));
app.use('/api/uploads/tasks', express.static(path.join(__dirname, 'uploads/tasks')));



// ✅ Use Routes
app.use("/api/employees", employeeRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/hours', loginRoutes);
app.use('/api/call-logs',callLogs);
app.use('/api/daily-report', dailyReportRoutes);
app.use('/api/weekly-offs', weeklyOffRoutes);


app.get('/api/admin/data', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password'); // don't send password
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching admin data' });
  }
});

app.get('/api/user/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password'); // exclude password
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});
app.get('/test-image', (req, res) => {
  res.sendFile(path.join(__dirname, 'uploads', 'employee_1752784256852.jpeg'));
});


app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});




//==================
/*

const path = require('path');
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
require("dotenv").config();

const PORT = process.env.PORT || 5000;
const User = require('./models/User');

const app = express();

// ✅ Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression()); // ✅ Compress responses
app.use(helmet()); // ✅ Secure HTTP headers

// ✅ Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Connect DB with pool
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // optional but helps under load
}).then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ✅ Import Routes
const employeeRoutes = require("./routes/employee");
const taskRoutes = require("./routes/task");
const leaveRoutes = require("./routes/leave");
const attendanceRoutes = require("./routes/attendance");
const authRoutes = require('./routes/auth');
const performanceRoutes = require('./routes/performanceRoutes');
const loginRoutes = require('./routes/loginHour');
const callLogs = require('./routes/callLogs');
const { protect, adminOnly } = require('./middleware/authMiddleware');

// ✅ Use Routes
app.use("/api/employees", employeeRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/hours', loginRoutes);
app.use('/api/call-logs', callLogs);

// ✅ API endpoints
app.get('/api/admin/data', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching admin data' });
  }
});

app.get('/api/user/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Test Route
app.get('/test-image', (req, res) => {
  res.sendFile(path.join(__dirname, 'uploads', 'employee_1752784256852.jpeg'));
});

// ✅ Global Error Handler (optional)
app.use((err, req, res, next) => {
  console.error("🔴 Global error:", err.stack);
  res.status(500).json({ status: 'error', message: 'Server error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
*/