import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockExportData = vi.fn();
const mockImportData = vi.fn();

vi.mock('./sqlite', () => ({
  exportData: (...args: unknown[]) => mockExportData(...args),
  importData: (...args: unknown[]) => mockImportData(...args),
}));

describe('Google Drive backup flow', () => {
  let tokenCallback: (response: Record<string, unknown>) => void;
  let requestAccessToken: ReturnType<typeof vi.fn>;
  let revoke: ReturnType<typeof vi.fn>;
  let tokenNumber: number;

  async function loadDrive() {
    vi.resetModules();
    return import('./googleDrive');
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    tokenNumber = 0;
    requestAccessToken = vi.fn(() => {
      tokenNumber += 1;
      tokenCallback({ access_token: `token-${tokenNumber}`, expires_in: 3600 });
    });
    revoke = vi.fn();
    const client = {
      requestAccessToken,
    };
    const google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn((options: { callback: typeof tokenCallback }) => {
            tokenCallback = options.callback;
            return client;
          }),
          revoke,
        },
      },
    };
    Object.defineProperty(window, 'google', { configurable: true, value: google });
  });

  it('requests a token once and reuses it for backup', async () => {
    const drive = await loadDrive();
    mockExportData.mockResolvedValue({ schemaVersion: 2, tables: { activities: [] } });
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ modifiedTime: 'now' }), { status: 200 })
      );

    await drive.backup();

    expect(requestAccessToken).toHaveBeenCalledOnce();
    const firstHeaders = vi.mocked(fetch).mock.calls[0][1]?.headers as Headers;
    expect(firstHeaders.get('Authorization')).toBe('Bearer token-1');
  });

  it('refreshes once after a 401 response', async () => {
    const drive = await loadDrive();
    mockExportData.mockResolvedValue({ schemaVersion: 2, tables: {} });
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: [] }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ modifiedTime: 'now' }), { status: 200 })
      );

    await drive.backup();

    expect(requestAccessToken).toHaveBeenCalledTimes(2);
    const refreshedHeaders = vi.mocked(fetch).mock.calls[1][1]?.headers as Headers;
    expect(refreshedHeaders.get('Authorization')).toBe('Bearer token-2');
  });

  it('updates an existing backup file instead of creating a duplicate', async () => {
    const drive = await loadDrive();
    mockExportData.mockResolvedValue({ schemaVersion: 2, tables: { activities: [] } });
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ files: [{ id: 'backup-1' }] }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ modifiedTime: 'updated' }), { status: 200 })
      );

    await expect(drive.backup()).resolves.toEqual({ modifiedTime: 'updated' });

    expect(vi.mocked(fetch).mock.calls[1][0]).toContain('/files/backup-1?');
    expect(vi.mocked(fetch).mock.calls[1][1]?.method).toBe('PATCH');
  });

  it('surfaces an OAuth denial from Google Identity Services', async () => {
    const drive = await loadDrive();
    requestAccessToken.mockImplementation(() => tokenCallback({ error: 'access_denied' }));

    await expect(drive.requestToken()).rejects.toThrow('access_denied');
  });

  it('surfaces upload and download HTTP failures', async () => {
    const drive = await loadDrive();
    mockExportData.mockResolvedValue({ schemaVersion: 2, tables: {} });
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 500 }));

    await expect(drive.backup()).rejects.toThrow('Upload failed: 500');

    vi.clearAllMocks();
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ files: [{ id: 'backup-1' }] }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response('{}', { status: 503 }));

    await expect(drive.restore()).rejects.toThrow('Download failed: 503');
  });

  it('restores legacy table-map backups as schema version 1', async () => {
    const drive = await loadDrive();
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ files: [{ id: 'backup-1' }] }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ activities: [{ id: 'activity-1' }] }), { status: 200 })
      );

    await drive.restore();

    expect(mockImportData).toHaveBeenCalledWith({
      schemaVersion: 1,
      tables: { activities: [{ id: 'activity-1' }] },
    });
  });

  it('reports no backup without attempting a restore import', async () => {
    const drive = await loadDrive();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ files: [] }), { status: 200 })
    );

    await expect(drive.restore()).rejects.toThrow('No backup found');
    expect(mockImportData).not.toHaveBeenCalled();
  });
});
