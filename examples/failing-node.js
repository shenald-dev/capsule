// Simulated realistic fullstack application crash
function validateAuthSession(session) {
  // Deliberate failure: session.user is undefined
  return session.user.id;
}

function handleIncomingRequest() {
  const mockSession = { authenticated: true };
  validateAuthSession(mockSession);
}

console.log('Server booting on port 3000...');
console.log('Connecting to PostgreSQL database at postgres://localhost:5432/app...');
handleIncomingRequest();
