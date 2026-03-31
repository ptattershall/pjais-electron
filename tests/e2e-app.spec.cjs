const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { test, expect, _electron: electron } = require('@playwright/test');

function resolveMainBundle(projectDir) {
  const candidates = [
    path.join(projectDir, '.webpack', 'x64', 'main', 'index.js'),
    path.join(projectDir, '.webpack', 'arm64', 'main', 'index.js'),
    path.join(projectDir, '.webpack', 'main', 'index.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

test.describe('Electron app', () => {
  test('window opens with PJais shell', async () => {
    const projectDir = path.join(__dirname, '..');
    const mainBundle = resolveMainBundle(projectDir);
    test.skip(
      !mainBundle,
      'Webpack main bundle missing — run `npm run package` or `npm start` once to compile .webpack',
    );

    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'pjais-pw-'));
    const electronExport = require('electron');
    const executablePath = typeof electronExport === 'string' ? electronExport : undefined;

    const electronApp = await electron.launch({
      args: [mainBundle],
      ...(executablePath ? { executablePath } : {}),
      env: {
        ...process.env,
        PJAIS_TEST_HOME: tmpHome,
      },
    });

    try {
      const window = await electronApp.firstWindow({ timeout: 90000 });
      await expect(window.getByRole('heading', { level: 1 })).toContainText('PJais', {
        timeout: 90000,
      });
    } finally {
      await electronApp.close();
      try {
        fs.rmSync(tmpHome, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });
});
