# GitHub Configuration

This directory contains GitHub-specific configuration files for Reflets de Bonheur.

## 📁 Directory Structure

```
.github/
├── workflows/
│   ├── ci.yml                    # Main CI pipeline (runs on PRs)
│   ├── pr-validation.yml         # PR title/description validation
│   └── scheduled-security.yml    # Weekly security audit
├── CODEOWNERS                     # Automatic review assignment
├── CI_SETUP.md                    # Detailed CI setup guide
├── dependabot.yml                 # Automated dependency updates
├── pull_request_template.md      # PR template
└── README.md                      # This file
```

## 🔄 Workflows

### 1. CI Pipeline (`ci.yml`)
**Triggers**: Pull requests to any branch, pushes to main/master

**Jobs**:
- ✅ **TypeScript Type Check** - Ensures code compiles
- ✅ **Unit & Integration Tests** - Runs Vitest with coverage
- ✅ **Build Verification** - Ensures production build succeeds
- ✅ **Security & Dependency Audit** - Checks for vulnerabilities
- ✅ **Code Quality** - Additional quality checks
- ✅ **All Checks Passed** - Final gate

**Duration**: ~3-5 minutes

**Required for merge**: Yes (configure branch protection)

### 2. PR Validation (`pr-validation.yml`)
**Triggers**: PR opened, edited, synchronized, reopened

**Jobs**:
- ✅ **PR Title** - Enforces conventional commit format
  - Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
  - Allowed scopes: `auth`, `gallery`, `guestbook`, `admin`, `ui`, `api`, `db`, `i18n`, `pwa`, `deps`
  - Example: `feat(gallery): add slideshow mode`
- ✅ **PR Description** - Ensures meaningful description (min 20 chars)
- ✅ **PR Size** - Warns if PR is too large (>50 files or >1000 lines)
- ✅ **PR Status** - Checks for WIP indicators
- ✅ **Linked Issues** - Warns if no issues referenced

**Duration**: ~30 seconds

**Required for merge**: Optional (helps maintain quality)

### 3. Scheduled Security Audit (`scheduled-security.yml`)
**Triggers**: Weekly on Mondays at 9:00 AM UTC, or manual

**Jobs**:
- 🔒 **Security Audit** - Runs `npm audit`
- 📊 **Outdated Dependencies** - Lists packages needing updates
- 🐛 **Create Issue** - Auto-creates issue if vulnerabilities found

**Duration**: ~2 minutes

**Required for merge**: No (runs on schedule)

## 🤖 Dependabot

**Configuration**: `dependabot.yml`

Automatically creates PRs for:
- **npm dependencies** - Weekly on Mondays at 9:00 AM
- **GitHub Actions** - Monthly

**Grouping**:
- Development dependencies (minor/patch) grouped together
- Production dependencies (minor/patch) grouped together
- Major versions get individual PRs

**Labels**: `dependencies`, `automated`

## 👥 Code Owners

**File**: `CODEOWNERS`

Automatically requests review from `@kherembourg` for:
- All files by default
- Specific paths: GitHub Actions, database, API, auth, tests, docs, config

## 📝 Pull Request Template

**File**: `pull_request_template.md`

Pre-fills PR description with:
- Description section
- Type of change checkboxes
- Related issues
- Changes made
- Testing checklist
- Screenshots/videos
- Code quality checklist

**Usage**: Automatically applied when creating a PR

## 🚀 Quick Start

### For Contributors

1. **Create a branch**:
   ```bash
   git checkout -b feat/your-feature
   ```

2. **Make changes and commit**:
   ```bash
   git add .
   git commit -m "feat(scope): your feature description"
   ```

3. **Push and create PR**:
   ```bash
   git push -u origin feat/your-feature
   ```

4. **Fill out PR template** - Describe your changes

5. **Wait for CI** - All checks must pass

6. **Get approval** - Request review if needed

7. **Merge** - Squash and merge when ready

### For Maintainers

1. **Enable Branch Protection**:
   - Go to Settings → Branches → Add rule
   - Follow guide in `CI_SETUP.md`

2. **Add Secrets** (optional):
   - Go to Settings → Secrets and variables → Actions
   - Add `CODECOV_TOKEN` for coverage reports

3. **Enable Dependabot**:
   - Already configured in `dependabot.yml`
   - Check Security → Dependabot

4. **Review Dependabot PRs**:
   - Review weekly dependency update PRs
   - Merge if CI passes and no breaking changes

## 📊 CI Status

Check workflow runs:
- Go to **Actions** tab in repository
- View results for each PR
- Click on job for detailed logs

## 🔧 Troubleshooting

### CI Failing?

1. **Type Errors**: Run `npx tsc --noEmit` locally
2. **Test Failures**: Run `npm test` locally
3. **Build Failures**: Run `npm run build` locally
4. **Security Issues**: Run `npm audit` and fix vulnerabilities

### PR Title Validation Failing?

Use format: `type(scope): description`

**Valid examples**:
- `feat(gallery): add slideshow mode`
- `fix(auth): resolve login timeout`
- `docs: update installation guide`
- `refactor(api): simplify upload logic`

**Invalid examples**:
- `Add feature` (missing type)
- `feat: Add feature` (capital letter in description)
- `feature(gallery): something` (wrong type name)

### Dependabot PRs Not Appearing?

- Check Settings → Code security and analysis → Dependabot
- Ensure Dependabot alerts and security updates are enabled

## 📚 Additional Resources

- **Detailed CI Guide**: See `CI_SETUP.md`
- **Branch Protection**: See `CI_SETUP.md` → Branch Protection Rules
- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Conventional Commits**: https://www.conventionalcommits.org/

## 🎯 Best Practices

1. ✅ Always wait for CI to pass before merging
2. ✅ Write meaningful commit messages
3. ✅ Keep PRs small and focused (< 50 files)
4. ✅ Add tests for new features
5. ✅ Link PRs to issues
6. ✅ Use draft PRs for work in progress
7. ✅ Review Dependabot PRs promptly
8. ✅ Don't skip or disable CI checks

## 📞 Support

For questions or issues with CI/CD:
- Open an issue with label `ci`
- Contact: @kherembourg

---

**Last Updated**: January 20, 2026
