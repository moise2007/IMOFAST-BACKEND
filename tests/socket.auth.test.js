const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const jwt = require('jsonwebtoken');
const { createHmac } = require('node:crypto');

const secret = 'socket-auth-test-secret';
const user = { id: 'user_doc', idPublic: 'user_public', verification: { emailVerifie: true } };
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (parent?.filename.endsWith('/src/sockets/auth.js') && request.endsWith('/session.service')) {
        return { async resolveSession({ accessToken }) {
            try { jwt.verify(accessToken, secret); } catch { return null; }
            return { user, role: 'locataire', sessionId: 'session_1' };
        } };
    }
    return originalLoad.call(this, request, parent, isMain);
};
let authenticateSocket;
try { ({ authenticateSocket } = require('../src/sockets/auth')); }
finally { Module._load = originalLoad; }

async function connect({ expiresIn = 60, role = 'locataire', missing = false, tampered = false } = {}) {
    process.env.JWT_SECRET = secret; process.env.COOKIE_SECRET = secret;
    const token = jwt.sign({ idsession: 'session_1' }, secret, { expiresIn });
    const signature = createHmac('sha256', secret).update(token).digest('base64').replace(/=+$/, '');
    const socket = {
        handshake: { headers: { cookie: missing ? '' : `token=${encodeURIComponent(`s:${token}.${tampered ? 'invalid' : signature}`)}` }, auth: { role } },
        use(handler) { this.packetMiddleware = handler; },
    };
    let error;
    await authenticateSocket(socket, result => { error = result; });
    return { socket, error };
}

test('missing, expired and tampered credentials produce a refreshable handshake error', async () => {
    for (const options of [{ missing: true }, { expiresIn: -1 }, { tampered: true }]) {
        const { error, socket } = await connect(options);
        assert.equal(error.data.code, 'AUTH_REQUIRED'); assert.equal(socket.packetMiddleware, undefined);
    }
});

test('role mismatch is forbidden rather than retried', async () => {
    const { error } = await connect({ role: 'bailleur' });
    assert.equal(error.data.code, 'FORBIDDEN');
});

test('expired access tokens cannot reach event handlers after connecting', async () => {
    const { socket, error } = await connect();
    assert.equal(error, undefined); assert.equal(socket.user, user);
    let processed = 0, refusal;
    socket.packetMiddleware(['sendMessage', {}, result => { refusal = result; }], () => processed++);
    assert.equal(processed, 1); assert.equal(refusal, undefined);
    const originalNow = Date.now;
    Date.now = () => originalNow() + 120000;
    try {
        socket.packetMiddleware(['sendMessage', {}, result => { refusal = result; }], () => processed++);
        socket.packetMiddleware(['typingChanged', {}], () => processed++);
    } finally { Date.now = originalNow; }
    assert.equal(processed, 1);
    assert.deepEqual(refusal, { success: false, code: 'AUTH_REQUIRED', reconnection: true });
});
