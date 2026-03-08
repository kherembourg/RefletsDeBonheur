---
status: pending
priority: p3
issue_id: "069"
tags: [code-review, gdpr, compliance, data-integrity]
dependencies: ["055"]
---

# GDPR Compliance Gaps - No Data Export or Account Deletion

## Problem Statement

Three GDPR requirements are unmet:
1. **Right to data portability (Art. 20):** No endpoint to export all user data (photos, guestbook, RSVPs, account info)
2. **Right to erasure (Art. 17):** No account deletion flow. Even if DB rows are cascade-deleted, R2 objects remain (see todo #055)
3. **No audit trail for user operations:** Only god admin operations logged. No logs for media uploads, deletions, or config changes.

Additionally, `stripe_events` and `guest_sessions` tables grow unboundedly with no cleanup mechanism.

## Findings

- **Source:** Data Integrity Guardian (L1, L2, L3, H3)

## Proposed Solutions

- Create `GET /api/account/export` for data portability (ZIP with photos + JSON data)
- Create `DELETE /api/account` for account deletion (cascade DB + R2 cleanup)
- Add cleanup cron for `stripe_events` (30-day retention) and expired `guest_sessions`
- **Effort:** Large (8-12h)
- **Risk:** Medium

## Acceptance Criteria

- [ ] Users can export all their data
- [ ] Users can delete their account (DB + R2)
- [ ] Stale data cleaned up automatically

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by Data Integrity Guardian |
