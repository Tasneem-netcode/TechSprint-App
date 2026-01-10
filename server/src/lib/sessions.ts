type Session = { email: string; createdAt: number };

const sessions = new Map<string, Session>();

function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function create(email: string) {
  const id = generateSessionId();
  sessions.set(id, { email, createdAt: Date.now() });
  return id;
}

function get(sessionId: string | undefined) {
  if (!sessionId) return undefined;
  return sessions.get(sessionId);
}

function destroy(sessionId: string) {
  sessions.delete(sessionId);
}

export { create, get, destroy };
// CommonJS compatibility
module.exports = { create, get, destroy };