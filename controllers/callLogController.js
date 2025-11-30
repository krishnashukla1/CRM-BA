const CallLog = require('../models/CallLog');
const mongoose = require('mongoose');
const Employee = require('../models/Employee');


// ✅ Create new call log
exports.createCallLog = async (req, res) => {
  try {
    let {
      employeeId,
      callDirection,
      reasonForCall,
      typeOfCall,
      callCategory,
      callDescription,
      wasSaleConverted,
      saleConvertedThrough,
      profitAmount,
      chargebackRefund,   // ✅ new field
      reasonForNoSale,
      customerName,
      customerEmail,
      customerPhone,
      language
    } = req.body;

    // ✅ Validate required fields
    if (
      !employeeId ||
      !callDirection ||
      !reasonForCall ||
      !typeOfCall ||
      !callDescription ||
      !wasSaleConverted ||
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !language
    ) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // ✅ Validate callDirection
    if (!['INBOUND', 'OUTBOUND'].includes(callDirection)) {
      return res.status(400).json({ message: 'Invalid value for callDirection (must be INBOUND or OUTBOUND)' });
    }

    // ✅ Validate employeeId format
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employeeId format' });
    }

    // ✅ Confirm employee exists
    const employeeExists = await Employee.findById(employeeId);
    if (!employeeExists) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // ✅ Default chargebackRefund
    chargebackRefund = Number(chargebackRefund) || 0;

    // ✅ Sales logic
    if (wasSaleConverted === 'Yes') {
      reasonForNoSale = '';
      if (!profitAmount || isNaN(profitAmount)) {
        return res.status(400).json({ message: 'Profit amount required for successful sale' });
      }
      // saleConvertedThrough required if sale was made
      if (!saleConvertedThrough || !['Phone', 'WhatsApp', 'Email', 'Offline'].includes(saleConvertedThrough)) {
        return res.status(400).json({ message: 'Valid saleConvertedThrough is required when sale is converted' });
      }
    } else if (wasSaleConverted === 'No') {
      profitAmount = 0;
      chargebackRefund = 0; // no refund if no sale
      saleConvertedThrough = undefined;
      if (!reasonForNoSale) {
        return res.status(400).json({ message: 'Reason for no sale is required' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid value for wasSaleConverted (must be Yes or No)' });
    }

    // ✅ Calculate net profit
    const netProfit = Number(profitAmount || 0) - Number(chargebackRefund || 0);

    const callLog = new CallLog({
      employeeId,
      callDirection,
      reasonForCall,
      typeOfCall,
      callCategory: typeOfCall === 'Sales Inquiry' ? callCategory : undefined,
      callDescription,
      wasSaleConverted,
      saleConvertedThrough,
      profitAmount,
      chargebackRefund,   // ✅ save separately
      netProfit,          // ✅ store calculated
      reasonForNoSale,
      customerName,
      customerEmail,
      customerPhone,
      language
    });

    await callLog.save();

    res.status(201).json({ message: '✅ Call log saved successfully', data: callLog });

  } catch (error) {
    console.error('❌ Error saving call log:', error);
    res.status(500).json({ message: 'Server error while saving call log' });
  }
};

exports.getAllCallLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await CallLog.countDocuments();

    const logs = await CallLog.find()
      .populate('employeeId', 'name email')
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching call logs:', error);
    res.status(500).json({
      pagination: null,
      success: false,
      message: 'Server error while fetching call logs',
      error: error.message
    });
  }
};
// ✅ Get call logs for one employee
exports.getCallLogsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employeeId format' });
    }

    const logs = await CallLog.find({ employeeId });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employee call logs' });
  }
};


exports.getCallSummaryStats = async (req, res) => {
  try {
    // 📌 Date Filters from query
    const { filterType, startDate, endDate } = req.query;

    let matchQuery = {}; // default (no filter)
    const now = new Date();

    if (filterType === 'monthly') {
      // ✅ Current month
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      matchQuery.createdAt = { $gte: start, $lte: end };

    } else if (filterType === 'range' && startDate && endDate) {
      // ✅ Custom Date Range
      matchQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // ✅ Queries with filters
    const totalCalls = await CallLog.countDocuments(matchQuery);

    const totalSales = await CallLog.countDocuments({
      ...matchQuery,
      wasSaleConverted: 'Yes'
    });

    const totalProfitResult = await CallLog.aggregate([
      { $match: { ...matchQuery, wasSaleConverted: 'Yes' } },
      { $group: { _id: null, total: { $sum: '$profitAmount' } } }
    ]);
    const totalProfit = totalProfitResult[0]?.total || 0;

    const topCallCategories = await CallLog.aggregate([
      { $match: { ...matchQuery, typeOfCall: 'Sales Inquiry', callCategory: { $nin: [null, ''] } } },
      { $group: { _id: '$callCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);


    const callDirectionStats = await CallLog.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$callDirection', count: { $sum: 1 } } }
    ]);

    const saleConvertedThroughStats = await CallLog.aggregate([
      { $match: { ...matchQuery, wasSaleConverted: 'Yes' } },
      { $group: { _id: '$saleConvertedThrough', count: { $sum: 1 } } }
    ]);

    // ✅ Response
    res.status(200).json({
      status: 'success',
      message: 'Call summary stats fetched successfully',
      data: {
        totalCalls,
        totalSales,
        totalProfit,
        topCallCategories,
        callDirectionStats,
        saleConvertedThroughStats
      }
    });

  } catch (error) {
    console.error('❌ FULL ERROR STACK:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching employee call logs'
    });
  }
};

exports.getTodaySummary = async (req, res) => {
  const { employeeId } = req.params;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  try {
    // Fetch all today's logs with needed fields
    const logs = await CallLog.find({
      employeeId,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    }).select(
      'typeOfCall callCategory callDirection reasonForCall callDescription wasSaleConverted saleConvertedThrough profitAmount reasonForNoSale customerName customerEmail customerPhone language createdAt'
    );

    const totalCalls = logs.length;
    const salesConverted = logs.filter(log => log.wasSaleConverted === 'Yes');
    const rejections = logs.filter(log => log.wasSaleConverted === 'No');
    const languageBarriers = logs.filter(log => log.reasonForNoSale === 'Language barrier');
    const profitEarned = salesConverted.reduce(
      (sum, log) => sum + (log.profitAmount || 0),
      0
    );

    // Count reasons for no sale
    const reasonCounts = {};
    rejections.forEach(log => {
      const reason = log.reasonForNoSale || 'Unknown';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    res.json({
      totalCalls,
      salesCount: salesConverted.length,
      rejectionCount: rejections.length,
      profitEarned,
      languageBarriers: languageBarriers.length,
      reasonBreakdown: reasonCounts,
      callLogs: logs, // 👈 Include full logs with callDirection & saleConvertedThrough
    });
  } catch (err) {
    console.error('Get Call Summary Error:', err);
    res.status(500).json({ message: 'Failed to get summary' });
  }
};

