# CI/CD Setup Guide

This document describes the Continuous Integration (CI) setup for Reflets de Bonheur and how to configure branch protection rules.

## Overview

The CI pipeline runs automatically on every pull request and ensures code quality, security, and stability before merging changes.

## CI Workflow Jobs

### 1. TypeScript Type Check
- **Purpose**: Ensures all TypeScript code compiles without errors
- **Command**: `npx tsc --noEmit`
- **Fail Condition**: Type errors present

### 2. Unit & Integration Tests
- **Purpose**: Runs all Vitest tests with coverage reporting
- **Command**: `npm run test:coverage`
- **Coverage Upload**: Codecov (optional, requires `CODECOV_TOKEN`)
- **Fail Condition**: Any test fails or coverage drops significantly

### 3. Build Verification
- **Purpose**: Ensures the production build succeeds
- **Command**: `npm run build`
- **Fail Condition**: Build fails or dist directory not created
- **Note**: Uses dummy Supabase credentials if secrets not configured

### 4. Security & Dependency Audit
- **Purpose**: Checks for security vulnerabilities and exposed secrets
- **Tasks**:
  - `npm audit` - Checks for known vulnerabilities in dependencies
  - TruffleHog - Scans for accidentally committed secrets
- **Fail Condition**: High/critical vulnerabilities or secrets found

### 5. Code Quality
- **Purpose**: Additional code quality checks
- **Tasks**:
  - Checks for `console.log` statements (warning only)
  - Lists TODO/FIXME comments
  - Reports bundle size
- **Fail Condition**: None (informational only)

### 6. All Checks Passed
- **Purpose**: Final gate that verifies all jobs succeeded
- **Fail Condition**: Any required job failed

## Secrets Configuration

### Required Secrets (for Codecov)
Navigate to **Repository Settings → Secrets and variables → Actions**

Add the following secrets:

| Secret Name | Purpose | Required |
|-------------|---------|----------|
| `CODECOV_TOKEN` | Upload coverage reports to Codecov | Optional |

### Optional Secrets (for Build)
These are optional - the build will use dummy values if not set:

| Secret Name | Example |
|-------------|---------|
| `PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | `eyJxxx...` |

## Branch Protection Rules

### Recommended Settings

Navigate to **Repository Settings → Branches → Add rule**

#### Main/Master Branch Protection

**Branch name pattern**: `main` (or `master`)

✅ **Enable these options:**

1. **Require a pull request before merging**
   - Require approvals: **1** (minimum)
   - Dismiss stale pull request approvals when new commits are pushed: ✅
   - Require review from Code Owners: ✅ (if using CODEOWNERS)

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging: ✅
   - **Required status checks** (select all):
     - `TypeScript Type Check`
     - `Unit & Integration Tests`
     - `Build Verification`
     - `Security & Dependency Audit`
     - `All CI Checks Passed`

3. **Require conversation resolution before merging**: ✅

4. **Require signed commits**: ✅ (highly recommended)

5. **Require linear history**: ✅ (optional, enforces rebase/squash)

6. **Include administrators**: ✅ (enforce rules for everyone)

7. **Restrict pushes that create matching branches**: ✅
   - Only allow specific people/teams to push

8. **Allow force pushes**: ❌ (disabled)

9. **Allow deletions**: ❌ (disabled)

## Workflow Triggers

The CI workflow runs on:
- **Pull Requests**: All branches
- **Push**: Only `main` and `master` branches

## Local Development Checklist

Before pushing code, ensure these pass locally:

```bash
# 1. Type checking
npx tsc --noEmit

# 2. Tests
npm test

# 3. Test coverage
npm run test:coverage

# 4. Build
npm run build

# 5. Security audit
npm audit
```

## Troubleshooting

### Build Fails Due to Missing Environment Variables
- Ensure dummy values are set in the workflow
- Or add actual secrets in repository settings

### Type Check Fails
- Run `npx tsc --noEmit` locally to see errors
- Fix type errors before pushing

### Tests Fail in CI but Pass Locally
- Ensure environment variables are consistent
- Check for race conditions or timing issues
- Verify Node.js version matches (v20)

### Coverage Upload Fails
- Ensure `CODECOV_TOKEN` is set in repository secrets
- Or set `fail_ci_if_error: false` (already configured)

### Dependabot PRs
- Dependabot creates automated PRs weekly for dependency updates
- Review and merge if CI passes
- Security updates may come more frequently

## Future Enhancements

### Planned Additions
1. **E2E Tests**: Playwright for end-to-end testing
2. **Visual Regression**: Percy or Chromatic for UI testing
3. **Performance Budget**: Lighthouse CI for performance monitoring
4. **Docker Build**: Containerized builds for consistency
5. **Preview Deployments**: Deploy PR previews automatically

### E2E Testing Setup (Future)

When ready to add E2E tests:

```bash
# Install Playwright
npm install -D @playwright/test

# Add to package.json scripts
"test:e2e": "playwright test"

# Add to CI workflow
- name: Run E2E tests
  run: npm run test:e2e
```

## Monitoring & Notifications

### GitHub Actions Status
- View workflow runs: **Actions tab** in repository
- Failed runs trigger email notifications to PR author

### Code Coverage Trends
- If using Codecov: View trends at `https://codecov.io/gh/kherembourg/RefletsDeBonheur`
- Coverage reports posted in PR comments

### Dependabot Alerts
- View security alerts: **Security tab → Dependabot alerts**
- Automatic PRs created for vulnerabilities

## Best Practices

1. **Never Skip CI**: Always wait for CI to pass before merging
2. **Write Tests**: Add tests for new features and bug fixes
3. **Keep Coverage High**: Aim for >80% code coverage
4. **Review Dependabot PRs**: Don't auto-merge, verify breaking changes
5. **Use Draft PRs**: For work-in-progress to avoid triggering CI unnecessarily
6. **Squash Commits**: Use "Squash and merge" for cleaner history

## Contact

For CI/CD issues or questions, contact the maintainers or open an issue.

---

**Last Updated**: January 20, 2026
