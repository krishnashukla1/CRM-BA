require("dotenv").config();
const { Resend } = require("resend");
const Employee = require("../models/Employee");

const resend = new Resend(process.env.RESEND_API_KEY);
// const VERIFIED_TEST_EMAIL = 'backend.9developer@gmail.com'; // Your verified Resend email
const VERIFIED_TEST_EMAIL = 'krishnaprasad24795@gmail.com'


exports.sendDailyReport = async (req, res) => {

    const isTest = req.path.includes('/email-test');

  try {
    const summary = req.body.summary || {};

    // Handle email recipient based on mode
    let email, employee;

    if (isTest) {
      // Test mode - use verified email only
      email = VERIFIED_TEST_EMAIL;
      employee = {
        name: req.body.name || "Test User",
        role: req.body.role || "Test Role",
        employeeId: "TEST123",
        workedHoursToday: 8,
        _id: "test123"
      };
    } else {
      // Production mode - use authenticated user data
      if (!req.body.employeeId) {
        return res.status(400).json({ error: "Employee ID is required" });
      }

      employee = await Employee.findById(req.body.employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      email = req.body.email || employee.email;
      if (!email) {
        return res.status(400).json({ error: "Email address is required" });
      }
    }

    // Create report content
    const reportDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Email content templates
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">${isTest ? '[TEST] ' : ''}Daily Work Report</h1>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <h2 style="color: #1e40af;">Employee Summary</h2>
          <p><strong>Name:</strong> ${employee.name}</p>
          <p><strong>Position:</strong> ${employee.role}</p>
          <p><strong>Employee ID:</strong> ${employee.employeeId || employee._id}</p>
          <p><strong>Date:</strong> ${reportDate}</p>
        </div>
        <div style="margin-top: 20px; background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <h2 style="color: #1e40af;">Today's Activities</h2>
         


<ul style="list-style-type: disc; padding-left: 20px;">
  <li>Total Calls Handled: ${summary.totalCalls || 0}</li>
  <li>Sales Converted: ${summary.salesCount || 0}</li>
  <li>Rejections: ${summary.rejectionCount || 0}</li>
  <li>Profit Earned: $${summary.profitEarned || 0}</li>
  <li>Chargeback/Refund: $${summary.chargebackRefund || 0}</li>
  <li>Net Profit: $${summary.netProfit || 0}</li>

  <li>Language Barrier Cases: ${summary.languageBarriers || 0}</li>
  <li>Top No‑Sale Reasons: ${summary.reasonBreakdown && Object.keys(summary.reasonBreakdown).length
        ? Object.entries(summary.reasonBreakdown).map(([r, c]) => `${r} (${c})`).join(', ')
        : 'None'
      }</li>
</ul>

        </div>
    

        ${isTest ? '<div style="background-color: #ecfdf5; padding: 8px; margin-top: 20px; border-radius: 5px; color: #047857; text-align: center; font-size: 12px;">✅ This is an email of daily call log report details.</div>' : ''}

      </div>
    `;



    const textContent = `
      ${isTest ? '[TEST] ' : ''}Daily Work Report - ${reportDate}
      ====================================

      Employee: ${employee.name}
      Position: ${employee.role}
      ID: ${employee.employeeId || employee._id}
      Date: ${reportDate}

      Today's Activities:
      ------------------
      - Completed all assigned tasks
      - Attended scheduled meetings
      - Met daily performance targets
      - Worked ${employee.workedHoursToday || 8} hours

      ${isTest ? 'NOTE: THIS IS A TEST EMAIL' : ''}
    `;

    // Send email using Resend API
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      // to: email,
      to:VERIFIED_TEST_EMAIL,
      subject: `${isTest ? '[TEST] ' : ''}Daily Work Report - ${reportDate}`,
      html: htmlContent,
      text: textContent
    });

    if (error) {
      console.error('Resend API error:', error);
      throw new Error(error.message);
    }

    return res.status(200).json({
      status: "success",
      message: isTest ? "Test report sent to verified email" : "Daily report sent successfully",
      data: {
        emailId: data.id,
        recipient: email,
        employee: employee.name,
        isTest: isTest
      }
    });

  } catch (err) {
    console.error("Daily report error:", err);
    return res.status(500).json({
      status: "error",
      message: err.message || "Failed to process daily report",
      ...(isTest && {
        hint: "Test emails must be sent to your verified Resend email address",
        solution: "Use backend.9developer@gmail.com for testing"
      })
    });
  }
};



//--------------------------------------------------------


// exports.sendDailyReport = async (req, res) => {
//   const isTest = req.path.includes('/email-test');

//   try {
//     let employee, email, report;

//     if (isTest) {
//       const { name, role } = req.body;

//       // 1. Find employee by name & role
//       employee = await Employee.findOne({ name, role });
//       if (!employee) return res.status(404).json({ message: 'Employee not found' });

//       // 2. Get today’s date
//       const today = new Date().toISOString().slice(0, 10);

//       // 3. Fetch today's report
//       report = await DailyReport.findOne({
//         employeeId: employee._id,
//         date: today
//       });

//       if (!report) return res.status(404).json({ message: 'Daily report not found' });

//       email = VERIFIED_TEST_EMAIL; // Only verified test email allowed
//     } else {
//       const { employeeId } = req.body;
//       if (!employeeId) return res.status(400).json({ error: "Employee ID is required" });

//       // 1. Fetch employee
//       employee = await Employee.findById(employeeId);
//       if (!employee) return res.status(404).json({ error: "Employee not found" });

//       // 2. Fetch today's report
//       const today = new Date().toISOString().slice(0, 10);
//       report = await DailyReport.findOne({ employeeId, date: today });
//       if (!report) return res.status(404).json({ message: 'Daily report not found' });

//       email = employee.email;
//       if (!email) return res.status(400).json({ error: "Email address is missing for this employee." });
//     }

//     const todayDate = new Date().toLocaleDateString('en-IN', {
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric'
//     });

//     // 📝 Text format
//     const textContent = `
// DAILY WORK REPORT - ${todayDate}
// Employee: ${employee.name}
// ID: ${employee._id}

// === Tasks Completed ===
// - Total Calls Handled: ${report.totalCalls}
// - Sales Converted: ${report.salesConverted}
// - Rejections: ${report.rejections}
// - Profit Earned: $${report.profitEarned}
// - Language Barrier Cases: ${report.languageBarrierCases}
// - Top No‑Sale Reasons: ${report.topReasons?.length ? report.topReasons.join(', ') : 'None'}

// ${isTest ? '\nNOTE: THIS IS A TEST EMAIL' : ''}
//     `;

//     // 🖼️ HTML format
//     const htmlContent = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h2 style="color: #1e40af;">${isTest ? '[TEST] ' : ''}Daily Work Report - ${todayDate}</h2>
//         <div style="padding: 15px; background: #f9fafb; border-radius: 8px;">
//           <p><strong>Employee:</strong> ${employee.name}</p>
//           <p><strong>ID:</strong> ${employee._id}</p>
//         </div>
//         <div style="margin-top: 20px;">
//           <h3 style="color: #1e3a8a;">Tasks Completed</h3>
//           <ul>
//             <li><strong>Total Calls Handled:</strong> ${report.totalCalls}</li>
//             <li><strong>Sales Converted:</strong> ${report.salesConverted}</li>
//             <li><strong>Rejections:</strong> ${report.rejections}</li>
//             <li><strong>Profit Earned:</strong> $${report.profitEarned}</li>
//             <li><strong>Language Barrier Cases:</strong> ${report.languageBarrierCases}</li>
//             <li><strong>Top No‑Sale Reasons:</strong> ${report.topReasons?.length ? report.topReasons.join(', ') : 'None'}</li>
//           </ul>
//         </div>
//         ${isTest ? `<div style="margin-top: 30px; color: #b91c1c;">This is a TEST email. Not a real report.</div>` : ''}
//       </div>
//     `;

//     // 📧 Send the email
//     const { data, error } = await resend.emails.send({
//       from: 'Ram CRM <onboarding@resend.dev>', // Change this to verified domain email after verification
//       to: email,
//       subject: `${isTest ? '[TEST] ' : ''}Daily Work Report - ${todayDate}`,
//       html: htmlContent,
//       text: textContent
//     });

//     if (error) {
//       console.error('Resend API error:', error);
//       throw new Error(error.message);
//     }

//     return res.status(200).json({
//       status: "success",
//       message: isTest ? "✅ Test report sent to verified email" : "✅ Daily report sent successfully",
//       data: {
//         emailId: data.id,
//         recipient: email,
//         employee: employee.name,
//         isTest
//       }
//     });

//   } catch (err) {
//     console.error("Daily report error:", err);
//     return res.status(500).json({
//       status: "error",
//       message: err.message || "Failed to send daily report",
//       ...(isTest && {
//         hint: "Resend only allows test emails to the verified address",
//         solution: "Use backend.9developer@gmail.com during testing"
//       })
//     });
//   }
// };


//-------------------------------------------------------------


// require("dotenv").config();
// const { Resend } = require("resend");
// const Employee = require("../models/Employee");
// const fetch = require("node-fetch");

// const resend = new Resend(process.env.RESEND_API_KEY);
// const VERIFIED_TEST_EMAIL = 'backend.9developer@gmail.com'; // Your verified Resend email

// exports.sendDailyReport = async (req, res) => {
//   try {
//     const isTest = req.path.includes('/email-test');

//     let email, employee;

//     if (isTest) {
//       email = VERIFIED_TEST_EMAIL;
//       employee = {
//         name: req.body.name || "Test User",
//         role: req.body.role || "Test Role",
//         employeeId: "TEST123",
//         workedHoursToday: 8,
//         _id: req.body.employeeId || "test123"
//       };
//     } else {
//       if (!req.body.employeeId) {
//         return res.status(400).json({ error: "Employee ID is required" });
//       }

//       employee = await Employee.findById(req.body.employeeId);
//       if (!employee) {
//         return res.status(404).json({ error: "Employee not found" });
//       }

//       email = req.body.email || employee.email;
//       if (!email) {
//         return res.status(400).json({ error: "Email address is required" });
//       }
//     }

//     // 📊 Fetch today's call summary
//     let summary = {};
//     try {
//       const response = await fetch(`https://crm-backend-f4lj.onrender.com/api/call-logs/summary/today/${employee._id}`);
//       if (response.ok) {
//         summary = await response.json();
//       } else {
//         console.warn('Call summary fetch failed');
//       }
//     } catch (err) {
//       console.warn('Error fetching summary:', err.message);
//     }

//     const totalCalls = summary.totalCalls || 0;
//     const salesCount = summary.salesCount || 0;
//     const rejectionCount = summary.rejectionCount || 0;
//     const profitEarned = summary.profitEarned || 0;
//     const languageBarriers = summary.languageBarriers || 0;
//     const reasonBreakdown = summary.reasonBreakdown || {};

//     const formattedReasons = Object.entries(reasonBreakdown).length
//       ? Object.entries(reasonBreakdown).map(([reason, count]) => `${reason} (${count})`).join(', ')
//       : 'None';

//     const reportDate = new Date().toLocaleDateString('en-US', {
//       weekday: 'long',
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric'
//     });

//     // 📩 Plain-text email (for Gmail compatibility & fallback)
//     const textContent = `
// ${isTest ? '[TEST] ' : ''}DAILY WORK REPORT - ${reportDate}
// Employee: ${employee.name}
// ID: ${employee.employeeId || employee._id}

// === Tasks Completed ===
// - Total Calls Handled: ${totalCalls}
// - Sales Converted: ${salesCount}
// - Rejections: ${rejectionCount}
// - Profit Earned: $${profitEarned}
// - Language Barrier Cases: ${languageBarriers}
// - Top No‑Sale Reasons: ${formattedReasons}

// ${isTest ? 'NOTE: THIS IS A TEST EMAIL - NOT A REAL REPORT' : ''}
// `;

//     // Optional: 📧 You can update htmlContent similarly if needed
//     const htmlContent = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h1 style="color: #2563eb;">${isTest ? '[TEST] ' : ''}Daily Work Report</h1>
//         <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
//           <h2>Employee Summary</h2>
//           <p><strong>Name:</strong> ${employee.name}</p>
//           <p><strong>Position:</strong> ${employee.role}</p>
//           <p><strong>Employee ID:</strong> ${employee.employeeId || employee._id}</p>
//           <p><strong>Date:</strong> ${reportDate}</p>
//         </div>
//         <div style="margin-top: 20px; background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
//           <h2>Performance Summary</h2>
//           <ul>
//             <li><strong>Total Calls:</strong> ${totalCalls}</li>
//             <li><strong>Sales Converted:</strong> ${salesCount}</li>
//             <li><strong>Rejections:</strong> ${rejectionCount}</li>
//             <li><strong>Profit Earned:</strong> $${profitEarned}</li>
//             <li><strong>Language Barriers:</strong> ${languageBarriers}</li>
//             <li><strong>No-Sale Reasons:</strong> ${formattedReasons}</li>
//           </ul>
//         </div>
//         ${isTest ? '<div style="color: #dc2626; margin-top: 20px;">TEST EMAIL - NOT A REAL REPORT</div>' : ''}
//       </div>
//     `;

//     const { data, error } = await resend.emails.send({
//       from: "onboarding@resend.dev",
//       to: email,
//       subject: `${isTest ? '[TEST] ' : ''}Daily Work Report - ${reportDate}`,
//       html: htmlContent,
//       text: textContent
//     });

//     if (error) {
//       console.error('Resend API error:', error);
//       throw new Error(error.message);
//     }

//     return res.status(200).json({
//       status: "success",
//       message: isTest ? "Test report sent to verified email" : "Daily report sent successfully",
//       data: {
//         emailId: data.id,
//         recipient: email,
//         employee: employee.name,
//         isTest: isTest
//       }
//     });

//   } catch (err) {
//     console.error("Daily report error:", err);
//     return res.status(500).json({
//       status: "error",
//       message: err.message || "Failed to process daily report",
//       ...(req.path.includes('/email-test') && {
//         hint: "Test emails must be sent to your verified Resend email address",
//         solution: "Use backend.9developer@gmail.com for testing"
//       })
//     });
//   }
// };
