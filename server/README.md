# Desktop Bluetooth Task Server

## Setup
```bash
pip install -r requirements.txt
python server.py
```

## Protocol
Commands over RFCOMM:
- LIST - Get all tasks
- ADD:{\"title\":\"Task\",\"done\":false} 
- UPDATE:{\"id\":\"task_1\",\"done\":true}
- DELETE:task_1
- SYNC:{\"tasks\":{\"task_1\":{\"done\":true}}}

## Features Added
- Multi-client threading
- JSON task CRUD
- Bidirectional sync
- Service advertisement

Test with Bluetooth terminal apps.

