/* eslint-disable no-undef */
/**
 * Google Drive backup/restore for local SQLite database.
 * Uses Google Identity Services (GIS) token flow + Drive API v3.
 * Stores backup in appDataFolder (hidden, app-specific, non-sensitive scope).
 */

import { exportData, importData, type DatabaseBackup } from './sqlite';

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILENAME = 'soma-backup.json';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

// Client ID must be set via environment variable
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let tokenResolve: ((token: string) => void) | null = null;
let tokenReject: ((err: Error) => void) | null = null;
let tokenPromise: Promise<string> | null = null;

interface BackupInfo {
  id: string;
  modifiedTime: string;
  size: string;
}

/**
 * Load the Google Identity Services library
 */
function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * Initialize the OAuth token client
 */
async function getTokenClient(): Promise<google.accounts.oauth2.TokenClient> {
  if (tokenClient) return tokenClient;

  await loadGisScript();

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response: google.accounts.oauth2.TokenResponse) => {
      if (response.error) {
        tokenReject?.(new Error(response.error));
      } else {
        accessToken = response.access_token;
        accessTokenExpiresAt = Date.now() + Number(response.expires_in ?? 3600) * 1000;
        tokenResolve?.(accessToken);
      }
      tokenResolve = null;
      tokenReject = null;
    },
  });
  return tokenClient;
}

/**
 * Request an OAuth access token (shows Google consent popup)
 */
export async function requestToken(): Promise<string> {
  if (tokenPromise) return tokenPromise;
  const client = await getTokenClient();

  const pending = new Promise<string>((resolve, reject) => {
    tokenResolve = resolve;
    tokenReject = reject;
    client.requestAccessToken();
  }).finally(() => {
    tokenPromise = null;
  });
  tokenPromise = pending;
  return pending;
}

/**
 * Get a valid access token, requesting one if needed
 */
async function getToken(): Promise<string> {
  const cachedToken = accessToken;
  if (cachedToken && Date.now() < accessTokenExpiresAt - 60_000) return cachedToken;
  accessToken = null;
  accessTokenExpiresAt = 0;
  return requestToken();
}

async function fetchWithToken(
  url: string,
  init: RequestInit = {},
  retry = true
): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers });
  if (response.status === 401 && retry) {
    accessToken = null;
    accessTokenExpiresAt = 0;
    return fetchWithToken(url, init, false);
  }
  return response;
}

/**
 * Check if there's an existing backup file in appDataFolder
 */
async function findBackupFile(): Promise<BackupInfo | null> {
  const response = await fetchWithToken(
    `${DRIVE_API}/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}'&fields=files(id,modifiedTime,size)`
  );

  if (!response.ok) {
    throw new Error(`Drive API error: ${response.status}`);
  }

  const data = await response.json();
  return data.files?.[0] || null;
}

/**
 * Backup the local database to Google Drive
 * Overwrites existing backup file (Drive keeps revisions automatically)
 */
export async function backup(): Promise<{ modifiedTime: string }> {
  const dbData = await exportData();
  const content = JSON.stringify(dbData);
  const blob = new Blob([content], { type: 'application/json' });

  const existing = await findBackupFile();

  if (existing) {
    // Update existing file
    const response = await fetchWithToken(
      `${UPLOAD_API}/files/${existing.id}?uploadType=media&fields=modifiedTime`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: blob,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    return { modifiedTime: result.modifiedTime };
  } else {
    // Create new file
    const metadata = {
      name: BACKUP_FILENAME,
      parents: ['appDataFolder'],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const response = await fetchWithToken(
      `${UPLOAD_API}/files?uploadType=multipart&fields=modifiedTime`,
      {
        method: 'POST',
        body: form,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    return { modifiedTime: result.modifiedTime };
  }
}

/**
 * Restore the database from a Google Drive backup
 */
export async function restore(): Promise<void> {
  const existing = await findBackupFile();

  if (!existing) {
    throw new Error('No backup found');
  }

  const response = await fetchWithToken(`${DRIVE_API}/files/${existing.id}?alt=media`);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  // Backups created before the format envelope was added were plain table maps.
  // Treat those as version 1 so existing user backups remain restorable.
  const backup: DatabaseBackup =
    data && typeof data === 'object' && 'tables' in data
      ? (data as DatabaseBackup)
      : { schemaVersion: 1, tables: data as DatabaseBackup['tables'] };
  await importData(backup);
}

/**
 * Get info about the latest backup
 */
export async function getBackupInfo(): Promise<BackupInfo | null> {
  if (!accessToken) return null;
  try {
    return await findBackupFile();
  } catch {
    return null;
  }
}

/**
 * Check if Google Drive backup is configured
 */
export function isConfigured(): boolean {
  return CLIENT_ID.length > 0;
}

/**
 * Revoke access (disconnect Google account)
 */
export function disconnect(): void {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {});
    accessToken = null;
    accessTokenExpiresAt = 0;
  }
}
