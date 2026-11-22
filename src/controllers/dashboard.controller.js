const { asyncHandler } = require('../utils/asyncHandler');
const service = require('../services/ApiService/dashboard.service');
exports.getDashboard = asyncHandler(async (req, res) => res.json({ success: true,
  data: await service.getDashboard({ user: req.user, days: req.validatedQuery.days }) }));
