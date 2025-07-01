---
name: Release
about: Create a new release of swordfight-cli
title: 'Release v[VERSION]'
labels: 'release'
assignees: ''

---

## Release Checklist

- [ ] All features/fixes are merged to main
- [ ] Tests pass locally
- [ ] CHANGELOG.md is updated (if exists)
- [ ] Create release: `npm run release` (or `release:minor`/`release:major`)
- [ ] Verify GitHub workflow completes successfully
- [ ] Verify package is published to npm
- [ ] Verify GitHub release is created
- [ ] Test installation: `npx --yes swordfight-cli@[VERSION]`

## Release Notes

### New Features

- (Add new features here)

### Bug Fixes

- (Add bug fixes here)

### Breaking Changes

- (Add breaking changes here)

### Other Changes

- (Add other changes here)

---

**Note:** The actual publishing will be handled automatically by the GitHub workflow when a version tag is pushed.
