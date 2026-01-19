const PASSCODE_HASH_KEY = 'soma_passcode_hash';
const SESSION_KEY = 'soma_session';
const REMEMBER_KEY = 'soma_remember';

async function hashPasscode(passcode) {
  const encoder = new TextEncoder();
  const data = encoder.encode(passcode + 'soma_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function isFirstTimeSetup() {
  return !localStorage.getItem(PASSCODE_HASH_KEY);
}

export async function setupPasscode(passcode) {
  if (passcode.length < 4) {
    throw new Error('Passcode must be at least 4 characters');
  }
  const hash = await hashPasscode(passcode);
  localStorage.setItem(PASSCODE_HASH_KEY, hash);
  return true;
}

export async function verifyPasscode(passcode) {
  const storedHash = localStorage.getItem(PASSCODE_HASH_KEY);
  if (!storedHash) return false;
  const inputHash = await hashPasscode(passcode);
  return storedHash === inputHash;
}

export function createSession(remember = false) {
  const session = {
    authenticated: true,
    timestamp: Date.now(),
  };

  if (remember) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(REMEMBER_KEY, 'true');
  } else {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(REMEMBER_KEY);
  }
}

export function isAuthenticated() {
  if (localStorage.getItem(REMEMBER_KEY)) {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (Date.now() - parsed.timestamp < 30 * 24 * 60 * 60 * 1000) {
          return true;
        }
      } catch {
        // Invalid session
      }
    }
  }

  const session = sessionStorage.getItem(SESSION_KEY);
  if (session) {
    try {
      const parsed = JSON.parse(session);
      return parsed.authenticated === true;
    } catch {
      return false;
    }
  }

  return false;
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

export function resetAll() {
  localStorage.removeItem(PASSCODE_HASH_KEY);
  clearSession();
}
