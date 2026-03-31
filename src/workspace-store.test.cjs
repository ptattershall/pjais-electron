const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

let tmpDir;
let store;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pjais-node-test-'));
  process.env.PJAIS_TEST_HOME = tmpDir;
  const resolved = require.resolve('./workspace-store.js');
  delete require.cache[resolved];
  store = require('./workspace-store.js');
});

after(() => {
  delete process.env.PJAIS_TEST_HOME;
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('workspace-store (DAL)', () => {
  it('creates workspace with phases seeded', async () => {
    const ws = await store.createWorkspace({ name: 'Test Co', description: 'Unit test' });
    assert.match(ws.id, /^ws_/);
    const phases = await store.listPhases(ws.id);
    assert.strictEqual(phases.length, 8);
    assert.ok(phases[0].name.includes('Idea'));
    const tasks = await store.listTasks(ws.id);
    assert.ok(tasks.length >= 8, 'template tasks should seed at least one per phase');
  });

  it('creates and updates tasks with extended fields', async () => {
    const ws = await store.createWorkspace({ name: 'Task WS' });
    const phases = await store.listPhases(ws.id);
    const phaseId = phases[0].id;
    const due = Date.now();
    const task = await store.createTask({
      workspaceId: ws.id,
      title: 'Ship MVP',
      phaseId,
      description: 'Do the thing',
      owner: 'Alex',
      dueDate: due,
    });
    assert.strictEqual(task.phaseId, phaseId);
    assert.strictEqual(task.description, 'Do the thing');
    const updated = await store.updateTask(ws.id, task.id, {
      status: 'done',
      completionNotes: 'Shipped',
    });
    assert.strictEqual(updated.status, 'done');
    assert.strictEqual(updated.completionNotes, 'Shipped');
    assert.ok(updated.completedAt);
  });

  it('imports vault file and links as task evidence', async () => {
    const ws = await store.createWorkspace({ name: 'Vault WS' });
    const src = path.join(tmpDir, 'hello.txt');
    fs.writeFileSync(src, 'hello vault', 'utf8');
    const doc = await store.importVaultFile(ws.id, src);
    assert.strictEqual(doc.title, 'hello.txt');
    const task = await store.createTask({
      workspaceId: ws.id,
      title: 'Prove upload',
    });
    const withEvidence = await store.updateTask(ws.id, task.id, {
      evidenceDocumentId: doc.id,
    });
    assert.strictEqual(withEvidence.evidenceDocumentId, doc.id);
    assert.strictEqual(withEvidence.evidenceTitle, 'hello.txt');
  });

  it('manages memories and search', async () => {
    const ws = await store.createWorkspace({ name: 'Memory WS' });
    const m = await store.createMemory({
      workspaceId: ws.id,
      type: 'pricing',
      description: 'Starter plan is $99',
      sourceKind: 'manual',
    });
    assert.strictEqual(m.type, 'pricing');
    const list = await store.listMemories(ws.id);
    assert.ok(list.some((x) => x.id === m.id));
    const search = await store.searchWorkspace(ws.id, '99');
    assert.ok(search.memories.length > 0);
    await store.deleteMemory(ws.id, m.id);
    const after = await store.listMemories(ws.id);
    assert.ok(after.every((x) => x.id !== m.id));
  });

  it('chatWithAssistant returns context', async () => {
    const ws = await store.createWorkspace({ name: 'AI WS' });
    const res = await store.chatWithAssistant(ws.id, 'Hello', []);
    assert.ok(res.reply.includes('AI WS'));
    assert.ok(res.reply.includes('Open tasks'));
    assert.ok(Array.isArray(res.suggestedActions));
  });

  it('creates vault notes under vault/notes', async () => {
    const ws = await store.createWorkspace({ name: 'Note WS' });
    const doc = await store.createVaultNote(ws.id, { title: 'My Note', body: 'Hello **world**' });
    assert.strictEqual(doc.type, 'note');
    assert.ok(doc.path.includes('vault/notes/'));
    const list = await store.listVaultItems(ws.id);
    assert.ok(list.some((d) => d.id === doc.id));
  });

  it('persists weekly review in settings', async () => {
    const ws = await store.createWorkspace({ name: 'Maint WS' });
    const initial = await store.getWeeklyReview(ws.id);
    assert.ok(initial.items.length > 0);
    const next = {
      ...initial,
      items: initial.items.map((i) => (i.id === initial.items[0].id ? { ...i, done: true } : i)),
    };
    await store.saveWeeklyReview(ws.id, next);
    const loaded = await store.getWeeklyReview(ws.id);
    assert.strictEqual(loaded.items[0].done, true);
  });

  it('parsePjaisAssistantReply strips action block', async () => {
    const raw =
      'Hello\n\n<!--PJaisActions:[{"type":"navigate","section":"tasks"}]-->';
    const { reply, suggestedActions } = store.parsePjaisAssistantReply(raw);
    assert.strictEqual(reply, 'Hello');
    assert.strictEqual(suggestedActions.length, 1);
    assert.strictEqual(suggestedActions[0].type, 'navigate');
  });
});
