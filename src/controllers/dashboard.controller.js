const { asyncHandler } = require('../utils/asyncHandler');
const service = require('../services/ApiService/dashboard.service');

exports.getDashboard = asyncHandler(async (req, res) => {
  const days = req.validatedQuery?.days ?? (Number(req.query.days) || 7);
  const data = await service.getDashboard({ user: req.user, days });
  res.json({ success: true, data });
});