# MpAp - Multiplatform Automated Planner

## Unified Remote-Style Architecture

MpAp is a **native Bluetooth task sync system** inspired by Unified Remote. The desktop server knows all tasks and syncs them to mobile devices via Bluetooth RFCOMM.

```
┌─────────────────────────────────────────────────────────────┐
│                    DESKTOP SERVER (Python/Lua)               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  SQLite DB   │  │ AES-256 GCM  │  │ BT RFCOMM Srv   │   │
│  │  (all tasks) │  │ Encryption   │  │ Port 5544       │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │ Bluetooth 5.3 / WiFi 6E
                            │ ECDH Key Exchange
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE CLIENT (React Native)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Kanban Board • AI Commands • Encrypted Transport   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Principle: Server is Source of Truth
1. **On Connect**: Server pushes complete task state to mobile
2. **On Change**: Server broadcasts updates to ALL devices
3. **On Conflict**: Server wins (last-write-wins)

## Project Structure

```
MpAp - AutoOrganizer/
├── MpAp-Server/          # Desktop server (Unified Remote style)
│   ├── meta.prop         # Metadata
│   ├── remote.lua        # Lua implementation (UR compatible)
│   ├── layout.xml        # UI layout
│   ├── mpap_server.py    # Python production server
│   ├── bt_rfcomm.py      # Native Bluetooth RFCOMM
│   ├── crypto_layer.py   # AES-256 + ECDH encryption
│   └── libs/             # Lua libraries
│
├── MpAp-Client/          # CLI client (Python)
│   └── client.py         # Desktop connector
│
├── MpAp-Mobile/          # React Native mobile app
│   ├── App.tsx           # Main app
│   └── src/
│       ├── BluetoothClient.ts   # BT RFCOMM + encryption
│       ├── components/          # UI components
│       └── ...
│
├── server/               # Web implementation (deprecated)
├── client/               # Vue web app (deprecated)
└── Design Phase/
    └── multiplatform_automated_planner.html  # Original design
```

## Quick Start

### Desktop Server (Python)

```bash
cd MpAp-Server
pip install -r requirements.txt
python mpap_server.py
```

- WebSocket: `ws://localhost:5544`
- Bluetooth: RFCOMM channel 1 (port 5544)
- SQLite: `~/.mpap/mpap.db`

### Mobile App (React Native)

```bash
cd MpAp-Mobile
npm install
npx react-native run-android  # or run-ios
```

**Features:**
- Bluetooth device discovery
- Secure encrypted sync
- Kanban board UI
- AI command interface
- Real-time task updates

### CLI Client (Python)

```bash
cd MpAp-Client
python client.py
```

## Security Features

### AES-256-GCM Encryption
- Authenticated encryption (confidentiality + integrity)
- Per-message nonces
- GCM authentication tags

### ECDH Key Exchange
- Perfect Forward Secrecy
- Ephemeral session keys
- NIST P-384 curve

### Protocol
```
1. Client connects via Bluetooth RFCOMM
2. ECDH handshake: exchange public keys
3. Derive shared AES-256 key
4. All messages encrypted with AES-256-GCM
5. Length-prefixed framing for reliability
```

## AI Commands

| Command | Action |
|---------|--------|
| `Schedule my week` | Auto-move high priority to "In Progress" |
| `Flag all overdue` | Set HIGH priority + alarm on overdue |
| `Set alarms for deadlines` | Enable alarms on deadline/assignment tasks |
| `Prioritise everything` | Auto-set priority by due date |
| `Reschedule overdue` | Push overdue tasks +3 days |

## Bluetooth Protocol

### Message Types
```typescript
type Message =
  | { type: 'sync:request' }                           // Client → Server
  | { type: 'sync:tasks', tasks: Task[] }             // Server → Client
  | { type: 'sync:events', events: Event[] }          // Server → Client
  | { type: 'task:update', task: Task }               // Bidirectional
  | { type: 'task:move', taskId: number, newCol: number }
  | { type: 'task:toggle-alarm', taskId: number }
  | { type: 'ai:command', command: string }
  | { type: 'ai:result', result: AIResult }
  | { type: 'alarms:overdue', tasks: Task[] }
```

### Encryption Frame
```
[4 bytes: length] + [encrypted payload]

Encrypted payload (JSON):
{
  ciphertext: base64,
  nonce: base64,
  tag: base64
}
```

## Requirements

### Desktop Server
- Python 3.8+
- `websockets` library
- Bluetooth adapter (for RFCOMM)
- Windows: `pywin32`
- Linux: `bluez`, `pybluez`

### Mobile App
- Android 8.0+ (API 26+)
- Bluetooth permissions
- React Native 0.73+
- `react-native-bluetooth-classic`

## Features
- **Native Bluetooth RFCOMM**: Direct hardware communication
- **AES-256 Encryption**: Military-grade security
- **Perfect Forward Secrecy**: ECDH key exchange
- **Task Board**: Drag-and-drop Kanban (Backlog → To Do → In Progress → Done)
- **Calendar**: Event management
- **AI Commands**: Schedule, flag overdue, set alarms, prioritise, reschedule
- **Real-time Sync**: Sub-100ms latency over Bluetooth
- **Offline Queue**: Tasks sync when connection restored

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| PUT | `/api/tasks/:id/alarm` | Toggle alarm |
| POST | `/api/tasks/reorder` | Bulk reorder |
| GET | `/api/events` | Get all events |
| POST | `/api/events` | Create event |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |
| GET | `/api/devices` | Get all devices |
| POST | `/api/devices` | Register device |
| POST | `/api/ai` | Execute AI command |

## Socket.io Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `device:connect` | Client → Server | Register device connection |
| `sync:request` | Client → Server | Request full state sync |
| `sync:tasks` | Server → Client | Full task list push |
| `sync:events` | Server → Client | Full event list push |
| `sync:complete` | Server → Client | Sync finished confirmation |
| `task:created` | Server → All | New task broadcast |
| `task:updated` | Server → All | Task update broadcast |
| `task:deleted` | Server → All | Task deletion broadcast |
| `devices:list` | Server → All | Connected device list |
| `alarms:overdue` | Server → All | Overdue alarm notifications |
