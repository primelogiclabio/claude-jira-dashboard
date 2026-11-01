---
name: jira-dashboard
description: Morning snapshot of Jira tickets (new and recently updated on the tracked projects, plus the user's own open tickets) in a Jira dashboard artifact on claude.ai, refreshed through the Atlassian connector, with a reviewed mark that keeps unreviewed tickets as a backlog and a flag for tickets to discuss. Use whenever the user asks to refresh, update, start or show their Jira dashboard, set up or change its refresh schedule, mark dashboard tickets reviewed or asks what they haven't reviewed, flags tickets for discussion or asks what's flagged, or asks what's new in Jira or which tickets came in or changed since yesterday; the scheduled refresh task runs it too.
---

# Jira dashboard

A claude.ai artifact page that saves the user searching Jira by hand each morning. It has four tabs:
- **New Tickets**: tickets created on the tracked projects since the last scheduled refresh.
- **Recent**: tickets on the tracked projects updated in that same window, leaving out the ones on New Tickets.
- **My Tickets**: open tickets assigned to the user, on any project.
- **Flagged**: every ticket the user flagged for discussion, with its note, until they unflag it.

On New Tickets and Recent the user marks each ticket reviewed. A ticket they haven't reviewed stays on its tab after later refreshes, marked with the day it came in, so nothing slips by. A reviewed ticket drops off at the next refresh, and comes back on Recent if it's updated again.

On any tab the user can flag a ticket to bring up with others, with an optional short note. Flags live only in the dashboard's database, never in Jira, and no refresh changes them.

The page is built from `template.html` in this skill's folder. Its rows aren't in the page's code: they're in the artifact's own database, which the page shows live and Claude writes with the `ArtifactData` tool.

A refresh happens three ways, all following the same rules:
- the scheduled task runs this skill on the refresh schedule (weekdays at 8:00 by default);
- the user asks Claude in chat;
- the user presses **Refresh** on the page, or saves the ticket types, and the page queries Jira itself through the user's Atlassian connector.

## Setup

Each dashboard keeps its own Jira site and projects in its database:
- **Jira site:** `refresh/main.site`, set when the dashboard is started (below).
- **Tracked projects:** `settings/main.projects`, else `refresh/main.projects`. The page's **Settings › Projects** changes them.

These values are fixed for now; later they become plugin options. The page keeps its own copy of the caps and the default schedule, so change them there too.

- Default refresh schedule: weekdays (Monday to Friday) at 08:00 local time
- Row cap per search: 25 (New Tickets, Recent and My Tickets each)
- Carried-over cap: 50 unreviewed tickets per tab from earlier windows
- Scheduled task id: `jira-dashboard-refresh`

## What it needs

- **The Atlassian connector**, Atlassian's own MCP server, set up on the user's account. Its tool names carry a per-account prefix (`mcp__<id>__searchJiraIssuesUsingJql`), so look for the tool by its last part. If `searchJiraIssuesUsingJql` isn't there, write nothing: say the dashboard needs the Atlassian connector and that it's added under **Settings › Connectors** on claude.ai. In a scheduled run there's no one to ask, so stop there.
- **The `Artifact` and `ArtifactData` tools**, which Claude Code sessions have. Chat artifacts on claude.ai have no database: without these tools, say the dashboard is refreshed from Claude Code, and change nothing.
- **The desktop app's scheduled-tasks tools** (`create_scheduled_task`, `update_scheduled_task`, `list_scheduled_tasks`) for the scheduled refresh. Without them, refresh anyway and leave the schedule as it is.

## Finding the dashboard

The dashboard is the artifact the user points at, by link or by name ("my Jira dashboard"), or the one already in play in the conversation. Otherwise, list the user's artifacts (`Artifact` `list`) and take the one titled **Jira Dashboard**. If there's more than one, ask which. If there's none and the user asks for one, start one (below). A scheduled run that finds none stops without creating one.

## The data

A schedule is `{days, time}`: `days` lists weekday numbers as cron counts them (0 Sunday to 6 Saturday), and `time` is `"HH:MM"` in 24-hour local time. Weekdays at 8:00 is `{"days": [1, 2, 3, 4, 5], "time": "08:00"}`.

A row is `{key, summary, type, status, statusCategory, assignee, created, updated, url}`:
- `statusCategory` is Jira's category name: `To Do`, `In Progress` or `Done`
- `assignee` is the display name, or `null` when unassigned
- `url` is `<root URL>/browse/<key>`; search results carry no URL
- on New Tickets and Recent, also `seen`: ISO timestamp of the refresh where the ticket first came in, and `carried: true` on rows kept from an earlier window

Documents:
- `refresh/main`:
  - `at`: ISO timestamp of the last refresh
  - `since`: ISO timestamp where that refresh's window started
  - `site`: the Jira root URL
  - `projects`: the tracked project keys
  - `schedule`, present once the scheduled task exists: the schedule it runs on
- `tabs/new` and `tabs/recent`, one document per tab:
  - `rows`: this window's tickets (up to the row cap, most recently updated first), then the carried ones, newest `seen` first
  - `total`: how many tickets matched this window's search, which can be more than the window's rows
  - `carried`: how many rows came from earlier windows
  - `jql`: the query, for display, with the window start as an absolute date
  - `issueTypes` and `ignoreStatuses`: the tab settings the refresh used
- `tabs/mine`: `rows`, `total`, `jql`, `issueTypes` and `ignoreStatuses`, with no review marks
- `reviews/<KEY>`, one document per reviewed ticket, written by the page (or by Claude when asked): `reviewedAt`, and `updated`, the ticket's `updated` when it was reviewed. A row counts as reviewed when its review exists and the row's `updated` isn't later than the review's.
- `flags/<KEY>`, one document per ticket flagged for discussion, written by the page (or by Claude when asked): `flaggedAt`, `note` (up to 200 characters, `""` when there's none) and `row`, a copy of the ticket's row (without `seen` or `carried`) from when it was flagged. The Flagged tab shows the freshest copy: the tabs' row with the latest `updated` when the ticket is on one, else `row`.
- `types/main`, written only when the types and statuses are read from Jira:
  - `types`: the issue types across the tracked projects, each `{name, subtask}`, sorted by name
  - `statuses`: the statuses across the tracked projects, each `{name, category}` with `category` `To Do`, `In Progress` or `Done`, sorted by name
  - `projects`: the project keys they were read for
  - `at`: ISO timestamp of when they were read
- `lists/projects`, written when the types and statuses are read: `projects`, every Jira project the user can see, each `{key, name}`, sorted by key, and `at`. The page's **Settings › Projects** offers these.
- `settings/main`, written by the page's **Settings** (or by Claude when asked):
  - `projects`, optional: the project keys New Tickets and Recent search; missing means the ones in `refresh/main.projects`
  - `tabs`: per-tab settings, `{new, recent, mine}`, each `{issueTypes, ignoreStatuses}`: the ticket types the tab includes (empty means every type) and the statuses it hides. A tab with no entry uses the older top-level `issueTypes` for New Tickets and Recent, and every type for My Tickets, and hides no statuses.
  - `issueTypes`, from before per-tab settings: the types New Tickets and Recent included
  - `schedule`, optional: the refresh schedule the user picked; it takes effect when Claude applies it to the task (below)
  - `typesRequested`, optional: ISO timestamp of a **Re-read types and statuses** click made where the page couldn't reach Jira
  - `updatedAt`: ISO timestamp of the last change to the tab settings

A tab is one document, not one per ticket, because a batch takes at most 50 writes and a refresh must replace the whole tab at once. Reviews and flags are one document per ticket so a click never rewrites a tab and a refresh never rewrites a review or a flag.

## Refreshing

1. **Find the window.** Get the current local time with its offset from the shell (`date -Iseconds`, or `Get-Date -Format o` in PowerShell). Take the schedule from `refresh/main.schedule`, or the default. The window starts at the schedule's time on the previous refresh day, the last day before today in its `days`: with the default, Friday's 8:00 for a Monday, or for a Saturday or Sunday run. If `refresh/main` has an `at` older than that, start at `at` instead, so a missed run loses nothing. A refresh on demand, later the same day, uses the same start, so it never empties the tabs. `<N>` below is the minutes from the window start to now, rounded up; relative minutes don't depend on the time zone in the user's Jira profile, which absolute JQL dates do.
2. **Read the current state.** `get` `settings/main`, `types/main`, `lists/projects`, `tabs/new` and `tabs/recent`, and `list` `reviews`. The tracked projects are `settings/main.projects`, else `refresh/main.projects`. Work out each tab's settings from `settings/main.tabs` (see The data for a tab with no entry). Types and statuses rarely change, so read them from Jira only when `types/main` doesn't exist, has no `statuses`, its `projects` differ from the tracked projects, or `settings/main.typesRequested` is later than `types/main.at`. To read them, through the connector's `executeRead`:
   - for each tracked project, `listJiraProjectIssueTypesMetadata` with `projectIdOrKey` set to the key; merge the types by name, keeping each one's `subtask` flag
   - for each tracked project, `listJiraStatuses` with `mode` `project` and `projectKey` set to the key; merge the statuses by name, mapping each `category` (`new`, `indeterminate`, `done`) to `To Do`, `In Progress` or `Done`
   - once, `listJiraProjects` with `maxResults` 100 (and `startAt` for more pages), keeping each project's `key` and `name`, for `lists/projects`
3. **Apply a schedule change.** If `settings/main.schedule` differs from `refresh/main.schedule` and the task exists (`list_scheduled_tasks`), `update_scheduled_task` `jira-dashboard-refresh` with the cron expression for it: `<minute> <hour> * * <days>`, such as `0 8 * * 1,2,3,4,5`, and use the new schedule from here on. The app refuses changes to scheduled tasks in a run nobody is watching, so a scheduled run skips this step, and so does a session without the scheduled-tasks tools; the page keeps showing the change as waiting until the user asks Claude to apply it.
4. **Search**, three times, with `searchJiraIssuesUsingJql`, `cloudId` the Jira root URL, `fields` `["summary", "issuetype", "status", "created", "updated", "assignee"]`, `maxResults` the row cap and `searchResultMode` `all` (which also returns `totalCount`). Each tab's `<filter>` is `AND issuetype in ("Customer Bug", "Internal Bug")` when its settings name types, then `AND status not in ("Paused", "Draft")` when they hide statuses, each name in double quotes; either part is left out when empty. Every query ends `ORDER BY updated DESC`.
   - New Tickets: `project in (<tracked projects>) <filter> AND created >= -<N>m`
   - Recent: `project in (<tracked projects>) <filter> AND updated >= -<N>m AND created < -<N>m`, which keeps this window's new tickets out
   - My Tickets: `assignee = currentUser() AND statusCategory != Done <filter>`
5. **Build the tabs.** Make rows from each search in the order Jira returned them. Give each New and Recent row a `seen`: the one it had on either tab before, or now. Then carry over the backlog:
   - **New Tickets**: this window's rows, then the old New rows that aren't reviewed and aren't among them, with `carried: true`. When a carried ticket also came back in Recent's search, use that fresher row's fields and keep its `seen`.
   - **Recent**: this window's rows minus any ticket now on New Tickets, then the old Recent rows that aren't reviewed and aren't on either list, with `carried: true`.
   - Drop carried rows whose type or status the tab's settings now leave out, so a status hidden today clears its old rows too.
   - Order carried rows newest `seen` first, and keep at most the carried-over cap per tab.
   - Write each tab's `jql` for display with the window start as an absolute local date, `"yyyy-MM-dd HH:mm"` in place of `-<N>m`. Don't build Jira search links: the page shows the query as text only.
6. **Write**, in one `ArtifactData` `batch` on the dashboard's `url`:
   - `set` `tabs/new` and `tabs/recent` with `rows`, `total`, `carried`, `jql`, `issueTypes` and `ignoreStatuses`
   - `set` `tabs/mine` with `rows`, `total`, `jql`, `issueTypes` and `ignoreStatuses`
   - `set` `refresh/main` with `at` (now), `since` (the window start), `site`, `projects` (the tracked projects this refresh searched), and `schedule` (the one the task now runs on) when the task exists
   - only if the types and statuses were read from Jira: `set` `types/main` with `types`, `statuses`, `projects` and `at` (now), and `lists/projects` with `projects` and `at`
   - `delete` the `reviews` documents whose ticket is now on neither New Tickets nor Recent, at most 40 per refresh; the next refresh deletes the rest

   Pass each read document's `version` as `if_version`; leave it out only for a document that doesn't exist yet. If the batch is refused because a document changed in between (say the user ticked a review), read again and redo steps 5 and 6. Never write `settings/main` during a refresh: a re-read request is done once `types/main.at` is later than it, and a schedule change once `refresh/main.schedule` matches it. Never write or delete `flags` during a refresh either: a flag stays until the user unflags it.
7. **Report.** On demand, reply with the counts per tab, how many tickets are left to review, up to five of them (key, summary, status) and the page's link. Mention when a `total` is more than the rows shown. A scheduled run writes and ends with one line: the counts, how many to review, and the new schedule if it changed.

Never republish the page to refresh it. Its code changes only when the user asks for a change to the page itself.

## Reviewing

The page's **Reviewed** checkbox on each New Tickets and Recent row sets or deletes `reviews/<KEY>`, and **Mark all reviewed** does it for every unreviewed row on the tab. In chat:
- "Mark OPS-142 reviewed": `set` `reviews/OPS-142` with `reviewedAt` (now) and `updated` (the row's `updated`), with the `if_version` if it already exists. "Not reviewed" or "unmark": `delete` it.
- "What haven't I reviewed?": list the rows on New Tickets and Recent that don't count as reviewed, carried ones with the day they came in.
- "Mark everything reviewed": one `batch` of `set`s for the unreviewed rows (at most 50 per batch).

There's no need to refresh after a review change; the page shows it at once.

## Flagging for discussion

The page's flag button next to each row's key, on every tab, sets or deletes `flags/<KEY>`. The **Flagged** tab lists the flags, most recently flagged first, with each note under its summary and **Add note** or **Edit note** to change it. In chat:
- "Flag OPS-142 for discussion", with or without a note ("…: ask who owns it"): take its row from a tab, else read the ticket with the connector's `getJiraIssue` (`cloudId` the Jira root URL) and build the row as a refresh would. `set` `flags/OPS-142` with `flaggedAt` (now), `note` (or `""`) and `row`. If it's already flagged, change only its note.
- "Note on OPS-142: …" or "change the note": `update` `flags/OPS-142` with `note` and its `if_version`. Keep a note to 200 characters.
- "Unflag OPS-142": `delete` it; its note goes with it.
- "What's flagged?" or "what's up for discussion?": list the flags newest first, each with key, summary, status and note. Take the status from the tabs' row when the ticket is on one; otherwise it's from `row`, so say it's as of when it was flagged.
- "Clear the flags", say after the meeting: confirm first, naming how many and that their notes go too, then one `batch` of `delete`s (at most 50 per batch).

As with reviews, the page shows a change at once; no refresh is needed.

## The scheduled refresh

A desktop-app scheduled task, `jira-dashboard-refresh`, runs a refresh on the schedule. It runs while the Claude desktop app is open; a run missed while the app was closed happens when it next opens. A plugin can't ship a scheduled task, so Claude creates it when the user asks ("set up the morning refresh"):

1. `create_scheduled_task` with `taskId` `jira-dashboard-refresh`, `title` "Jira dashboard refresh", the cron expression for the schedule (`settings/main.schedule`, or the default), and a self-contained prompt: refresh the Jira dashboard at the dashboard's URL by following this skill's **Refreshing** steps, read from this SKILL.md's full path; it's an unattended run, so ask nothing, and if something needed is missing, write nothing and say why in the last message.
2. Run a refresh, so `refresh/main.schedule` records the schedule and the page shows the next run.
3. Tell the user it runs while the desktop app is open, and that a missed run happens when it next opens.

When the user asks in chat to change the schedule, do step 3 of Refreshing straight away: `update_scheduled_task`, then `update` `refresh/main.schedule` (and `settings/main.schedule`, if set, to match) with their `if_version`.

## Tab settings

Each tab has its own settings: the ticket types it includes and the statuses it hides. The page's **Settings › Tab settings** picks a tab, offers the types (types and sub-tasks) and statuses (by category) in pickers, and saves that tab's choice as `settings/main.tabs.<tab>`, then refreshes. The statuses offered are the tracked projects' from `types/main`, plus any the tab's rows show, since My Tickets spans other projects. **Re-read types and statuses** reads them from Jira at once; where the page can't reach Jira, it sets `settings/main.typesRequested` instead, so the next refresh reads them. When the user asks in chat to re-read them, read them now (step 2 of Refreshing) and `set` `types/main` with its `if_version`; no full refresh is needed.

When the user asks in chat to search other projects ("add WEB to the dashboard", "only track OPS"), match the keys or names to `lists/projects`, ask when unclear, `update` `settings/main.projects` with its `if_version` (or `set` it), and refresh: the refresh reads the new projects' types and statuses.

When the user asks in chat to change a tab's settings ("only bugs on New Tickets", "hide Paused on My Tickets", "show every type again"):
1. Work out which tab they mean, and match their words to names in `types/main` or the tab's rows. Ask when the tab or the names aren't clear.
2. `update` `settings/main` with `tabs: {<tab>: {issueTypes, ignoreStatuses}}` and `updatedAt`, with its `if_version`; nested objects merge, so other tabs keep theirs. `set` it if it doesn't exist yet. Every type again is an empty `issueTypes`; hiding nothing is an empty `ignoreStatuses`.
3. Refresh, or offer to, since the change applies at the next refresh.

## The page

The page shows:
- **Header:** "Jira Dashboard", the Jira site and tracked projects, when it was refreshed (`refresh/main.at`) and the next scheduled refresh, and a **Refresh** button.
- **Theme switch:** Auto, Light or Dark. Auto follows claude.ai's theme; each device remembers its own choice in browser storage.
- **Tabs:** New Tickets, Recent, My Tickets and Flagged. New Tickets and Recent count the tickets left to review; My Tickets counts its tickets; Flagged counts its flags, once there are any.
- **Summary**, for the tab shown: how many tickets ("6 new tickets since Fri 8:00", "4 tickets updated since Fri 8:00", "12 open tickets assigned to you", "3 tickets flagged for discussion"), how many to review and from earlier days, and the split by project and by status category.
- **Rows**, most recently updated first, carried ones after:
  - on New Tickets and Recent, a **Reviewed** checkbox; reviewed rows are dimmed, and carried ones have a "from Fri" chip
  - key, linked to the ticket, then a flag button, filled when the ticket is flagged, with the note in its tooltip
  - summary
  - type
  - status, coloured by its category: grey for To Do, blue for In Progress, green for Done
  - assignee, or "Unassigned"
  - created (New Tickets), updated (Recent, My Tickets) or flagged (Flagged), as a day and time
- **Flagged tab:** the flags, most recently flagged first, each with its note and **Add note** or **Edit note** under the summary; editing is a text box with Save and Cancel (Enter and Esc). A ticket on no other tab shows as it was when flagged, with an "as of Tue" chip. It has no review marks or query.
- **Project view:** a menu above the rows, "All projects" by default, that shows one project's rows only. It changes nothing in the data; each device remembers its choice per tab in browser storage.
- **Mark all reviewed** above the rows on New Tickets and Recent, while any are left; with one project shown, it marks only that project's rows.
- **More than fit:** "25 of 40 shown". There are no links to Jira searches; each tab's query shows as text under its rows, and ticket keys link to their tickets.
- **Nothing there:** "No new tickets since Fri 8:00", "No open tickets assigned to you", and so on.
- **Pickers** in Settings show the chosen items as chips with × to remove them, and **Choose…** opens a panel with a filter box and the options in aligned columns, grouped.
- **Before the first refresh:** a short notice to ask Claude to refresh the dashboard; a tab that a newer page added and no refresh has filled yet says it fills at the next refresh.
- **Settings**, collapsed:
  - **Refresh schedule:** the schedule the task runs on, day checkboxes and a time, and Save schedule. A saved change shows as waiting until the user asks Claude to apply it.
  - **Projects:** a picker over every project from `lists/projects`, the tracked ones chosen, and Save projects (which also refreshes, reading the new projects' types and statuses first). Until the list is read, only the tracked projects show, with a button to load it.
  - **Tab settings:** a tab picker, then pickers for that tab's ticket types (types and sub-tasks) and statuses to hide (by category), Save (which also refreshes), Clear all, when the types and statuses were read, and **Re-read types and statuses**.

The page's own refresh follows the same Refreshing steps, except that it can't change the scheduled task, writes the three tabs and then `refresh/main` (`at` and `since` only) one at a time since a page has no batch, and leaves deleting old reviews to Claude's refreshes. Like Claude's, it never changes flags. It reads `site` from `refresh/main`, and the tracked projects from `settings/main.projects` or else `refresh/main.projects`, so a dashboard needs one refresh by Claude before the page's **Refresh** works. When the tracked projects differ from `types/main.projects`, it reads the types, statuses and project list first. Where the page can't use the connector (not allowed, not set up, or opened outside claude.ai), it says so and the button stays a way to try again.

## Starting one

1. Copy `template.html` from this skill's folder into the session's scratchpad (or the working directory) as `jira-dashboard.html`. Change nothing in it unless the user asked for a change.
2. Publish it with the `Artifact` tool:
   - `title`: `Jira Dashboard`
   - `icon`: `dashboard`
   - `description`: "New, recently updated and my own Jira tickets, with a review backlog."
   - `capabilities`: `{"db": {"rules": [{"path": "", "read": "admin", "write": "admin"}]}, "mcp": {"servers": [{"server": "Atlassian MCP", "tools": ["searchJiraIssuesUsingJql", "executeRead"]}]}}`

   The `db` rule keeps the rows to the owner and anyone they make an Editor, even if the page is shared. The `mcp` entry lets the page query Jira through the viewer's own Atlassian connector; claude.ai asks the viewer to allow it the first time. `server` is the connector's name on the user's claude.ai account, which may differ on another account.
3. Settle the Jira site and the projects to track:
   - **Site:** list the sites with the connector's `getAccessibleAtlassianResources`. Take the only one, or ask which when there are several. Use its URL, such as `https://example.atlassian.net`.
   - **Projects:** ask which projects New Tickets and Recent should track. To help, offer the projects of the user's recent tickets (`assignee = currentUser() OR reporter = currentUser()`, updated in the last 90 days) or the list from `listJiraProjects`.
   - `set` `settings/main` with `projects`. The first refresh writes `site` and `projects` into `refresh/main`.
4. Run a first refresh (above), then give the user the link, and offer to set up the scheduled refresh.

## Changing the page itself

Only when the user asks for a feature or a look the page doesn't have:
1. Read the current page with `Artifact` `read`, edit the saved file, and publish it to the same `url`.
2. Omit `capabilities` so the database rules and connector access carry over.
3. Keep the data fields above, so existing rows still show.
