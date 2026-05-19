#!/usr/bin/env python3
"""
MpAp AutoOrganizer Server
Multiplatform Automated Planner with Bluetooth Sync

Unified Remote-style architecture:
- Desktop server knows all tasks (SQLite)
- Bluetooth/WiFi transport to mobile clients  
- Server pushes full state on connect
- Real-time sync on task changes
"""

import asyncio
import json
import sqlite3
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import websockets
import socket
import threading

# ============================================================================
# DATABASE
# ============================================================================

class Database:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.init_tables()
    
    def init_tables(self):
        cursor = self.conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                tag TEXT DEFAULT 'project',
                priority TEXT DEFAULT 'mid',
                due TEXT DEFAULT 'TBD',
                progress INTEGER DEFAULT 0,
                col INTEGER DEFAULT 0,
                avatars TEXT DEFAULT '["AK"]',
                alarm INTEGER DEFAULT 0,
                ord INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                time TEXT NOT NULL,
                date TEXT,
                duration TEXT,
                source TEXT DEFAULT 'manual',
                color TEXT DEFAULT '#7c3aed',
                detail TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT DEFAULT 'other',
                address TEXT UNIQUE,
                signal INTEGER DEFAULT 4,
                last_sync TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        self.conn.commit()
        
        # Seed if empty
        cursor.execute("SELECT COUNT(*) FROM tasks")
        if cursor.fetchone()[0] == 0:
            self.seed_data()
    
    def seed_data(self):
        tasks = [
            ("Literature review — AI Ethics paper", "assignment", "mid", "May 3", 15, 0, '["AK"]', 0, 0),
            ("Setup DeFi staking strategy", "crypto", "crypto", "May 5", 0, 0, '["AK"]', 0, 1),
            ("Quantum Computing pset 4", "assignment", "high", "Apr 29", 40, 1, '["AK","TM"]', 1, 0),
            ("Research proposal draft v2", "project", "mid", "Apr 30", 65, 1, '["AK","JL"]', 0, 1),
            ("Solidity smart contract audit", "crypto", "low", "May 2", 20, 1, '["AK"]', 0, 2),
            ("STEM Lab Report — Physics 301", "deadline", "high", "TODAY", 80, 2, '["AK"]', 1, 0),
            ("Protein folding simulation run", "project", "mid", "Apr 30", 55, 2, '["AK","MR"]', 0, 1),
            ("ETH portfolio rebalancing", "crypto", "crypto", "Apr 28", 70, 2, '["AK"]', 0, 2),
            ("Midterm study plan", "assignment", "low", "Apr 25", 100, 3, '["AK"]', 0, 0),
            ("BTC DCA schedule setup", "crypto", "crypto", "Apr 26", 100, 3, '["AK"]', 0, 1),
        ]
        
        cursor = self.conn.cursor()
        cursor.executemany("""
            INSERT INTO tasks (title, tag, priority, due, progress, col, avatars, alarm, ord)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, tasks)
        
        events = [
            ("ML Lecture — Room 3B", "09:00", "#7c3aed", "90min · Google Cal"),
            ("Lab Report Deadline", "11:30", "#ef4444", "URGENT · 2h remaining"),
            ("STEM Group Sync", "14:00", "#10b981", "Zoom · 1h"),
            ("BTC/ETH Portfolio Review", "17:00", "#f59e0b", "Crypto · self-scheduled"),
            ("Study Block", "20:00", "#00d4ff", "Auto-blocked · 2h"),
        ]
        
        cursor.executemany("""
            INSERT INTO events (title, time, color, detail)
            VALUES (?, ?, ?, ?)
        """, events)
        
        self.conn.commit()
    
    def get_tasks(self) -> List[Dict]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM tasks ORDER BY col, ord")
        rows = cursor.fetchall()
        
        tasks = []
        for row in rows:
            task = dict(row)
            task['avatars'] = json.loads(task['avatars'])
            task['alarm'] = bool(task['alarm'])
            tasks.append(task)
        
        return tasks
    
    def get_events(self) -> List[Dict]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM events ORDER BY time")
        return [dict(row) for row in cursor.fetchall()]
    
    def save_task(self, task: Dict) -> Dict:
        cursor = self.conn.cursor()
        
        avatars_json = json.dumps(task.get('avatars', ['AK']))
        alarm_int = 1 if task.get('alarm', False) else 0
        
        if task.get('id'):
            cursor.execute("""
                UPDATE tasks SET
                    title = ?, tag = ?, priority = ?, due = ?,
                    progress = ?, col = ?, avatars = ?, alarm = ?, ord = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                task['title'], task['tag'], task['priority'], task['due'],
                task['progress'], task['col'], avatars_json, alarm_int,
                task.get('ord', 0), task['id']
            ))
        else:
            cursor.execute("""
                INSERT INTO tasks (title, tag, priority, due, progress, col, avatars, alarm, ord)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                task['title'], task['tag'], task['priority'], task['due'],
                task['progress'], task['col'], avatars_json, alarm_int,
                task.get('ord', 0)
            ))
            task['id'] = cursor.lastrowid
        
        self.conn.commit()
        return task
    
    def delete_task(self, task_id: int):
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        self.conn.commit()


# ============================================================================
# SYNC SERVICE
# ============================================================================

class SyncService:
    def __init__(self, db: Database):
        self.db = db
        self.clients: Dict[str, Any] = {}
    
    def register_client(self, client_id: str, websocket):
        self.clients[client_id] = {
            'ws': websocket,
            'connected_at': datetime.now()
        }
        print(f"[SYNC] Client connected: {client_id}")
        
        # Send full state
        asyncio.create_task(self.push_full_state(client_id))
    
    def remove_client(self, client_id: str):
        if client_id in self.clients:
            del self.clients[client_id]
            print(f"[SYNC] Client disconnected: {client_id}")
    
    async def push_full_state(self, client_id: str):
        if client_id not in self.clients:
            return
        
        ws = self.clients[client_id]['ws']
        
        await ws.send(json.dumps({
            'type': 'sync:tasks',
            'tasks': self.db.get_tasks()
        }))
        
        await ws.send(json.dumps({
            'type': 'sync:events',
            'events': self.db.get_events()
        }))
        
        await ws.send(json.dumps({
            'type': 'sync:complete',
            'timestamp': datetime.now().isoformat(),
            'deviceCount': len(self.clients)
        }))
    
    async def broadcast_task_update(self, task: Dict):
        msg = json.dumps({
            'type': 'task:updated',
            'task': task
        })
        
        for client_id, client in list(self.clients.items()):
            try:
                await client['ws'].send(msg)
            except:
                self.remove_client(client_id)
    
    async def broadcast_task_delete(self, task_id: int):
        msg = json.dumps({
            'type': 'task:deleted',
            'taskId': task_id
        })
        
        for client_id, client in list(self.clients.items()):
            try:
                await client['ws'].send(msg)
            except:
                self.remove_client(client_id)


# ============================================================================
# AI SERVICE
# ============================================================================

class AIService:
    def __init__(self, db: Database, sync: SyncService):
        self.db = db
        self.sync = sync
    
    def execute(self, command: str) -> Dict:
        cmd = command.lower()
        
        if 'schedule' in cmd:
            return self.schedule_week()
        elif 'flag' in cmd:
            return self.flag_overdue()
        elif 'alarm' in cmd:
            return self.set_alarms()
        elif 'priorit' in cmd:
            return self.prioritise()
        elif 'reschedule' in cmd:
            return self.reschedule()
        else:
            return {'success': False, 'message': f'Unknown command: {command}'}
    
    def schedule_week(self) -> Dict:
        tasks = self.db.get_tasks()
        high_count = 0
        mid_count = 0
        
        for task in tasks:
            if task['col'] < 3:
                if task['priority'] == 'high' and task['col'] < 2:
                    task['col'] = 2
                    self.db.save_task(task)
                    high_count += 1
                elif task['priority'] == 'mid' and task['col'] == 0:
                    task['col'] = 1
                    self.db.save_task(task)
                    mid_count += 1
        
        return {
            'success': True,
            'message': f'Scheduled: {high_count} high → In Progress, {mid_count} mid → To Do',
            'affected': high_count + mid_count
        }
    
    def flag_overdue(self) -> Dict:
        tasks = self.db.get_tasks()
        flagged = 0
        
        for task in tasks:
            due = task['due'].lower()
            if task['col'] < 3 and (due == 'today' or due == 'overdue'):
                task['priority'] = 'high'
                task['alarm'] = True
                self.db.save_task(task)
                flagged += 1
        
        return {
            'success': True,
            'message': f'Flagged {flagged} overdue tasks as HIGH priority with alarms',
            'affected': flagged
        }
    
    def set_alarms(self) -> Dict:
        tasks = self.db.get_tasks()
        count = 0
        
        for task in tasks:
            if task['col'] < 3 and task['tag'] in ['deadline', 'assignment'] and not task['alarm']:
                task['alarm'] = True
                self.db.save_task(task)
                count += 1
        
        return {
            'success': True,
            'message': f'Alarms set for {count} deadline/assignment tasks',
            'affected': count
        }
    
    def prioritise(self) -> Dict:
        tasks = self.db.get_tasks()
        
        for task in tasks:
            if task['col'] < 3:
                due = task['due'].lower()
                if due == 'today':
                    task['priority'] = 'high'
                elif due != 'tbd':
                    task['priority'] = 'mid'
                self.db.save_task(task)
        
        return {
            'success': True,
            'message': f'Prioritised {len(tasks)} tasks by due date',
            'affected': len(tasks)
        }
    
    def reschedule(self) -> Dict:
        tasks = self.db.get_tasks()
        rescheduled = 0
        
        for task in tasks:
            due = task['due'].lower()
            if task['col'] < 3 and (due == 'today' or due == 'overdue'):
                new_due = (datetime.now() + timedelta(days=3)).strftime('%b %d')
                task['due'] = new_due
                task['priority'] = 'mid'
                self.db.save_task(task)
                rescheduled += 1
        
        return {
            'success': True,
            'message': f'Rescheduled {rescheduled} overdue tasks to +3 days',
            'affected': rescheduled
        }


# ============================================================================
# WEBSOCKET SERVER
# ============================================================================

class MpApServer:
    def __init__(self, host: str = '0.0.0.0', port: int = 5544):
        self.host = host
        self.port = port
        
        # Storage path
        storage_dir = Path.home() / '.mpap'
        storage_dir.mkdir(exist_ok=True)
        
        self.db = Database(str(storage_dir / 'mpap.db'))
        self.sync = SyncService(self.db)
        self.ai = AIService(self.db, self.sync)
    
    async def handle_client(self, websocket, path):
        client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        self.sync.register_client(client_id, websocket)
        
        try:
            async for message in websocket:
                await self.process_message(client_id, message)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.sync.remove_client(client_id)
    
    async def process_message(self, client_id: str, message: str):
        try:
            msg = json.loads(message)
            msg_type = msg.get('type')
            
            if msg_type == 'sync:request':
                await self.sync.push_full_state(client_id)
            
            elif msg_type == 'task:update':
                task = self.db.save_task(msg['task'])
                await self.sync.broadcast_task_update(task)
            
            elif msg_type == 'task:move':
                task = self.db.get_tasks()
                for t in task:
                    if t['id'] == msg['taskId']:
                        t['col'] = msg['newCol']
                        self.db.save_task(t)
                        await self.sync.broadcast_task_update(t)
                        break
            
            elif msg_type == 'task:toggle-alarm':
                for t in self.db.get_tasks():
                    if t['id'] == msg['taskId']:
                        t['alarm'] = not t['alarm']
                        self.db.save_task(t)
                        await self.sync.broadcast_task_update(t)
                        break
            
            elif msg_type == 'task:delete':
                self.db.delete_task(msg['taskId'])
                await self.sync.broadcast_task_delete(msg['taskId'])
            
            elif msg_type == 'ai:command':
                result = self.ai.execute(msg['command'])
                
                if result['success']:
                    # Reload and broadcast
                    for task in self.db.get_tasks():
                        await self.sync.broadcast_task_update(task)
                
                await self.sync.clients[client_id]['ws'].send(json.dumps({
                    'type': 'ai:result',
                    'result': result
                }))
        
        except Exception as e:
            print(f"[ERROR] {e}")
    
    async def start(self):
        print(f"[SERVER] Starting MpAp Server on {self.host}:{self.port}")
        print(f"[SERVER] WebSocket: ws://{self.host}:{self.port}")
        print(f"[SERVER] Storage: {Path.home() / '.mpap'}")
        
        server = await websockets.serve(
            self.handle_client,
            self.host,
            self.port,
            ping_interval=20,
            ping_timeout=10
        )
        
        await server.wait_closed()


# ============================================================================
# MAIN
# ============================================================================

def main():
    server = MpApServer()
    
    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        print("\n[SERVER] Shutting down...")

if __name__ == '__main__':
    main()
