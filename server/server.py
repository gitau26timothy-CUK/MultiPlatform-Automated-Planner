#!/usr/bin/env python3
"""
Desktop Bluetooth Task Server for MultiPlatform-Automated-Planner.
Implements RFCOMM server for task CRUD and sync operations.
Source of truth for all tasks.
Run: python server.py
Client connect via Bluetooth RFCOMM.
"""

import bluetooth
import json
import threading
from typing import Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory task storage (source of truth). Persist to DB in production.
tasks: Dict[str, Dict] = {}
task_id_counter = 0

def generate_task
