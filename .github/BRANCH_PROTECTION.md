# Branch Protection Configuration

This document outlines the required branch protection rules to ensure code quality and prevent failing tests from being merged.

## Required Branch Protection Rules

Configure these settings in GitHub repository settings under **Settings > Branches > Add rule**.

### For `main` branch (and other protected branches):

#### 1. Require a pull request before merging

- ✅ **Require a pull request before merging**
- ✅ **Require approvals**: 1 (minimum)
- ✅ **Dismiss stale PR approvals when new commits are pushed**
- ✅ **Require review from code owners** (if CODEOWNERS file exists)

#### 2. Require status checks to pass before merging

- ✅ **Require status checks to pass before merging**
- ✅ **Require branches to be up to date before merging**

**Required status checks:**

- `test` (from CI workflow)
- `require-tests` (from CI workflow)

#### 3. Require conversation resolution before merging

- ✅ **Require conversation resolution before merging**

#### 4. Require signed commits (optional but recommended)

- ✅ **Require signed commits**

#### 5. Require linear history (optional)

- ✅ **Require linear history**

#### 6. Administrative settings

- ✅ **Do not allow bypassing the above settings**
- ✅ **Restrict pushes that create files that do not already exist**

## GitHub CLI Setup (Alternative)

You can also configure branch protection using GitHub CLI:

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Authenticate
gh auth login

# Create branch protection rule
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["test","require-tests"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null
```

## API Configuration (Alternative)

Using GitHub REST API:

```bash
curl -X PUT \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/branches/main/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": ["test", "require-tests"]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "required_approving_review_count": 1,
      "dismiss_stale_reviews": true
    },
    "restrictions": null
  }'
```

## Workflow Status Checks

The CI workflow (`ci.yaml`) provides these status checks:

- **test**: Runs all Deno tests with type checking and linting
- **require-tests**: Ensures the test job completed successfully

The deployment workflow (`workflow.yaml`) now depends on tests passing before deployment.

## Local Development

To ensure your code will pass CI before pushing:

```bash
# Run tests
deno test --allow-read --allow-write --allow-net

# Type check
deno check src/**/*.ts

# Lint
deno lint src/

# Format
deno fmt src/

# Or run all checks at once
deno task ci  # (if you create a deno.json task)
```

## Benefits

With these protections in place:

1. ✅ No failing tests can be merged to protected branches
2. ✅ All code must be reviewed before merging
3. ✅ Type checking and linting are enforced
4. ✅ Code formatting standards are maintained
5. ✅ Deployment only happens with passing tests
6. ✅ History remains clean and traceable

## Troubleshooting

### Status checks not appearing

- Ensure the workflow has run at least once on the branch
- Check that the job names in the workflow match the required status checks

### Tests failing in CI but passing locally

- Check Deno version compatibility
- Ensure all necessary permissions are set in the workflow
- Verify file paths are correct (case-sensitive in CI)

### Branch protection not enforcing

- Verify you have admin permissions on the repository
- Ensure the branch name matches exactly (including case)
- Check that required status checks are spelled correctly
