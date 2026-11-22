const { appointmentDate } = require('./candidatureScore');
function candidatureActions(candidature, role, now = new Date()) {
  const appointment = appointmentDate(candidature.visite);
  const participant = ['locataire', 'bailleur'].includes(role);
  return {
    canConfirmAttendance: participant && candidature.type === 'visite' && candidature.statut === 'visitePrevue' && Boolean(appointment && +appointment < +now),
    canCancel: participant && ['en_attente', 'visitePrevue', 'acceptee', 'dossier_retenu'].includes(candidature.statut),
    appointmentAt: appointment?.toISOString() ?? null,
  };
}
module.exports = { candidatureActions };
