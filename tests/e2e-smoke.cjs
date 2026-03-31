const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');
const assert = require('node:assert');

const root = path.join(__dirname, '..');

describe('IPC surface smoke (preload ↔ main alignment)', () => {
  it('preload exposes methods that main registers', () => {
    const preload = fs.readFileSync(path.join(root, 'src', 'preload.js'), 'utf8');
    const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');

    const channels = [
      'workspace:list',
      'workspace:create',
      'phase:list',
      'task:list',
      'task:create',
      'task:update',
      'vault:list',
      'vault:createNote',
      'vault:importFile',
      'memory:list',
      'memory:create',
      'memory:update',
      'memory:delete',
      'workspace:search',
      'maintenance:getWeeklyReview',
      'maintenance:saveWeeklyReview',
      'settings:getOllamaModel',
      'settings:setOllamaModel',
      'browser:show',
      'browser:hide',
      'browser:setBounds',
      'browser:loadURL',
      'ai:chat',
      'ai:suggestMemory',
      'ai:health',
    ];

    for (const ch of channels) {
      assert.ok(
        main.includes(`'${ch}'`) || main.includes(`"${ch}"`),
        `main should register ${ch}`,
      );
    }

    assert.ok(preload.includes('listPhases'));
    assert.ok(preload.includes('createVaultNote'));
    assert.ok(preload.includes('importVaultFile'));
    assert.ok(preload.includes('listMemories'));
    assert.ok(preload.includes('searchWorkspace'));
    assert.ok(preload.includes('getWeeklyReview'));
    assert.ok(preload.includes('browserShow'));
    assert.ok(preload.includes('chatWithAssistant'));
    assert.ok(preload.includes('checkAiHealth'));
  });
});
