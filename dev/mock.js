// Local stand-in for window.claude so template.html can be previewed outside claude.ai.
// window.__previewState: 'full' (default) | 'none' (no refresh yet) | 'empty' | 'slow' | 'oldtabs' (only tabs/new exists)
(() => {
  const mode = window.__previewState || 'full';
  const now = Date.now();
  const H = 3600000;
  const iso = (msAgo) => new Date(now - msAgo).toISOString();
  const mk = (key, summary, type, status, statusCategory, assignee, createdAgo, updatedAgo, extra) => ({
    key, summary, type, status, statusCategory, assignee,
    created: iso(createdAgo * H), updated: iso(updatedAgo * H), url: 'https://example.atlassian.net/browse/' + key, ...extra,
  });
  const since = iso(49 * H);
  const seenNow = iso(0.8 * H);
  // Every ticket here is made up; keep real tickets, names and workflows out of this file.
  const newRows = [
    mk('APP-412', 'Saved filters disappear after signing out and back in', 'Bug', 'In Progress', 'In Progress', 'Priya Raman', 3, 1, { seen: seenNow }),
    mk('APP-411', 'Move the nightly build to the new base image', 'Task', 'To Do', 'To Do', 'Tomás Ortega', 8, 3, { seen: seenNow }),
    mk('WEB-88', 'Resume large file uploads after a dropped connection', 'Sub-task', 'In Progress', 'In Progress', null, 13, 2, { seen: seenNow }),
    mk('APP-401', 'CSV export times out on large reports', 'Bug', 'Blocked', 'To Do', 'Mei Chen', 80, 60, { seen: iso(72 * H), carried: true }),
  ];
  const recentRows = [
    mk('APP-350', 'Sign-in page shows an old error after a password change', 'Bug', 'In Review', 'In Progress', 'Jonas Becker', 400, 5, { seen: seenNow }),
    mk('WEB-70', 'Show upload progress for each file', 'Sub-task', 'In Review', 'In Progress', 'Aisha Bello', 300, 9, { seen: seenNow }),
  ];
  const mineRows = [
    mk('APP-300', 'Speed up the dashboard summary query', 'Task', 'In Progress', 'In Progress', 'You', 500, 20),
    mk('APP-290', 'Fix the password reset link in emails', 'Sub-task', 'In Review', 'In Progress', 'You', 600, 30),
  ];
  const jql = (q) => 'https://example.atlassian.net/issues/?jql=' + encodeURIComponent(q);
  const docs = {
    'refresh/main': { at: seenNow, since, site: 'https://example.atlassian.net', projects: ['APP', 'WEB'], schedule: { days: [1, 2, 3, 4, 5], time: '08:00' } },
    'types/main': {
      at: iso(50 * H), projects: ['APP', 'WEB'],
      types: [['Bug', false], ['Task', false], ['Story', false], ['Sub-task', true]].map(([name, subtask]) => ({ name, subtask })),
      statuses: [['To Do', 'To Do'], ['Blocked', 'To Do'], ['Backlog', 'To Do'], ['In Progress', 'In Progress'], ['In Review', 'In Progress'], ['Done', 'Done']].map(([name, category]) => ({ name, category })),
    },
    'tabs/new': { rows: newRows, total: 3, carried: 1, issueTypes: [], searchUrl: jql('project in (APP, WEB) AND created >= "2026-10-30 08:00" ORDER BY updated DESC') },
    'tabs/recent': { rows: recentRows, total: 2, carried: 0, issueTypes: [], searchUrl: jql('project in (APP, WEB) AND updated >= "2026-10-30 08:00" ORDER BY updated DESC') },
    'tabs/mine': { rows: mineRows, total: 2, searchUrl: jql('assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC') },
    // APP-411 reviewed and unchanged since; WEB-88 reviewed but updated after, so it reads as not reviewed.
    'reviews/APP-411': { reviewedAt: iso(2 * H), updated: newRows[1].updated },
    'reviews/WEB-88': { reviewedAt: iso(4 * H), updated: iso(5 * H) },
  };
  if (mode === 'none') for (const k of Object.keys(docs)) if (!k.startsWith('types/')) delete docs[k];
  if (mode === 'empty') { docs['tabs/new'] = { ...docs['tabs/new'], rows: [], total: 0, carried: 0 }; }
  if (mode === 'oldtabs') { delete docs['tabs/recent']; delete docs['tabs/mine']; }
  window.__mockDocs = docs;

  const meta = { fromCache: false, hasPendingWrites: false };
  const snap = (path) => ({ id: path.split('/').pop(), exists: path in docs, data: () => docs[path], metadata: meta });
  const docListeners = {}, colListeners = {};
  const colSnap = (name) => {
    const list = Object.keys(docs).filter((p) => p.startsWith(name + '/')).map(snap);
    return { docs: list, size: list.length, empty: !list.length, metadata: meta, docChanges: () => [] };
  };
  const emit = (path) => {
    (docListeners[path] || []).forEach((fn) => fn(snap(path)));
    const col = path.split('/')[0];
    (colListeners[col] || []).forEach((fn) => fn(colSnap(col)));
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const docRef = (path) => ({
    onSnapshot(next) { (docListeners[path] = docListeners[path] || []).push(next); if (mode !== 'slow') setTimeout(() => next(snap(path)), 150); return () => {}; },
    get: async () => snap(path),
    set: async (data) => { await wait(120); docs[path] = { ...data }; emit(path); },
    update: async (data) => { if (!(path in docs)) throw { code: 'invalid_argument', message: 'missing' }; await wait(120); docs[path] = { ...docs[path], ...data }; emit(path); },
    delete: async () => { await wait(120); delete docs[path]; emit(path); },
  });
  const db = {
    doc: docRef,
    collection: (name) => ({
      doc: (id) => docRef(name + '/' + id),
      onSnapshot(next) { (colListeners[name] = colListeners[name] || []).push(next); if (mode !== 'slow') setTimeout(() => next(colSnap(name)), 150); return () => {}; },
    }),
  };
  const user = { canEdit: async () => true };

  // Stand-in for the Atlassian connector: made-up issues in the connector's payload shape, by query.
  const asIssue = (r) => ({ key: r.key, fields: { summary: r.summary, issuetype: { name: r.type }, status: { name: r.status, statusCategory: { name: r.statusCategory } }, assignee: r.assignee ? { displayName: r.assignee } : null, created: r.created.replace('Z', '-0000'), updated: r.updated.replace('Z', '-0000') } });
  window.__mcpCalls = [];
  const mcp = {
    callTool: async (server, tool, input) => {
      window.__mcpCalls.push({ server, tool, input });
      await wait(250);
      if (window.__mcpFail) throw { code: window.__mcpFail, message: 'mock failure', server };
      if (tool === 'executeRead' && input.name === 'listJiraProjects') return { payload: { data: { total: 3, values: [{ key: 'APP', name: 'Application' }, { key: 'OPS', name: 'Operations' }, { key: 'WEB', name: 'Web portal' }] } } };
      if (tool === 'executeRead' && input.name === 'listJiraStatuses') return { payload: { data: { statuses: [{ name: 'Open', category: 'new' }, { name: 'Building', category: 'indeterminate' }, { name: 'Closed', category: 'done' }] } } };
      if (tool === 'executeRead') return { payload: { data: { issueTypes: [{ name: 'Bug', subtask: false }, { name: 'Task', subtask: false }] } } };
      const q = input.jql;
      let list;
      if (q.includes('currentUser()')) list = mineRows.concat([mk('APP-280', 'Clarify the empty state on the reports page', 'Task', 'To Do', 'To Do', 'You', 700, 1)]);
      // Recent: WEB-70 again, plus APP-401 (carried on New) updated since, and a fresh one.
      else if (q.includes('updated >=')) list = [recentRows[1], { ...newRows[3], status: 'In Progress', statusCategory: 'In Progress', updated: iso(0.5 * H) }, mk('APP-360', 'Archive old report exports', 'Task', 'Backlog', 'To Do', null, 200, 2)];
      else list = newRows.slice(0, 2).concat([mk('APP-413', 'Add a dark mode to the admin pages', 'Story', 'To Do', 'To Do', 'Sam Okafor', 0.4, 0.3)]);
      return { payload: { data: { totalCount: list.length, isLast: true, issues: list.map(asIssue) } } };
    },
  };
  window.claude = { use: async (name) => (name === 'db' ? db : name === 'user' ? user : name === 'mcp' && !window.__noMcp ? mcp : null) };
})();
