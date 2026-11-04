# jira-dashboard

A Claude skill that keeps a Jira dashboard on claude.ai: new, recently updated
and your own tickets from your Jira site, refreshed each morning through the
Atlassian connector, with a review mark that keeps unreviewed tickets as a
backlog.

Ask Claude to start one and it publishes the page from
[`template.html`](template.html), asks which Jira projects to track, and gives
you the link. It replaces opening Jira and running the same searches by hand
every morning.

**Status:** early. It works end to end on one setup and is used daily. It
installs from the [claude-tools](https://github.com/primelogiclabio/claude-tools)
marketplace (see [Install](#install)).

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
for bringing up with others. A note box opens right away so you can say why
(or press **Skip**), and the note shows under the ticket wherever it appears.
A flag stays until you unflag it, even after the ticket leaves the other tabs.
Each refresh re-reads every flagged ticket, so its status stays current, and
**↻** on a Flagged row re-reads just that one. Flags live only in the
dashboard, never in Jira.

Refreshes also re-read the unreviewed tickets they carry over, so a carried
ticket shows its current status, and drops off if it moves into a status the
tab doesn't show or Jira no longer returns it.

### Settings

- **Projects:** which projects New Tickets and Recent search.
- **Tab settings:** for each tab, the ticket types and statuses it shows,
  with **Select all** for each group, such as a status category.
- **Refresh schedule:** the days and time of a scheduled refresh, if you want
  one, and **Turn off scheduled refresh** to stop it.
- A project menu above each tab's rows shows one project at a time, and an
  **Auto / Light / Dark** switch sets the theme. Each device remembers both.

## How it refreshes

The tickets aren't written into the page. They're records stored with the
artifact on claude.ai, in its own database, and only you (and anyone you make
an Editor) can read them. They're refreshed three ways, all by the same rules:

- **On a schedule, if you want one:** a Claude desktop scheduled task. There's
  none by default; Claude sets it up when you ask, and turns it off when you
  ask or press **Turn off scheduled refresh** on the page. It runs while the
  desktop app is open; a run missed while the app was closed happens when it
  next opens.
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
- The **Claude desktop app**, only for a scheduled refresh.

## Install

One line installs it, in either of two places:

- **Inside a Claude Code session** (CLI or desktop Code tab, 2.1.275+), type:
  ```
  /plugin install jira-dashboard --marketplace primelogiclabio/claude-tools
  ```
- **From a terminal** (PowerShell, bash; CLI 2.1.292+), run:
  ```
  claude plugin install jira-dashboard --marketplace primelogiclabio/claude-tools
  ```

Both add the `claude-tools` marketplace first if you haven't added it yet.
Then ask Claude to start a Jira dashboard.

The step-by-step instructions for both paths are in the
[claude-tools README](https://github.com/primelogiclabio/claude-tools#installing).
Notes specific to this skill:

- **As a plain skill, without the plugin wrapper.** Clone this repo and link
  it into your skills directory. Put your clone's path in place of
  `C:\src\claude-jira-dashboard`:

  ```powershell
  New-Item -ItemType Junction -Path "$HOME\.claude\skills\jira-dashboard" -Target "C:\src\claude-jira-dashboard"
  ```

  Remove the link only with `cmd /c rmdir "$HOME\.claude\skills\jira-dashboard"`.
  Never use `Remove-Item -Recurse` on a junction.
- **Avoid loading it twice.** If this skill is already saved to your claude.ai
  account under **Customize › Skills**, it syncs into signed-in Claude Code
  sessions as `jira-dashboard`. Installing the plugin as well adds a second
  copy, `jira-dashboard:jira-dashboard`, and the two compete. Keep one.
- **Your dashboard stays yours.** The skill holds no artifact link, Jira site
  or data; each person's dashboard is their own private artifact, reading
  their own Jira through their own connector.

## Developing

- `claude --plugin-dir C:\src\claude-jira-dashboard` loads a clone for one
  session, to try changes before they're released.
- `claude plugin validate .` checks the manifest.
- `dev/build-preview.ps1` builds local previews of the page with made-up data
  (`dev/mock.js`, which stands in for claude.ai's database and the Atlassian
  connector) into `dev/out/`, one file per state: full, dark, no refresh yet,
  empty, a dashboard from before the newer tabs, and no scheduled refresh.
- [`SKILL.md`](SKILL.md) holds the rules Claude follows; the page's own
  refresh in `template.html` follows the same rules and keeps its own copy of
  the row caps and the window with no schedule, so change them together.

## Files

```
claude-jira-dashboard/
├── .claude-plugin/plugin.json   lets this folder install as a plugin
├── SKILL.md                     the skill: frontmatter + instructions
├── template.html                the dashboard page Claude publishes
├── dev/                         preview kit: mock.js, build-preview.ps1
└── README.md                    this file
```

## License

MIT, see [LICENSE](LICENSE).
