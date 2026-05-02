# MultiPlatform-Automated-Planner Repository

## Project Overview
**Name:** MultiPlatform-Automated-Planner (MpAp)  
**Type:** Native Bluetooth task sync system  
**Repository:** https://github.com/gitau26timothy-CUK/MultiPlatform-Automated-Planner

## Architecture
- Desktop Server (Python/Lua) - Source of truth for all tasks
- Mobile Client (React Native) - Kanban board with Bluetooth sync
- Web Client (Vue.js) - Alternative web interface

## Directory Structure
```
MpAp - AutoOrganizer/
├── MpAp-Server/          # Desktop server with Bluetooth RFCOMM
├── MpAp-Mobile/          # React Native mobile app
├── MpAp-Client/          # Python CLI client
├── MpAp-Server-alt/      # Alternative BLE server
├── client/               # Vue.js web app
├── server/               # Node.js web server
├── Design Phase/         # Original design documents
└── README.md             # Main documentation
```

## Git Configuration
- **Remote:** origin → MultiPlatform-Automated-Planner
- **Branch:** main
- **Commit History:** Clean (Phase 1 initial commit)

## Phase 1 Commit
Initial project setup with:
- Complete project structure
- Mobile app (React Native)
- Desktop servers (Python/Lua)
- Web clients (Vue.js/Node.js)
- Documentation

## Prevention Rules
1. Always verify remote URL before pushing: `git remote -v`
2. Keep one project per repository
3. Never mix Sign Asili with MpAp repositories
