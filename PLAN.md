# Plan: jira-dashboard

Goal: a plugin that shows a morning snapshot of relevant Jira tickets from the installer's own Jira site: New Tickets and Recent for the tracked projects as a whole, My Tickets for the installer, and later Sprint, with a personal review mark that keeps unreviewed tickets as a backlog. It replaces going to Jira and searching by hand. Each installer configures it; nothing is tied to one person's setup, and the released plugin ships no default projects.

## Current focus
- Phase 1: use it for a week on real tickets (scheduled runs from Mon 8:00), including the review backlog, and note what to change before Phase 2

## Open questions
- [ ] Sprint tab, per person: tickets assigned to that person, reported by them, or both? Waits until Phase 2 starts; a sprint's tickets are set at planning, so the tab shows what's still pending, not new tickets. Answer: _

## Next

### Phase 1: MVP on one setup
- [ ] Use it for a week on real tickets, and note what to change before Phase 2
- [ ] Discussion flag: mark any ticket on the dashboard "for discussion" to revisit with others, kept in the dashboard's database only (not in Jira), with a way to see every flagged ticket

### Phase 2: Sprint and team members
- [ ] Status setup before Sprint: list each tracked project's statuses per ticket type and have the installer mark which count as active, then tune it on real tickets; until it's set the Sprint tab shows a setup notice instead of rows
- [ ] Check that JQL's `openSprints()` works, and that results carry sprint
- [ ] Sprint tab, and a person selector ("me" plus each team member, a constant list for now) for Sprint and My Tickets
- [ ] Each refresh also pulls Sprint and My Tickets for each team member, with their caps, in the same batch write; use it for a week before Phase 3

### Phase 3: configurable for any installer
- [ ] Turn every constant from Phases 1 and 2 into the persisted settings listed in Decisions, with defaults from the Open questions answers (the project list and the status mapping get none)
- [ ] Setup step (`/jira-dashboard setup`): checks the Atlassian connector is connected and says to set it up when it isn't, asks for unset settings, runs the status setup, creates the scheduled task
- [ ] The page's `mcp` entry names the connector by its display name on this account ("Atlassian MCP"): find the installer's own name for it at setup instead
- [ ] Test from a fresh install against a different Jira site (the site and projects already come from each dashboard's own data)
- [ ] Marketplace entry in claude-tools and its README's Contents row; the /ai-skills/ page on primelogiclab.io

### Phase 4: alerts and notifications
- [ ] Notify about new tickets left to review and changed tickets for "me", where the host supports notifications; stay quiet otherwise
- [ ] Option to turn alerts off, or to include team members' tickets

## Done (last 10)
- Moved to its own repo, `claude-jira-dashboard` (v0.3.0), out of the claude-tools `dashboard-plans` branch: the Jira site and projects come from each dashboard's data instead of SKILL.md, and starting a dashboard asks for them; README, LICENSE and a `dev/` preview kit added
- Projects setting (`settings/main.projects`, from the full list in `lists/projects`; saving refreshes and reads the new projects' types and statuses first) and a per-tab project view, "All projects" by default, remembered per device (checked in a local preview)
- Per-tab settings: each tab has its own ticket types and statuses to hide (`settings/main.tabs`), added to its JQL as `issuetype in (…)` and `status not in (…)`, and carried rows follow them; statuses are read with the types into `types/main`; the Jira search links are gone, each tab's query shows as text (checked in a local preview)
- Recent and My Tickets tabs, and a Reviewed mark on New Tickets and Recent (v0.2.0): unreviewed tickets carry over with a "from Fri" chip, a reviewed one comes back when updated again, Mark all reviewed, tab badges count what's left; the page's refresh runs the same carry-over (checked in a local preview with a mocked connector); live dashboard refreshed by Claude: 2 new, 7 recent, 25 of 55 mine
- The page's own Refresh on claude.ai: queried Jira through the viewer's connector and rewrote the tab with the same result as the scheduled run, keeping the schedule; Save of ticket types refreshed too
- First scheduled run (Run now): reached the Atlassian connector and `ArtifactData` unattended in 43 s, used the saved ticket types, kept the schedule and window; 3 tickets, matching a separate count. No bundled MCP server needed
- Scheduled task `jira-dashboard-refresh` created (weekdays 8:00, Auto mode); a plugin can't ship one, so the skill creates it on request; `refresh/main.schedule` records it and the page shows the next run
- Page refreshes itself through the viewer's Atlassian connector: **Refresh** button, Save of ticket types refreshes, **Re-read types** reads at once; schedule setting on the page (days and time) saved as `settings/main.schedule`, applied when the user asks Claude
- Ticket types stored in `types/main` and read from Jira only when missing, when the tracked projects change, or after **Re-read types**
- Ticket type settings on the page: types and sub-tasks, ticked ones saved in `settings/main` and added to the JQL as `issuetype in (...)`; the page notes when saved types differ from the ones the rows used

## Decisions
- One plugin holds a skill and a scheduled task and ships no MCP server: it expects the installer to have Atlassian's own MCP connector set up, because Atlassian publishes and maintains it; the skill holds the formatting and behaviour rules, so the scheduled run and an on-demand ask produce the same dashboard
- Tabs instead of one list, because each answers a different question: New Tickets (what's new on the tracked projects), Recent (what changed on them), My Tickets (my open work), and in Phase 2 Sprint (the current sprint's pending items)
- New Tickets is project-wide, whoever the assignee or reporter: tickets on the tracked projects created since the refresh time on the previous refresh day (Friday's on a Monday), or since the last refresh if a run was missed, because a fixed 24 hours at 8:00 on Monday would miss the weekend; a refresh on demand uses the same start, so it never empties the tabs
- Recent is tickets on the tracked projects updated in the same window but created before it (`updated >= … AND created < …`), so a ticket shows on one tab, not both, and the cap counts only Recent's own tickets
- My Tickets is open tickets (status category not Done) assigned to the signed-in user on any project, because your own work isn't limited to the tracked projects; the status category stands in for the status setup, which Sprint still needs
- A personal review mark on New Tickets and Recent keeps unreviewed tickets on their tab after later refreshes until reviewed, because the user wants a backlog of what they haven't looked at; a reviewed ticket drops at the next refresh and comes back on Recent when it's updated again, since something changed after the review
- Review marks are one database document per ticket (`reviews/<KEY>`, with the ticket's `updated` at review time), not a field in the tab rows, so a click never rewrites a tab and a refresh never rewrites a review; Claude's refreshes delete marks for tickets no longer on either tab
- Statuses aren't predefined: the installer marks which count as active (not done), per project and ticket type, and the mapping needs tuning, because every Jira site customises its workflows; only Sprint filters by status, so the status setup comes with it in Phase 2
- Sprint shows pending items: current-sprint tickets in statuses mapped as active, because the status mapping is the only reliable sign of what's not done
- Sprint and My Tickets will show one person at a time in Phase 2: "me" (the signed-in Jira user, so no setting) by default, or a chosen team member; the choice is per-device browser storage like daily-organizer's person filter
- Persisted settings, filled in by the installer: Jira root URL, project keys to track (no default), the status mapping, team members, per-tab row caps and refresh time; they're plugin options, not SKILL.md text, because the plugin is shared from a public repo; it ships no credentials, since each installer signs in to their own Jira through the connector
- Each tab has its own ticket types and statuses to hide, set on the page and kept in its database (`settings/main.tabs`), not as plugin options, because they're tuned while looking at each tab's tickets
- The tracked projects are set on the page (`settings/main.projects`), not only as a plugin option, because which projects matter changes with the work; the project view on each tab only narrows what's shown and is per-device browser storage, because it's a quick look, not a setting
- The page has no links to Jira searches, only to single tickets, because the user judged search links unsafe; each tab's query shows as text instead
- The list of types is read from Jira once and kept in `types/main`, re-read only on request or when the tracked projects change, because a project's types rarely change
- The page also refreshes itself through the viewer's own Atlassian connector (`mcp` capability), alongside the scheduled task, because saving a setting should refresh at once and the scheduled task covers mornings when the page isn't open; the page follows the skill's Refreshing steps and keeps its own copy of the caps and default schedule, so the two must change together
- The refresh schedule is set on the page but applied to the scheduled task by Claude in a chat, because the app refuses changes to scheduled tasks in an unattended run
- Each tab is one database document holding its rows, not one document per ticket, because a batch takes at most 50 writes and a refresh replaces a whole tab at once
- The dashboard is an artifact page with its rows in the page's database, replaced by each refresh, because a scheduled run can update rows without republishing (same as daily-organizer); only unreviewed tickets outlive a refresh, so it keeps no other history
- Rows are capped, most recently updated first, with a link to the full Jira search when more match: 25 per search for New Tickets, Recent and My Tickets, and at most 50 carried-over tickets per tab; Sprint 5 per person (proposed, confirm before Phase 2); all are settings
- The refresh runs weekdays at 8:00 local time by default, so the snapshot is ready when the workday starts; the refresh time is a setting
- Phase 1 now covers New Tickets, Recent, My Tickets and the review backlog on one hardcoded setup, Phase 2 adds Sprint and team members with the status setup, and Phase 3 the options

## Parking lot
- (none)

## Gotchas
- Chat artifacts on claude.ai have no `db`; database-backed pages are made and written from Claude Code
- `ArtifactData` writes to an existing row need its `if_version`
- claude.ai connector tool names carry a per-account prefix (`mcp__<id>__searchJiraIssuesUsingJql`); the skill names tools without it
- Search results carry no URL: build it as `<root URL>/browse/<KEY>`
- Statuses per ticket type come from `listJiraStatuses` (mode `project`) through `executeRead`, not from JQL; each has a category: new, indeterminate or done
- The compact search view drops a requested `project` field; the key's prefix gives the project
- Absolute JQL dates (`created >= "2026-10-30 08:00"`) are read in the Jira profile's time zone; relative minutes (`created >= -2939m`) aren't, and they count across a DST change
- An `ArtifactData` batch takes at most 50 writes, each document once
- Desktop scheduled tasks run only while the Claude app is open (a missed run happens at the next launch), a plugin has no way to ship one, and an unattended run can't change scheduled tasks; `run_scheduled_task` from a session in auto mode was refused by the classifier, so test runs go through the app's Run now, on the task in the sidebar's Scheduled list (the Routines heading flips to Scheduled)
- The scheduled task's prompt reads SKILL.md by its full path, so moving the clone breaks it until the prompt is updated
- A page's `callTool` payload for the Atlassian connector is `{data: {...}}`, and Jira timestamps come as `-0400` without a colon, which some browsers won't parse
- Local previews of the page (`dev/build-preview.ps1`: the template plus the mocked `window.claude` in `dev/mock.js`) open in the browser pane as static snapshots: the query string is dropped and non-ASCII text shows garbled, so the script builds one file per state with non-ASCII escaped, and adds the viewport meta the publish skeleton would
- `encodeURIComponent` leaves `!`, `(` and `)` as they are, so a search link built by hand must match: `statusCategory%20!%3D%20Done`
