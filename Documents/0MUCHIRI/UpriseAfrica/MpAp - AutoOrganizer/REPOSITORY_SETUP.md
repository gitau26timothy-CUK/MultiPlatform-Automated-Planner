# Repository Configuration Guide

## Project Structure

This directory contains the **MultiPlatform-Automated-Planner (MpAp)** project.

### Directory: MpAp - AutoOrganizer
- **Project:** MultiPlatform-Automated-Planner
- **Purpose:** Native Bluetooth task sync system with mobile/desktop integration
- **Git Repository:** https://github.com/gitau26timothy-CUK/MultiPlatform-Automated-Planner.git
- **Remote:** origin (only configured remote)

### Important: Sign Asili Project
The Sign Asili project was previously in this git repository but has been moved to avoid confusion.
- Sign Asili content is preserved in the git history if needed
- To restore Sign Asili: Create a separate directory and clone from feature branches
- Sign Asili GitHub: https://github.com/gitau26timothy-CUK/SignAsili.git

## Git Configuration

### Current Remotes
```
origin  https://github.com/gitau26timothy-CUK/MultiPlatform-Automated-Planner.git (fetch)
origin  https://github.com/gitau26timothy-CUK/MultiPlatform-Automated-Planner.git (push)
```

### Branches
- `main` - Primary development branch for MultiPlatform-Automated-Planner
- `feat/ci-and-ignore` - CI/CD and gitignore configuration

## Prevention Rules

### Before Committing/Pushing
1. **Check the remote:** Run `git remote -v` to ensure you're pushing to the correct repository
2. **Check the branch:** Run `git branch` to ensure you're on the correct branch
3. **Check the directory:** Ensure you're in the correct project directory before making changes

### Never Do
- **Never** add multiple project remotes to a single repository
- **Never** push MultiPlatform-Automated-Planner to Sign Asili repository
- **Never** push Sign Asili to MultiPlatform-Automated-Planner repository
- **Never** use force push unless absolutely necessary and you understand the consequences

### Best Practices
1. **One project per repository** - Keep projects in separate directories with separate git repositories
2. **Clear naming** - Directory names should match the project name
3. **Single remote** - Each repository should have only one origin remote
4. **Check twice** - Always verify remote URL before pushing

## Recovery If Mistake Happens

If you accidentally push the wrong project to the wrong repository:
1. **Don't panic** - The content is still in git history
2. **Check branches** - Use `git branch -a` to see all branches
3. **Restore from history** - Checkout the correct branch to restore content
4. **Reconfigure remotes** - Remove incorrect remotes and add correct ones
5. **Force push carefully** - Only if you're certain about the action

## File Structure

```
MpAp - AutoOrganizer/
├── MpAp-Server/          # Desktop server (Python/Lua)
├── MpAp-Client/          # CLI client (Python)
├── MpAp-Mobile/          # React Native mobile app
├── MpAp-Server-alt/      # Alternative Python server with BLE
├── server/               # Web implementation
├── client/               # Vue web app
├── Design Phase/         # Original design documents
├── README.md             # Project documentation
├── package.json          # Root package configuration
└── REPOSITORY_SETUP.md   # This file
```

## Contact

If you encounter repository configuration issues:
1. Check this file first
2. Verify git remotes with `git remote -v`
3. Verify current branch with `git branch`
4. Check git history with `git log --oneline -10`
