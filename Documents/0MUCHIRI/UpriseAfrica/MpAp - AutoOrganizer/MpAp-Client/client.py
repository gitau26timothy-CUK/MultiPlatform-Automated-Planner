#!/usr/bin/env python3
"""
MpAp Mobile Client Connector
Connects to desktop server via Bluetooth/WiFi and receives task sync
"""

import asyncio
import json
import websockets
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass
from datetime import datetime


@dataclass
class Task:
    id: int
    title: str
    tag: str
    priority: str
    due: str
    progress: int
    col: int
    avatars: List[str]
    alarm: bool


@dataclass
class Event:
    id: int
    title: str
    time: str
    color: str
    detail: str


class MpApClient:
    """
    MpAp Mobile Client
    Connects to desktop server and syncs tasks
    """
    
    def __init__(self, server_host: str = 'localhost', server_port: int = 5544):
        self.server_url = f"ws://{server_host}:{server_port}"
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.connected = False
        
        self.tasks: List[Task] = []
        self.events: List[Event] = []
        
        # Callbacks
        self.on_tasks_synced: Optional[Callable] = None
        self.on_events_synced: Optional[Callable] = None
        self.on_task_updated: Optional[Callable] = None
        self.on_connected: Optional[Callable] = None
        self.on_disconnected: Optional[Callable] = None
    
    async def connect(self):
        """Connect to MpAp server"""
        try:
            print(f"[CLIENT] Connecting to {self.server_url}...")
            self.websocket = await websockets.connect(self.server_url)
            self.connected = True
            
            print(f"[CLIENT] Connected to MpAp server")
            
            if self.on_connected:
                self.on_connected()
            
            # Start listening for messages
            await self.listen()
            
        except Exception as e:
            print(f"[CLIENT] Connection failed: {e}")
            self.connected = False
    
    async def listen(self):
        """Listen for server messages"""
        try:
            async for message in self.websocket:
                await self.handle_message(message)
        except websockets.exceptions.ConnectionClosed:
            print("[CLIENT] Connection closed")
        finally:
            self.connected = False
            if self.on_disconnected:
                self.on_disconnected()
    
    async def handle_message(self, message: str):
        """Process incoming message"""
        try:
            msg = json.loads(message)
            msg_type = msg.get('type')
            
            if msg_type == 'sync:tasks':
                self.tasks = [Task(**t) for t in msg['tasks']]
                print(f"[CLIENT] Synced {len(self.tasks)} tasks")
                if self.on_tasks_synced:
                    self.on_tasks_synced(self.tasks)
            
            elif msg_type == 'sync:events':
                self.events = [Event(**e) for e in msg['events']]
                print(f"[CLIENT] Synced {len(self.events)} events")
                if self.on_events_synced:
                    self.on_events_synced(self.events)
            
            elif msg_type == 'sync:complete':
                print(f"[CLIENT] Sync complete. {msg.get('deviceCount', 0)} devices connected")
            
            elif msg_type == 'task:updated':
                task_data = msg['task']
                task = Task(**task_data)
                
                # Update local list
                for i, t in enumerate(self.tasks):
                    if t.id == task.id:
                        self.tasks[i] = task
                        break
                else:
                    self.tasks.append(task)
                
                print(f"[CLIENT] Task updated: {task.title}")
                if self.on_task_updated:
                    self.on_task_updated(task)
            
            elif msg_type == 'task:deleted':
                task_id = msg['taskId']
                self.tasks = [t for t in self.tasks if t.id != task_id]
                print(f"[CLIENT] Task deleted: {task_id}")
            
            elif msg_type == 'ai:result':
                result = msg['result']
                print(f"[CLIENT] AI result: {result['message']}")
            
            elif msg_type == 'alarms:overdue':
                overdue_tasks = msg.get('tasks', [])
                print(f"[CLIENT] ALERT: {len(overdue_tasks)} overdue tasks!")
                for t in overdue_tasks:
                    print(f"  ⚠️  {t['title']} - {t['due']}")
        
        except Exception as e:
            print(f"[CLIENT] Error handling message: {e}")
    
    async def request_sync(self):
        """Request full sync from server"""
        if self.connected and self.websocket:
            await self.websocket.send(json.dumps({
                'type': 'sync:request'
            }))
    
    async def update_task(self, task: Task):
        """Send task update to server"""
        if self.connected and self.websocket:
            await self.websocket.send(json.dumps({
                'type': 'task:update',
                'task': {
                    'id': task.id,
                    'title': task.title,
                    'tag': task.tag,
                    'priority': task.priority,
                    'due': task.due,
                    'progress': task.progress,
                    'col': task.col,
                    'avatars': task.avatars,
                    'alarm': task.alarm
                }
            }))
    
    async def move_task(self, task_id: int, new_col: int):
        """Move task to different column"""
        if self.connected and self.websocket:
            await self.websocket.send(json.dumps({
                'type': 'task:move',
                'taskId': task_id,
                'newCol': new_col
            }))
    
    async def toggle_alarm(self, task_id: int):
        """Toggle task alarm"""
        if self.connected and self.websocket:
            await self.websocket.send(json.dumps({
                'type': 'task:toggle-alarm',
                'taskId': task_id
            }))
    
    async def delete_task(self, task_id: int):
        """Delete task"""
        if self.connected and self.websocket:
            await self.websocket.send(json.dumps({
                'type': 'task:delete',
                'taskId': task_id
            }))
    
    async def send_ai_command(self, command: str):
        """Send AI command"""
        if self.connected and self.websocket:
            await self.websocket.send(json.dumps({
                'type': 'ai:command',
                'command': command
            }))
    
    def get_column_tasks(self, col: int) -> List[Task]:
        """Get tasks in a specific column"""
        return [t for t in self.tasks if t.col == col]
    
    def get_overdue_tasks(self) -> List[Task]:
        """Get overdue tasks with alarms"""
        return [
            t for t in self.tasks 
            if t.alarm and t.col < 3 and t.due.lower() in ['today', 'overdue']
        ]
    
    async def disconnect(self):
        """Disconnect from server"""
        if self.websocket:
            await self.websocket.close()
        self.connected = False


class MpApCLI:
    """Command-line interface for MpAp client"""
    
    def __init__(self):
        self.client = MpApClient()
        self.client.on_tasks_synced = self.on_tasks
        self.client.on_connected = self.on_connected
    
    def on_connected(self):
        print("\n✓ Connected to MpAp server")
        print("Commands: tasks, move <id> <col>, alarm <id>, ai <command>, quit\n")
    
    def on_tasks(self, tasks):
        print(f"\n--- Tasks ({len(tasks)}) ---")
        columns = ['BACKLOG', 'TO DO', 'IN PROGRESS', 'DONE']
        for col_id, col_name in enumerate(columns):
            col_tasks = [t for t in tasks if t.col == col_id]
            print(f"\n{col_name}:")
            for t in col_tasks:
                alarm = "🔔" if t.alarm else " "
                print(f"  [{alarm}] {t.id}: {t.title} ({t.priority}, {t.due})")
    
    async def run(self):
        # Connect to server
        connect_task = asyncio.create_task(self.client.connect())
        
        # Wait a bit for connection
        await asyncio.sleep(1)
        
        while True:
            try:
                cmd = input("> ").strip()
                
                if cmd == 'quit':
                    break
                
                elif cmd == 'tasks':
                    await self.client.request_sync()
                
                elif cmd.startswith('move '):
                    parts = cmd.split()
                    if len(parts) == 3:
                        task_id = int(parts[1])
                        new_col = int(parts[2])
                        await self.client.move_task(task_id, new_col)
                        print(f"Moving task {task_id} to column {new_col}")
                
                elif cmd.startswith('alarm '):
                    parts = cmd.split()
                    if len(parts) == 2:
                        task_id = int(parts[1])
                        await self.client.toggle_alarm(task_id)
                        print(f"Toggling alarm for task {task_id}")
                
                elif cmd.startswith('ai '):
                    command = cmd[3:]
                    await self.client.send_ai_command(command)
                    print(f"Sending AI command: {command}")
                
                else:
                    print("Unknown command. Use: tasks, move <id> <col>, alarm <id>, ai <command>, quit")
            
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error: {e}")
        
        await self.client.disconnect()
        print("\nDisconnected.")


def main():
    cli = MpApCLI()
    asyncio.run(cli.run())


if __name__ == '__main__':
    main()
