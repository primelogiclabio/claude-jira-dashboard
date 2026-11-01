# jira-dashboard

A Claude skill that keeps a Jira dashboard on claude.ai: new, recently updated
and your own tickets from your Jira site, refreshed each morning through the
Atlassian connector, with a review mark that keeps unreviewed tickets as a
backlog.

Ask Claude to start one and it publishes the page from
[`template.html`](template.html), asks which Jira projects to track, and gives
you the link. It replaces opening Jira and running the same searches by hand
every morning.

**Status:** early. It works end to end on one setup and is being used daily
before it goes into the
[claude-tools](https://github.com/primelogiclabio/claude-tools) marketplace.
The plan is in [`PLAN.md`](PLAN.md).

## What the page shows

- **New Tickets:** tickets created on the projects you track since the last
  morning refresh. On a Monday that reaches back to Friday's.
- **Recent:** tickets on those projects updated in the same window, leaving
  out the ones already on New Tickets.
- **My Tickets:** your open tickets, on any project.
- **Flagged:** every ticket you've flagged for discussion, with its note.

Each search tab shows a summary (counts by project and status), the tickets
most recently updated first, and the query it ran.

### Reviewing

On New Tickets and Recent, tick **Reviewed** once you've looked at a ticket.
A ticket you haven't reviewed stays on its tab after later refreshes, with a
"from Fri" chip showing the day it came in, so nothing slips by. A reviewed
ticket drops off at the next refresh, and comes back on Recent if someone
updates it again. The tab badges count what's left to review, and
**Mark all reviewed** clears a tab.

### Flagging for discussion

Click the flag next to a ticket's key, on any tab, to keep it on **Flagged**
for bringing up with others, and add a short note there on what to raise. A
flag stays until you unflag it, even after the ticket leaves the other tabs;
it then shows as it was when you flagged it, with an "as of" chip. Flags live
only in the dashboard, never in Jira.

### Settings

- **Projects:** which projects New Tickets and Recent search.
- **Tab settings:** for each tab, the ticket types it includes and the
  statuses it hides.
- **Refresh schedule:** the days and time of the morning refresh.
- A project menu above each tab's rows shows one project at a time, and an
  **Auto / Light / Dark** switch sets the theme. Each device remembers both.

## How it refreshes

The tickets aren't written into the page. They're records stored with the
artifact on claude.ai, in its own database, and only you (and anyone you make
an Editor) can read them. They're refreshed three ways, all by the same rules:

- **On a schedule:** a Claude desktop scheduled task, weekdays at 8:00 by
  default. Claude sets it up when you ask. It runs while the desktop app is
  open; a run missed while the app was closed happens when it next opens.
- **When you ask** Claude in a Claude Code session ("refresh my Jira
  dashboard").
- **From the page:** the **Refresh** button, or saving a setting, queries Jira
  through your own Atlassian connector. claude.ai asks you to allow that the
  first time.

## What it needs

- The **Atlassian connector** (Atlassian's own MCP server) added to your
  claude.ai account under **Settings › Connectors**. The plugin ships no
  server and no credentials; everything runs as you.
- **Claude Code** (CLI, desktop Code tab or VS Code), which has the tools to
  publish the page and write its records. Chat artifacts on claude.ai have no
  database.
- The **Claude desktop app** for the scheduled refresh.

## Try it

It isn't in the marketplace yet. From a clone, either load it for one
session:

```sh
claude --plugin-dir C:\src\claude-jira-dashboard
```

or link the folder into your skills directory (put your clone's path in place
of `C:\src\claude-jira-dashboard`):

```powershell
New-Item -ItemType Junction -Path "$HOME\.claude\skills\jira-dashboard" -Target "C:\src\claude-jira-dashboard"
```

Then ask Claude to start a Jira dashboard.

## Developing

- `claude plugin validate .` checks the manifest.
- `dev/build-preview.ps1` builds local previews of the page with made-up data
  (`dev/mock.js`, which stands in for claude.ai's database and the Atlassian
  connector) into `dev/out/`, one file per state: full, dark, no refresh yet,
  empty, and a dashboard from before the newer tabs.
- [`SKILL.md`](SKILL.md) holds the rules Claude follows; the page's own
  refresh in `template.html` follows the same rules and keeps its own copy of
  the row caps and default schedule, so change them together.

## Files

```
claude-jira-dashboard/
├── .claude-plugin/plugin.json   lets this folder install as a plugin
├── SKILL.md                     the skill: frontmatter + instructions
├── template.html                the dashboard page Claude publishes
├── PLAN.md                      the plan, in project-progress format
├── dev/                         preview kit: mock.js, build-preview.ps1
└── README.md                    this file
```

## License

MIT, see [LICENSE](LICENSE).
