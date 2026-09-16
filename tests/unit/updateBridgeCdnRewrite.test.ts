/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/common/platform/bridge', () => ({
  bridge: {
    buildProvider: vi.fn(() => {
      const handlerMap = new Map<string, Function>();
      return {
        provider: vi.fn((handler: Function) => {
          handlerMap.set('handler', handler);
          return vi.fn();
        }),
        invoke: vi.fn(),
        _getHandler: () => handlerMap.get('handler'),
      };
    }),
    buildEmitter: vi.fn(() => ({
      emit: vi.fn(),
      on: vi.fn(),
    })),
  },
}));

vi.mock('electron', () => ({
  app: {
    getVersion: vi.fn(() => '1.0.0'),
    getPath: vi.fn(() => '/test/path'),
    exit: vi.fn(),
    isPackaged: true,
  },
  autoUpdater: {
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}));

vi.mock('electron-updater', () => ({
  autoUpdater: {
    logger: null,
    autoDownload: false,
    autoInstallOnAppQuit: true,
    allowPrerelease: false,
    allowDowngrade: false,
    setFeedURL: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    checkForUpdatesAndNotify: vi.fn(),
  },
}));

vi.mock('electron-log', () => ({
  default: {
    transports: { file: { level: 'info' } },
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const makeGitHubReleaseResponse = () => [
  {
    tag_name: 'v1.9.22',
    name: 'v1.9.22',
    body: 'release notes',
    html_url: 'https://github.com/iOfficeAI/AionUi/releases/tag/v1.9.22',
    published_at: '2026-04-29T00:00:00Z',
    prerelease: false,
    draft: false,
    assets: [
      {
        name: 'AionUi-1.9.22-mac-arm64.dmg',
        browser_download_url:
          'https://github.com/iOfficeAI/AionUi/releases/download/v1.9.22/AionUi-1.9.22-mac-arm64.dmg',
        size: 123,
        content_type: 'application/x-apple-diskimage',
      },
      {
        name: 'AionUi-1.9.22-win-x64.exe',
        browser_download_url: 'https://github.com/iOfficeAI/AionUi/releases/download/v1.9.22/AionUi-1.9.22-win-x64.exe',
        size: 456,
        content_type: 'application/vnd.microsoft.portable-executable',
      },
      {
        name: 'AionUi-1.9.22-linux-amd64.deb',
        browser_download_url:
          'https://github.com/iOfficeAI/AionUi/releases/download/v1.9.22/AionUi-1.9.22-linux-amd64.deb',
        size: 789,
      },
    ],
  },
];

const getCheckHandler = async () => {
  vi.resetModules();
  const { initUpdateBridge } = await import('@process/bridge/updateBridge');
  const { ipcBridge } = await import('@/common');

  initUpdateBridge();

  const provider = vi.mocked(ipcBridge.update.check.provider);
  const lastCall = provider.mock.calls.at(-1);
  if (!lastCall) throw new Error('update.check handler not registered');
  return lastCall[0];
};

const getAutoUpdateQuitAndInstallHandler = async () => {
  const { initUpdateBridge } = await import('@process/bridge/updateBridge');
  const { ipcBridge } = await import('@/common');

  initUpdateBridge();

  const provider = vi.mocked(ipcBridge.autoUpdate.quitAndInstall.provider);
  const lastCall = provider.mock.calls.at(-1);
  if (!lastCall) throw new Error('autoUpdate.quitAndInstall handler not registered');
  return lastCall[0];
};

const makeDeferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
};

// The check flow fetches the channel yml from the fork GitHub release
// (releases/latest/download/<channel>.yml); the GitHub API only enriches
// release notes. Serve both.
const CDN_CHANNEL_YML = `version: 1.9.22
files:
  - url: AionUi-1.9.22-mac-arm64.dmg
    size: 123
  - url: AionUi-1.9.22-win-x64.exe
    size: 456
  - url: AionUi-1.9.22-linux-amd64.deb
    size: 789
path: AionUi-1.9.22-mac-arm64.dmg
releaseDate: '2026-04-29T00:00:00Z'
`;

const stubCdnAndGitHubFetch = () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('https://github.com/') && url.includes('/releases/latest/download/')) {
      return new Response(CDN_CHANNEL_YML, { status: 200 });
    }
    if (url.startsWith('https://api.github.com/')) {
      return new Response(JSON.stringify(makeGitHubReleaseResponse()), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('updateBridge GitHub asset URL resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves asset.url and fallbackUrl to the fork GitHub release download URLs', async () => {
    const fetchMock = stubCdnAndGitHubFetch();

    try {
      const handler = await getCheckHandler();
      const result = await handler({ repo: 'iOfficeAI/AionUi' });

      expect(result.success).toBe(true);
      expect(result.data?.currentVersion).toBe('1.0.0');
      const assets = result.data?.latest?.assets ?? [];
      expect(assets.length).toBe(3);

      const macAsset = assets.find((a: { name: string }) => a.name === 'AionUi-1.9.22-mac-arm64.dmg');
      expect(macAsset).toBeDefined();
      expect(macAsset?.url).toBe(
        'https://github.com/iOfficeAI/AionUi/releases/download/v1.9.22/AionUi-1.9.22-mac-arm64.dmg'
      );
      expect(macAsset?.fallbackUrl).toBe(
        'https://github.com/iOfficeAI/AionUi/releases/download/v1.9.22/AionUi-1.9.22-mac-arm64.dmg'
      );

      const linuxAsset = assets.find((a: { name: string }) => a.name === 'AionUi-1.9.22-linux-amd64.deb');
      expect(linuxAsset?.url).toBe(
        'https://github.com/iOfficeAI/AionUi/releases/download/v1.9.22/AionUi-1.9.22-linux-amd64.deb'
      );
      expect(fetchMock).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('uses the tagged release download path for asset URLs', async () => {
    stubCdnAndGitHubFetch();

    try {
      const handler = await getCheckHandler();
      const result = await handler({ repo: 'iOfficeAI/AionUi' });
      const asset = result.data?.latest?.assets?.[0];
      expect(asset?.url).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\/v1\.9\.22\//);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('updateBridge download host allowlist', () => {
  it('accepts GitHub release URLs and rejects the removed upstream CDN host', async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-length': '0' }),
      body: {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined }),
        }),
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const { initUpdateBridge } = await import('@process/bridge/updateBridge');
      const { ipcBridge } = await import('@/common');

      initUpdateBridge();

      const provider = vi.mocked(ipcBridge.update.download.provider);
      const lastCall = provider.mock.calls.at(-1);
      if (!lastCall) throw new Error('update.download handler not registered');
      const handler = lastCall[0];

      const githubResult = await handler({
        downloadId: 'manual-download-1',
        url: 'https://github.com/Aafff623/my-AionUi/releases/download/v1.9.22/threetwoa-1.9.22-mac-arm64.dmg',
        file_name: 'threetwoa-1.9.22-mac-arm64.dmg',
      });
      expect(githubResult.success).toBe(true);
      expect(githubResult.data?.downloadId).toBe('manual-download-1');

      const cdnResult = await handler({
        downloadId: 'manual-download-2',
        url: 'https://static.aionui.com/releases/1.9.22/AionUi-1.9.22-mac-arm64.dmg',
        file_name: 'AionUi-1.9.22-mac-arm64.dmg',
      });
      expect(cdnResult.success).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('rejects non-allowlisted hosts', async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const { initUpdateBridge } = await import('@process/bridge/updateBridge');
    const { ipcBridge } = await import('@/common');

    initUpdateBridge();

    const provider = vi.mocked(ipcBridge.update.download.provider);
    const lastCall = provider.mock.calls.at(-1);
    if (!lastCall) throw new Error('update.download handler not registered');
    const handler = lastCall[0];

    const result = await handler({
      url: 'https://evil.example.com/fake.dmg',
      file_name: 'fake.dmg',
    });

    // Download is refused before any network I/O; exact error text comes from i18n and isn't asserted here.
    expect(result.success).toBe(false);
  });
});

describe('autoUpdate quitAndInstall lifecycle', () => {
  const originalPlatform = process.platform;

  const setPlatform = (platform: NodeJS.Platform): void => {
    Object.defineProperty(process, 'platform', {
      configurable: true,
      value: platform,
    });
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    setPlatform('win32');
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    setPlatform(originalPlatform);
  });

  it('waits for the pre-install cleanup before starting the installer', async () => {
    const cleanup = makeDeferred();
    const { autoUpdaterService } = await import('@process/services/autoUpdaterService');
    const { autoUpdater } = await import('electron-updater');

    autoUpdaterService.resetForTest();
    autoUpdaterService.setBeforeQuitAndInstall(async () => cleanup.promise);

    const installPromise = autoUpdaterService.quitAndInstall();
    await Promise.resolve();

    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();

    cleanup.resolve();
    await installPromise;

    expect(autoUpdater.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it('does not start the installer when the pre-install cleanup fails', async () => {
    const cleanupError = new Error('backend did not stop');
    const { autoUpdaterService } = await import('@process/services/autoUpdaterService');
    const { autoUpdater } = await import('electron-updater');

    autoUpdaterService.resetForTest();
    autoUpdaterService.setBeforeQuitAndInstall(async () => {
      throw cleanupError;
    });

    await expect(autoUpdaterService.quitAndInstall()).rejects.toThrow('backend did not stop');
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });

  it('keeps the IPC request pending until quitAndInstall cleanup completes', async () => {
    const cleanup = makeDeferred();
    const { autoUpdaterService } = await import('@process/services/autoUpdaterService');

    autoUpdaterService.resetForTest();
    autoUpdaterService.setBeforeQuitAndInstall(async () => cleanup.promise);

    const handler = await getAutoUpdateQuitAndInstallHandler();
    let handlerSettled = false;
    const handlerPromise = handler().then(() => {
      handlerSettled = true;
    });

    await Promise.resolve();

    expect(handlerSettled).toBe(false);

    cleanup.resolve();
    await handlerPromise;

    expect(handlerSettled).toBe(true);
  });

  it('propagates quitAndInstall failures through IPC', async () => {
    const cleanupError = new Error('native readiness failed');
    const { autoUpdaterService } = await import('@process/services/autoUpdaterService');

    autoUpdaterService.resetForTest();
    autoUpdaterService.setBeforeQuitAndInstall(async () => {
      throw cleanupError;
    });

    const handler = await getAutoUpdateQuitAndInstallHandler();

    await expect(handler()).rejects.toThrow('native readiness failed');
  });
});
