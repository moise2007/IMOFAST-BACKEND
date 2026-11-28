const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const cookieParser = require('cookie-parser');
const { resolveSession } = require('../services/ApiService/session.service');

const authFailure = () => ({ success: false, code: 'AUTH_REQUIRED', reconnection: true });
const connectionError = (message, code) => Object.assign(new Error(message), { data: { code } });

async function authenticateSocket(socket, next) {
    try {
        const parsed = cookie.parse(socket.handshake.headers.cookie || '');
        const accessToken = typeof parsed.token === 'string'
            ? cookieParser.signedCookie(parsed.token, process.env.COOKIE_SECRET)
            : null;
        const identity = await resolveSession({ accessToken });
        if (!identity) return next(connectionError('Non authentifié', 'AUTH_REQUIRED'));
        const { user, role } = identity;
        if (socket.handshake.auth.role !== role) return next(connectionError('Rôle invalide', 'FORBIDDEN'));
        const verified = role === 'admin' ? user.verified : user.verification?.emailVerifie || user.verification?.telephoneVerifie;
        if (!verified) return next(connectionError('Veuillez vérifier votre compte avant de continuer', 'FORBIDDEN'));
        socket.user = user;
        socket.role = role;

        // Le cookie du handshake reste figé : après expiration, le client doit
        // renouveler via HTTP puis ouvrir une nouvelle connexion avec ce cookie.
        socket.use((packet, proceed) => {
            try {
                jwt.verify(accessToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
            } catch {
                const callback = packet[packet.length - 1];
                if (typeof callback === 'function') callback(authFailure());
                // Aucun handler métier ne doit traiter cet événement refusé.
                return;
            }
            proceed();
        });
        next();
    } catch (error) {
        console.error('Authentification Socket.IO :', error);
        next(connectionError('Connexion indisponible', 'CONNECTION_FAILED'));
    }
}

module.exports = { authenticateSocket };
