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

