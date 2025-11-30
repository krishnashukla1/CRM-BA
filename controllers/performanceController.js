const mongoose = require('mongoose');

const Performance = require('../models/Performance');
const Employee = require('../models/Employee');

exports.getEmployeePerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, groupByMonth } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const query = { employeeId: id };

    const performances = await Performance.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalCount = await Performance.countDocuments(query);

    if (groupByMonth === 'true') {
      const grouped = performances.reduce((acc, perf) => {
        const month = perf.month || 'Unknown';
        if (!acc[month]) {
          acc[month] = { totalSales: 0, totalTarget: 0 };
        }
        acc[month].totalSales += perf.sales || 0;
        acc[month].totalTarget += perf.target || 0;
        return acc;
      }, {});

      return res.status(200).json({
        status: 'success',
        message: 'Grouped performance data by month',
        data: grouped,
      });
    }

    const totalTarget = performances.reduce((sum, p) => sum + (p.target || 0), 0);
    const totalSales = performances.reduce((sum, p) => sum + (p.sales || 0), 0);
    const remaining = totalTarget - totalSales;
    const perDayGoal = totalTarget > 0 ? Math.round(totalTarget / 30) : 0;

    return res.status(200).json({
      status: 'success',
      message: 'Performance data fetched successfully',
      data: performances,
      summary: {
        totalTarget,
        totalSales,
        remaining,
        perDayGoal,
      },
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / Number(limit)),
        currentPage: Number(page),
        perPage: Number(limit),
      },
    });
  } catch (error) {
    console.error('❌ Error in getEmployeePerformance:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Server Error: Cannot fetch performance',
      error: error.message,
    });
  }
};

// ✅ POST: /api/performance (admin only)

exports.createOrUpdatePerformance = async (req, res) => {
  try {
    // const { employeeId, month, target, sales } = req.body;
    const { employeeId, month, target } = req.body;


    if (!employeeId || !month || target == null ) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields (employeeId, month, target, sales)'
      });
    }

    // Normalize month to standard 3-letter format
    const monthMap = {
      jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr',
      may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Aug',
      sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec'
    };

    const inputMonth = month.toLowerCase().substring(0, 3);
    const normalizedMonth = monthMap[inputMonth];

    if (!normalizedMonth) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid month format'
      });
    }

    const record = await Performance.findOneAndUpdate(
      {
        employeeId,
        month: normalizedMonth
      },
      {
        employeeId,
        month: normalizedMonth,
        target,
        // sales,
        updatedAt: new Date()
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'Performance data saved successfully',
      data: record
    });

  } catch (err) {
    console.error('Error in createOrUpdatePerformance:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to save performance data'
    });
  }
};

exports.getTopPerformers = async (req, res) => {
  try {
    const topPerformers = await Performance.aggregate([
      {
        $addFields: {
          performance: {
            $cond: [
              { $eq: ["$target", 0] },
              0,
              { $multiply: [{ $divide: ["$sales", "$target"] }, 100] }
            ]
          }
        }
      },
      {
        $sort: { performance: -1 }
      },
      {
        $group: {
          _id: "$employeeId",
          bestPerformance: { $max: "$performance" },
          latestSales: { $first: "$sales" },
          latestTarget: { $first: "$target" },
          latestMonth: { $first: "$month" }
        }
      },
      {
        $sort: { bestPerformance: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "_id",
          as: "employee"
        }
      },
      {
        $unwind: "$employee"
      },
      {
        $project: {
          _id: 1,
          name: "$employee.name",
          photo: "$employee.photo",
          bestPerformance: { $round: ["$bestPerformance", 2] },
          sales: "$latestSales",
          target: "$latestTarget",
          month: "$latestMonth"
        }
      }
    ]);

    if (!topPerformers.length) {
      return res.status(404).json({ message: "No top performers found" });
    }

    res.status(200).json({
      status: "success",
      message: "Top performers fetched successfully",
      data: topPerformers
    });
  } catch (error) {
    console.error("❌ Error in getTopPerformers:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllPerformance = async (req, res) => {
  try {
    const performanceData = await Performance.aggregate([
      {
        $lookup: {
          from: 'employees',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $unwind: {
          path: '$employee',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $project: {
          _id: 1,
          employeeId: 1,
          month: 1,
          sales: 1,
          target: 1,
          name: '$employee.name',
          photo: '$employee.photo'
        }
      },
      {
        $sort: {
          'month': 1,
          'name': 1
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      message: 'All performance data fetched successfully',
      data: performanceData
    });
  } catch (error) {
    console.error('❌ Error in getAllPerformance:', error);
    res.status(500).json({
      message: 'Error fetching performance',
      error: error.message
    });
  }
};

