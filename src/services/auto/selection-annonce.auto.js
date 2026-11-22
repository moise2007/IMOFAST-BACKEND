const cron = require('node-cron');
const { refreshSelections } = require('../ApiService/selection-annonce.service');
function startSelectionJob() {
  return cron.schedule('0 18 * * 1', () => refreshSelections().catch(error => console.error('listing-selection', error.code || error.name)), { timezone: 'Africa/Douala' });
}
module.exports = { startSelectionJob };
