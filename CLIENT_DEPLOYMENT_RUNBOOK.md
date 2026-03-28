# Client Deployment Runbook

This runbook covers rollout of the latest inbox scalability work to additional client environments.

Reference build:
- Commit: `4ec4a5d`
- Branch: `main`

## What This Release Changes

- Adds a `ConversationSummary` read model for active chat lists.
- Keeps `Message` as the source of truth; conversation summaries are derived data and can be rebuilt safely.
- Switches the inbox sidebar to a virtualized list with debounced search.
- Updates SSE and store handling so chat list updates patch one row instead of refreshing the full list.
- Recomputes unread counters and previews on inbound, outbound, template, and mark-read flows.

## Database Changes

This rollout includes these Prisma migrations:

- `20260325090000_whatsapp_identity_scope`
- `20260328090000_add_conversation_summary`

Important:
- `ConversationSummary` is safe to backfill or rebuild.
- Existing `Message` rows are not rewritten or deleted by the backfill step.
- If backfill is skipped, the first inbox load for a business number can still fall back to the legacy scan path once, but that will be slower.

## Pre-Deployment Checklist

1. Confirm the correct repo path for the client environment.
2. Confirm the correct environment target: `prd` or `dev`.
3. Preserve client-specific files such as `.env.local`.
4. Take a database snapshot or volume backup before deployment.
5. Make sure the checkout is either clean or that any local changes are intentionally preserved.

Current AKQS reference paths:
- Production: `/root/wakqs`
- Development: `/root/dev-wakqs`

## Standard Deployment Steps

Run these steps on the target client server:

```bash
cd /path/to/client-repo
git config --global --add safe.directory /path/to/client-repo
git fetch origin --prune
git checkout main
git pull --ff-only origin main
git rev-parse HEAD
./deploy.sh prd
```

Use `./deploy.sh dev` for development environments.

If the repo was previously updated by file copy or sync instead of Git and shows many unexpected local changes, normalize it first:

```bash
cd /path/to/client-repo
git config --global --add safe.directory /path/to/client-repo
git fetch origin --prune
git reset --hard origin/main
git clean -fd
```

Only use the reset path when you have already confirmed there are no local changes that need to be preserved.

## Post-Deployment Backfill

After the application starts successfully, backfill conversation summaries so the first large inbox load does not pay the legacy scan cost.

From an authenticated admin session in the browser console:

```js
await fetch('/api/admin/conversation-summaries/backfill', {
  method: 'POST',
}).then(async (response) => ({
  status: response.status,
  body: await response.json(),
}));
```

To backfill only one business number:

```js
await fetch('/api/admin/conversation-summaries/backfill?businessNumberId=YOUR_NUMBER_ID', {
  method: 'POST',
}).then(async (response) => ({
  status: response.status,
  body: await response.json(),
}));
```

Expected result:
- HTTP `200`
- JSON payload with `processedBusinessNumbers`, `backfilledChats`, and `details`

If you get `403`, the current session is not authenticated as an `ADMIN`.

The backfill can be rerun safely.

## Verification Checklist

1. Check local container health:

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

Adjust the port if the environment uses a different host mapping.

2. Check the public environment:

```bash
curl -fsS https://your-client-domain/api/health
```

3. Verify the repo is on the expected build:

```bash
git rev-parse HEAD
git status -sb
```

4. Validate the inbox in the browser:
- Open a business number with a large active chat list.
- Confirm the sidebar loads quickly.
- Confirm search remains responsive.
- Confirm unread counts update after mark-read.
- Confirm new inbound and outbound messages update the active chat row without a full list refresh.

5. Optional database check:

```sql
select count(*) from "ConversationSummary";
```

`ConversationSummary` should be populated after the backfill or after the first active-chat load fallback runs.

## Rollback Notes

- If the application must be rolled back, deploy the previous app commit or image as usual.
- Do not delete the `Message` table or the Postgres data volume.
- Leaving the `ConversationSummary` table in place is safe because it is derived data.
- If the deployment succeeded but backfill was missed, rerun the backfill after the fix; no message data needs to be restored for that operation.
