const { asyncHandler } = require('../utils/asyncHandler');
const service = require('../services/ApiService/onboarding.service');
exports.get = asyncHandler(async (req, res) => res.json({ success: true, onboarding: await service.get(req.user) }));
exports.advance = asyncHandler(async (req, res) => res.json({ success: true, onboarding: await service.advance(req.user, req.validatedBody.etape) }));
