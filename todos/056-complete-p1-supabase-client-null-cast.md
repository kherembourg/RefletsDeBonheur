---
status: pending
priority: p1
issue_id: "056"
tags: [code-review, typescript, reliability]
dependencies: []
---

# Supabase Client is null Cast as SupabaseClient

## Problem Statement

When Supabase env vars are missing, `supabase` is `(null as unknown as SupabaseClient)`. Any code path that reaches `supabase.from(...)` without first checking `isSupabaseConfigured()` throws an opaque `TypeError: Cannot read properties of null`. The entire `api.ts` module (profilesApi, weddingsApi, mediaApi, etc.) uses `supabase` directly with zero null checks.

## Findings

- **Source:** TypeScript Reviewer (Issue 1), Silent Failure Hunter (Issue 4)
- **File:** `src/lib/supabase/client.ts` line 27
- **Evidence:** `(null as unknown as SupabaseClient)` — double cast to hide null

## Proposed Solutions

### Option A: Throw eagerly with descriptive error (Recommended)
- Create a proxy or getter that throws "Supabase is not configured. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY" on any access
- Or make the export type `SupabaseClient | null` and require narrowing
- **Effort:** Small (1h)
- **Risk:** Low

## Acceptance Criteria

- [ ] Missing Supabase config produces a clear, descriptive error
- [ ] No `null as unknown as T` casts in production code
- [ ] All `api.ts` functions either check config or get a clear error

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by TypeScript Reviewer + Silent Failure Hunter |
