const sessions = new Map();

function generateSessionId() {
    return 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function create(email) {
    const id = generateSessionId();
    sessions.set(id, { email, createdAt: Date.now() });
    return id;
}

function get(sessionId) {
    return sessions.get(sessionId);
}

function destroy(sessionId) {
    sessions.delete(sessionId);
}

module.exports = {
    create,
    get,
    destroy
};