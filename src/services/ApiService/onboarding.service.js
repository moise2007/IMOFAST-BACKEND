const repository = require('../../repositories/onboarding.repository');
exports.get = user => repository.get(user.id);
exports.advance = (user, etape) => repository.advance({ userId: user.id, etape });
exports.markAlertsSeen = user => repository.markAlertsSeen(user.id);
