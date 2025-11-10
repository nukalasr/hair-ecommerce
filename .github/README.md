# GitHub Configuration

This directory contains GitHub-specific configuration files for CI/CD, automation, and project management.

## 📁 Directory Structure

```
.github/
├── workflows/              # GitHub Actions workflows
│   ├── frontend-ci.yml    # Frontend testing and building
│   ├── backend-ci.yml     # Backend testing and building
│   ├── code-quality.yml   # Code quality checks
│   └── deploy.yml.template # Deployment workflow (template)
├── ISSUE_TEMPLATE/        # Issue templates
│   ├── bug_report.md      # Bug report template
│   └── feature_request.md # Feature request template
├── dependabot.yml         # Automated dependency updates
├── pull_request_template.md # PR template
└── README.md              # This file
```

## 🚀 GitHub Actions Workflows

### Frontend CI (`frontend-ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches (when frontend files change)
- Pull requests to `main` or `develop` branches

**Jobs:**
- **test-and-build**: Runs on Node.js 18.x and 20.x
  - Installs dependencies
  - Runs linter (if configured)
  - Executes unit tests with coverage
  - Builds production bundle
  - Analyzes bundle size
  - Uploads build artifacts and coverage reports

- **security-audit**:
  - Runs `npm audit` to check for vulnerabilities
  - Uploads audit results as artifacts

**Artifacts:**
- Frontend build (retained for 7 days)
- Coverage report (retained for 14 days)
- NPM audit results (retained for 30 days)

### Backend CI (`backend-ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches (when backend files change)
- Pull requests to `main` or `develop` branches

**Jobs:**
- **test-and-build**: Runs on Node.js 18.x and 20.x
  - Spins up MongoDB test database
  - Installs dependencies
  - Runs linter
  - Executes unit and integration tests
  - Tests server startup and health check endpoint
  - Uploads coverage reports

- **security-audit**:
  - Runs `npm audit` on backend dependencies
  - Uploads audit results

**Services:**
- MongoDB 7.0 (for integration testing)

### Code Quality (`code-quality.yml`)

**Triggers:**
- Pull requests to `main` or `develop`
- Push to `main`
- Weekly schedule (Sundays at midnight)

**Jobs:**
- **lighthouse**: Performance auditing with Lighthouse CI
- **bundle-analysis**: Bundle size tracking and limits
- **type-check**: TypeScript compilation checks
- **security-scan**: Trivy vulnerability scanning
- **code-coverage**: Test coverage reporting
- **performance-budget**: Performance budget checks

### Deployment (`deploy.yml.template`)

**Status:** Template (not active)

**Purpose:** Ready-to-use deployment workflow for:
- **Frontend**: Vercel or Netlify deployment
- **Backend**: Railway, Heroku, or Render deployment
- **Verification**: Post-deployment health checks

**To Enable:**
1. Rename `deploy.yml.template` to `deploy.yml`
2. Configure required secrets in GitHub Settings
3. Update deployment targets and environment variables
4. Uncomment the trigger section

**Required Secrets:**
- `VERCEL_TOKEN` or `NETLIFY_AUTH_TOKEN`
- `RAILWAY_TOKEN`, `HEROKU_API_KEY`, or `RENDER_DEPLOY_HOOK_URL`
- `STRIPE_SECRET_KEY` (production)
- `MONGODB_URI` (production)
- `JWT_SECRET` (production)

## 🤖 Dependabot

Automated dependency updates configured for:

- **Frontend dependencies**: Weekly updates (Mondays at 9 AM)
- **Backend dependencies**: Weekly updates (Mondays at 9 AM)
- **GitHub Actions**: Monthly updates

**Features:**
- Groups related packages together (e.g., all Angular packages)
- Auto-labels PRs with `dependencies`, `frontend`, or `backend`
- Ignores major version updates (manual review required)
- Limits to 5 open PRs at a time

**To Configure:**
Replace `yourusername` in `dependabot.yml` with your GitHub username.

## 📝 Issue Templates

Two issue templates are provided:

### Bug Report
- Structured format for reporting bugs
- Includes environment details
- Priority classification
- Steps to reproduce

### Feature Request
- Problem statement and proposed solution
- Use cases and benefits
- Implementation considerations
- Acceptance criteria

## 🔀 Pull Request Template

The PR template includes sections for:
- Description and type of change
- Related issues
- Testing checklist
- Security and performance considerations
- Deployment notes

## 🛠️ Setup Instructions

### 1. Push to GitHub

```bash
# Add GitHub remote
git remote add origin https://github.com/yourusername/hair-ecommerce.git

# Push with upstream tracking
git push -u origin main
```

### 2. Configure Branch Protection

1. Go to **Settings** > **Branches**
2. Add rule for `main` branch:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Select required checks:
     - `test-and-build (20.x)` (frontend)
     - `test-and-build (20.x)` (backend)
     - `type-check`

### 3. Configure Secrets (for Deployment)

When ready to deploy, add these secrets in **Settings** > **Secrets and variables** > **Actions**:

**Frontend Deployment:**
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (Vercel)
- OR `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` (Netlify)

**Backend Deployment:**
- `RAILWAY_TOKEN` (Railway)
- OR `HEROKU_API_KEY`, `HEROKU_APP_NAME`, `HEROKU_EMAIL` (Heroku)
- OR `RENDER_DEPLOY_HOOK_URL` (Render)

**Environment Variables:**
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `MONGODB_URI`
- `JWT_SECRET`
- `PRODUCTION_API_URL`
- `PRODUCTION_FRONTEND_URL`

### 4. Enable Dependabot Alerts

1. Go to **Settings** > **Security & analysis**
2. Enable:
   - ✅ Dependency graph
   - ✅ Dependabot alerts
   - ✅ Dependabot security updates

### 5. Optional: Code Coverage

For code coverage badges and reports:

1. Sign up at [Codecov.io](https://codecov.io)
2. Connect your GitHub repository
3. Add `CODECOV_TOKEN` to GitHub secrets
4. Codecov will automatically comment on PRs with coverage changes

## 📊 Monitoring Workflows

### View Workflow Runs

1. Go to **Actions** tab in your repository
2. Select a workflow from the left sidebar
3. View run history, logs, and artifacts

### Troubleshooting Failed Workflows

1. Click on the failed workflow run
2. Expand the failed job
3. Review the logs for error messages
4. Fix the issue and push changes
5. Workflow will re-run automatically

## 🎯 Best Practices

1. **Never commit secrets** - Always use GitHub Secrets
2. **Review Dependabot PRs** - Don't blindly merge dependency updates
3. **Keep workflows fast** - Currently ~3-5 minutes per workflow
4. **Monitor workflow minutes** - GitHub provides 2,000 minutes/month free
5. **Use caching** - All workflows cache npm dependencies for speed
6. **Test locally first** - Use `act` to test workflows locally (optional)

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## 🤝 Contributing

When contributing to this project:

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all CI checks pass locally
4. Submit a pull request using the PR template
5. Wait for review and CI checks to pass
6. Merge when approved

## 📞 Support

If you encounter issues with the CI/CD setup:

1. Check workflow logs in the Actions tab
2. Review this README for configuration steps
3. Create an issue using the bug report template
