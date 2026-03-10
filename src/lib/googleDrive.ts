/* eslint-disable no-undef */
/**
 * Google Drive backup/restore for local SQLite database.
 * Uses Google Identity Services (GIS) token flow + Drive API v3.
 * Stores backup in appDataFolder (hidden, app-specific, non-sensitive scope).
 */

import { exportData, importData } from './sqlite';

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILENAME = 'soma-backup.json';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

// Client ID must be set via environment variable
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

let accessToken: string | null = null;
let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let tokenResolve: ((token: string) => void) | null = null;
let tokenReject: ((err: Error) => void) | null = null;

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
  const client = await getTokenClient();

  return new Promise((resolve, reject) => {
    tokenResolve = resolve;
    tokenReject = reject;
    client.requestAccessToken();
  });
}

/**
 * Get a valid access token, requesting one if needed
 */
async function getToken(): Promise<string> {
  if (accessToken) return accessToken;
  return requestToken();
}

/**
 * Check if there's an existing backup file in appDataFolder
 */
async function findBackupFile(token: string): Promise<BackupInfo | null> {
  const response = await fetch(
    `${DRIVE_API}/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}'&fields=files(id,modifiedTime,size)`,
    { headers: { Authorization: `Bearer ${token}` } }
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
  const token = await getToken();
  const dbData = await exportData();
  const content = JSON.stringify(dbData);
  const blob = new Blob([content], { type: 'application/json' });

  const existing = await findBackupFile(token);

  if (existing) {
    // Update existing file
    const response = await fetch(
      `${UPLOAD_API}/files/${existing.id}?uploadType=media&fields=modifiedTime`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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

    const response = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=modifiedTime`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

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
  const token = await getToken();
  const existing = await findBackupFile(token);

  if (!existing) {
    throw new Error('No backup found');
  }

  const response = await fetch(`${DRIVE_API}/files/${existing.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const data = await response.json();
  await importData(data);
}

/**
 * Get info about the latest backup
 */
export async function getBackupInfo(): Promise<BackupInfo | null> {
  if (!accessToken) return null;
  try {
    return await findBackupFile(accessToken);
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
  }
}
