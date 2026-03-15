# Agent Notes

## Pending Security Work

- Continue the CSP hardening effort on inline styles.
- PR `#60` removed `script-src 'unsafe-inline'` by moving Astro inline scripts into bundled scripts.
- PR `#61` started the style cleanup on marketing pages, but the app still requires `style-src 'unsafe-inline'`.
- Next work should focus on removing inline `style=` attributes and inline `<style>` blocks from:
  - dynamic wedding Astro pages
  - admin/editor surfaces
  - shared layout/components where styles are still embedded in markup
- Keep this work isolated in separate worktrees/PRs so it does not interfere with parallel agents.
