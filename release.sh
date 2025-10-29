#!/usr/bin/env bash

set -euo pipefail  # strict mode: exit on error, unset variables, and pipe failures

# Required tools check
for cmd in git npm sed; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: '$cmd' is required but not installed." >&2
    exit 1
  fi
done

# 1. Get bump type from argument, default to patch
readonly BUMP_TYPE=${1:-patch}
if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  echo "Usage: $(basename "$0") [patch|minor|major]" >&2
  exit 1
fi

echo "Starting release with bump type: $BUMP_TYPE"

# 2. Ensure git working directory is clean
if [[ -n $(git status --porcelain) ]]; then
  echo "Error: Git working directory is not clean. Please commit or stash changes." >&2
  exit 1
fi
echo "Git working directory is clean."

# Warn if not on main/master branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
  echo "Warning: current branch is '$CURRENT_BRANCH' (not main/master)." >&2
  read -rp "Press ENTER to continue or Ctrl-C to abort..."
fi

# 3. Get old and new version numbers
OLD_VERSION=$(npm view . version)
# Dry-run bump to compute new version number (strip leading 'v')
NEW_VERSION=$(npm version "$BUMP_TYPE" --dry-run | sed 's/^v//')

echo "Current version: $OLD_VERSION"
echo "New version:     $NEW_VERSION"

# 4. Create Beads issue (automated if bd CLI is available)
ISSUE_ID=""
if command -v bd >/dev/null 2>&1; then
  echo "Creating Beads issue for this release..."
  BD_OUTPUT=$(bd create --json "Release v$NEW_VERSION" --type task --priority 0 --description "Cut release v$NEW_VERSION")
  ISSUE_ID=$(echo "$BD_OUTPUT" | awk -F'"' '/"id"/{print $4; exit}')
  echo "Created Beads issue: $ISSUE_ID"
else
  echo "Please create a Beads issue for this release in another terminal:"
  echo "bd create \"Release v$NEW_VERSION\" --type task --priority 0 --description \"Cut release v$NEW_VERSION\""
  read -rp "Press ENTER to continue after creating the issue..."
fi

# 5. Update manifest.json and versions.json
# Update manifest.json and versions.json
echo "Updating manifest.json and versions.json..."

# Cross-platform in-place sed wrapper (GNU vs BSD)
sed_i() {
  if sed --version >/dev/null 2>&1; then
    sed -i "$@"
  else
    sed -i '' "$@"
  fi
}
sed_i "s/\"version\": \"$OLD_VERSION\"/\"version\": \"$NEW_VERSION\"/" manifest.json

# Add new version to versions.json, assuming 0.10.0 minAppVersion
# This inserts the new version line after the opening brace '{'
sed_i -e "2i\
\t\"$NEW_VERSION\": \"0.10.0\",
" versions.json

git add manifest.json versions.json
COMMIT_MSG="chore: update manifests for v$NEW_VERSION"
if [[ -n "$ISSUE_ID" ]]; then
  COMMIT_MSG="chore($ISSUE_ID): update manifests for v$NEW_VERSION"
fi
git commit -m "$COMMIT_MSG"

# 6. Bump version in package.json and create git tag
echo "Bumping version in package.json and creating git tag..."
TAG_MSG="Release v%s"
if [[ -n "$ISSUE_ID" ]]; then
  TAG_MSG="Release %s ($ISSUE_ID)"
fi
npm version "$BUMP_TYPE" -m "$TAG_MSG" --force

# 7. Build the project
echo "Building project..."
npm run build

# 8. Push changes and tags to remote
echo "Pushing changes and tags..."
git push && git push --tags

## 9. Generate Release Notes
# Determine previous tag (skip current tag)
PREV_COMMIT=$(git rev-list --tags --skip=1 --max-count=1)
PREVIOUS_TAG=$(git describe --tags --abbrev=0 "$PREV_COMMIT" 2>/dev/null || true)
echo "---------------------------------------------------------------------"
echo "Release notes for v$NEW_VERSION (copy and paste into GitHub release):"
echo
echo "## v$NEW_VERSION"
echo
echo "### Changes"
if [[ -n "$PREVIOUS_TAG" ]]; then
  git log --pretty=format:"- %s" "$PREVIOUS_TAG..v$NEW_VERSION"
  echo
  REPO_URL=$(git remote get-url origin | sed 's/\.git$//')
  echo "**Full Changelog**: $REPO_URL/compare/$PREVIOUS_TAG...v$NEW_VERSION"
else
  git log --pretty=format:"- %s" HEAD
fi
echo "---------------------------------------------------------------------"

echo "Release v$NEW_VERSION complete!"
echo "The GitHub Action should now be running to create the release."
