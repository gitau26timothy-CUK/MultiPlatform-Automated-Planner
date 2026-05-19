# MpAp AutoOrganizer Server

## Unified Remote-Style Architecture

MpAp follows the **Unified Remote** architectural pattern — a desktop server that knows all tasks and syncs to mobile clients via Bluetooth/WiFi.

```
┌─────────────────────────────────────────────────────────────────┐
│                        DESKTOP SERVER                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  SQLite Database (All tasks, events, device registry)    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Sync Service (WebSocket/Bluetooth RFCOMM)              │   │
│  │  • Push full state on connect                          │   │
│  │  • Broadcast updates in real-time                    │   │
│  │  • AES-256 encrypted transport                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Bluetooth 5.3 / WiFi 6E
┌─────────────────────────────────────────────────────────────────┐
│                      MOBILE CLIENTS                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Phone     │  │   Tablet    │  │  Laptop     │             │
│  │  (iOS/And)  │  │  (iPad)     │  │  (Secondary)│             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## Key Principle: Server Knows Everything

Unlike peer-to-peer sync, the **desktop server is the source of truth**:

1. **On Connect**: Server pushes complete task state to mobile device
2. **On Change**: Server broadcasts updates to ALL connected devices
3. **On Conflict**: Server wins (last-write-wins with timestamp)

This is the same pattern Unified Remote uses for remote control — the desktop knows the state, mobile just mirrors it.

## File Structure (Unified Remote Style)

```
MpAp-Server/
├── meta.prop              # Metadata (name, author, version)
├── layout.xml             # UI layout definition
├── remote.lua             # Main logic (actions, events, sync)
├── libs/
│   ├── bluetooth.lua      # Bluetooth transport wrapper
│   ├── sqlite.lua         # Database wrapper
│   ├── json.lua           # JSON encode/decode
│   ├── timer.lua          # Timer utilities
│   └── utf8.lua           # String utilities
├── mpap_server.py         # Python implementation (production)
└── README.md
```

## Protocol

### Connection
```lua
-- Client connects
client:send(json.stringify({
  type = "device:connect",
  name = "Alex's iPhone",
  type = "phone"
}))

-- Server responds with full state
{
  type = "sync:tasks",
  tasks = [...]
}
{
  type = "sync:events", 
  events = [...]
}
{
  type = "sync:complete",
  timestamp = "2026-04-29T15:30:00Z",
  deviceCount = 3
}
```

### Task Operations
```lua
-- Update task
{
  type = "task:update",
  task = { id = 1, title = "...", col = 2, ... }
}

-- Move task
{
  type = "task:move",
  taskId = 1,
  newCol = 2
}

-- Toggle alarm
{
  type = "task:toggle-alarm",
  taskId = 1
}
```

### AI Commands
```lua
{
  type = "ai:command",
  command = "Schedule my week"
}

-- Response
{
  type = "ai:result",
  result = {
    success = true,
    message = "Scheduled: 2 high → In Progress, 3 mid → To Do",
    affected = 5
  }
}
```

## Running

### Python Server (Recommended)

```bash
cd MpAp-Server
pip install -r requirements.txt
python mpap_server.py
```

Server runs on `ws://0.0.0.0:5544`

### Lua Server (Unified Remote Compatible)

Place in Unified Remote's `Remotes/` folder and restart the server.

## Mobile Client

```bash
cd MpAp-Client
pip install websockets
python client.py
```

Commands:
- `tasks` — Request full sync
- `move <id> <col>` — Move task
- `alarm <id>` — Toggle alarm
- `ai <command>` — Execute AI command
- `quit` — Disconnect

## AI Commands

| Command | Action |
|---------|--------|
| `Schedule my week` | Move high priority to In Progress, mid to To Do |
| `Flag all overdue` | Set HIGH priority + alarm on overdue tasks |
| `Set alarms for deadlines` | Enable alarms on all deadline/assignment tasks |
| `Prioritise everything` | Set priority based on due dates |
| `Reschedule overdue` | Push overdue tasks +3 days |

## Security

- Transport: WebSocket with TLS (WSS) or Bluetooth encrypted link
- Local database: SQLite with AES-256 encryption at rest (optional)
- No cloud — completely local/offline capable
