#!/usr/bin/env bash

set -euo pipefail  # strict mode: exit on error, unset variables, and pipe failures

# Parse options
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  shift
fi

# Required tools check
for cmd in git npm sed node; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: '$cmd' is required but not installed." >&2
    exit 1
  fi
done

# Get bump type from argument, default to patch
readonly BUMP_TYPE=${1:-patch}
if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  echo "Usage: $(basename "$0") [--dry-run] [patch|minor|major]" >&2
  exit 1
fi

if $DRY_RUN; then
  echo "=== DRY RUN MODE - No changes will be made ==="
  echo
fi

echo "Starting release with bump type: $BUMP_TYPE"

# Ensure git working directory is clean (skip check in dry-run)
if [[ -n $(git status --porcelain) ]]; then
  if $DRY_RUN; then
    echo "Warning: Git working directory is not clean (ignored in dry-run mode)."
  else
    echo "Error: Git working directory is not clean. Please commit or stash changes." >&2
    exit 1
  fi
else
  echo "Git working directory is clean."
fi

# Warn if not on main/master branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
  echo "Warning: current branch is '$CURRENT_BRANCH' (not main/master)." >&2
  if ! $DRY_RUN; then
    read -rp "Press ENTER to continue or Ctrl-C to abort..."
  fi
fi

# Get old version from package.json
OLD_VERSION=$(node -p "require('./package.json').version")

# Calculate new version manually (npm version doesn't have a true dry-run)
bump_version() {
  local version=$1
  local bump_type=$2

  # Split version into components
  IFS='.' read -r major minor patch <<< "$version"

  case $bump_type in
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    patch)
      patch=$((patch + 1))
      ;;
  esac

  echo "$major.$minor.$patch"
}

NEW_VERSION=$(bump_version "$OLD_VERSION" "$BUMP_TYPE")

echo "Current version: $OLD_VERSION"
echo "New version:     $NEW_VERSION"

# Show dry-run preview if in dry-run mode
if $DRY_RUN; then
  echo
  echo "=== Changes that would be made to manifest.json ==="
  sed "s/\"version\": \"$OLD_VERSION\"/\"version\": \"$NEW_VERSION\"/" manifest.json | grep -A 1 -B 1 "\"version\""

  echo
  echo "=== Changes that would be made to versions.json ==="
  echo "Would add: \"$NEW_VERSION\": \"0.10.0\","

  echo
  echo "=== Git tag that would be created ==="
  echo "Tag: v$NEW_VERSION"

  echo
  echo "=== Beads issue that would be created ==="
  if command -v bd >/dev/null 2>&1; then
    echo "Title: Release v$NEW_VERSION"
    echo "Type: task"
    echo "Priority: P0"
    echo "Description: Cut release v$NEW_VERSION"
  else
    echo "(bd command not found - would prompt for manual creation)"
  fi
fi

# Generate release notes (works in both dry-run and normal mode)
PREVIOUS_TAG=$(git tag --sort=-version:refname | head -n 1)
echo
echo "---------------------------------------------------------------------"
echo "Release notes for v$NEW_VERSION:"
echo
echo "## v$NEW_VERSION"
echo
echo "### Changes"
if [[ -n "$PREVIOUS_TAG" ]]; then
  git log --pretty=format:"- %s" "$PREVIOUS_TAG..HEAD"
  echo
  echo
  REPO_URL=$(git remote get-url origin | sed 's/\.git$//' | sed 's|git@github.com:|https://github.com/|')
  echo "**Full Changelog**: $REPO_URL/compare/$PREVIOUS_TAG...v$NEW_VERSION"
else
  git log --pretty=format:"- %s" HEAD
  echo
fi
echo "---------------------------------------------------------------------"

if $DRY_RUN; then
  echo
  echo "=== DRY RUN COMPLETE - No changes were made ==="
  echo "To perform the release, run: $(basename "$0") $BUMP_TYPE"
  exit 0
fi

# === EVERYTHING BELOW THIS POINT ONLY RUNS IN NORMAL MODE ===

# Create Beads issue (automated if bd CLI is available)
ISSUE_ID=""
if command -v bd >/dev/null 2>&1; then
  echo
  echo "Creating Beads issue for this release..."
  BD_OUTPUT=$(bd create --json "Release v$NEW_VERSION" --type task --priority 0 --description "Cut release v$NEW_VERSION")
  ISSUE_ID=$(echo "$BD_OUTPUT" | awk -F'"' '/"id"/{print $4; exit}')
  echo "Created Beads issue: $ISSUE_ID"
else
  echo
  echo "Please create a Beads issue for this release in another terminal:"
  echo "bd create \"Release v$NEW_VERSION\" --type task --priority 0 --description \"Cut release v$NEW_VERSION\""
  read -rp "Press ENTER to continue after creating the issue..."
fi

# Update manifest.json and versions.json
echo
echo "Updating manifest.json and versions.json..."

# Cross-platform in-place sed wrapper (GNU vs BSD)
sed_i() {
  if sed --version >/dev/null 2>&1; then
    sed -i "$@"
  else
    sed -i '' "$@"
  fi
}
# Update manifest.json
sed_i "s/\"version\": \"$OLD_VERSION\"/\"version\": \"$NEW_VERSION\"/" manifest.json

# Update versions.json more robustly using awk
# Find the line with the opening brace and insert after it
awk -v new_ver="$NEW_VERSION" '
  /^{/ { print; print "\t\"" new_ver "\": \"0.10.0\","; next }
  { print }
' versions.json > versions.json.tmp && mv versions.json.tmp versions.json

git add manifest.json versions.json
COMMIT_MSG="chore: update manifests for v$NEW_VERSION"
if [[ -n "$ISSUE_ID" ]]; then
  COMMIT_MSG="chore($ISSUE_ID): update manifests for v$NEW_VERSION"
fi
git commit -m "$COMMIT_MSG"

# Bump version in package.json and create git tag
echo
echo "Bumping version in package.json and creating git tag..."
TAG_MSG="Release v%s"
if [[ -n "$ISSUE_ID" ]]; then
  TAG_MSG="Release %s ($ISSUE_ID)"
fi
npm version "$BUMP_TYPE" -m "$TAG_MSG"

# Push changes and tags to remote
echo
echo "Pushing changes and tags..."
git push origin "$CURRENT_BRANCH"
git push origin "v$NEW_VERSION"

# Close Beads issue if we created one
if [[ -n "$ISSUE_ID" ]] && command -v bd >/dev/null 2>&1; then
  echo
  echo "Closing Beads issue $ISSUE_ID..."
  bd close "$ISSUE_ID" --reason "Release v$NEW_VERSION completed successfully"
fi

echo
echo "---------------------------------------------------------------------"
echo "Release v$NEW_VERSION complete!"
echo "The GitHub Action should now be running to create the release."
REPO_URL=$(git remote get-url origin | sed 's/\.git$//' | sed 's|git@github.com:|https://github.com/|')
echo "Check: $REPO_URL/actions"
echo "---------------------------------------------------------------------"
