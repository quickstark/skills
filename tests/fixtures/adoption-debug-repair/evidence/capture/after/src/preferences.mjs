export class AuthenticationError extends Error { name = 'AuthenticationError'; }
export class HttpError extends Error {
  name = 'HttpError';
  constructor(status) { super(`HTTP ${status}`); this.status = status; }
}
export class PayloadError extends Error { name = 'PayloadError'; }

export async function savePreferences({ transport, credential, patch }) {
  const response = await transport('/preferences', {
    method: 'PATCH', headers: { Authorization: `Bearer ${credential}` },
    body: JSON.stringify(patch)
  });
  if (response.status === 401 || response.status === 403) {
    throw new AuthenticationError('Sign-in required');
  }
  if (!response.ok) throw new HttpError(response.status);
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch (error) {
    throw new PayloadError('Invalid preferences payload', { cause: error });
  }
}
