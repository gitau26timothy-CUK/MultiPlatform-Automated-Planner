#!/usr/bin/env python3
"""
ALTERNATIVE 1: Bleak-based Bluetooth (BLE instead of RFCOMM)
Cross-platform: Windows, macOS, Linux
Uses Bluetooth Low Energy GATT
"""

import asyncio
import json
import struct
from typing import Dict, Optional, Callable
from dataclasses import dataclass

try:
    from bleak import BleakServer, BleakGATTService, BleakGATTCharacteristic
    from bleak.backends.characteristic import GATTCharacteristicProperties
    BLEAK_AVAILABLE = True
except ImportError:
    BLEAK_AVAILABLE = False
    print("[ALT-BT] Bleak not installed: pip install bleak")

# MpAp BLE Service UUID
MPAP_SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0"
MPAP_TX_CHAR_UUID = "12345678-1234-5678-1234-56789abcdef1"  # Server -> Client
MPAP_RX_CHAR_UUID = "12345678-1234-5678-1234-56789abcdef2"  # Client -> Server


@dataclass
class BLEClient:
    """BLE client wrapper"""
    address: str
    name: str = "Unknown"
    tx_characteristic: Optional[BleakGATTCharacteristic] = None
    on_data: Optional[Callable[[str], None]] = None
    on_disconnect: Optional[Callable[[], None]] = None
    buffer: bytes = b""


class BleakBluetoothServer:
    """
    Alternative Bluetooth implementation using Bleak (BLE GATT)
    
    PROS:
    - Cross-platform (Windows, macOS, Linux)
    - Modern Bluetooth Low Energy
    - Lower power consumption
    
    CONS:
    - Not RFCOMM (may not work with all devices)
    - Lower throughput than classic Bluetooth
    - More complex protocol
    """
    
    def __init__(self):
        self.server: Optional[BleakServer] = None
        self.clients: Dict[str, BLEClient] = {}
        self.rx_char: Optional[BleakGATTCharacteristic] = None
        self.tx_char: Optional[BleakGATTCharacteristic] = None
        self.on_client_connect: Optional[Callable[[BLEClient], None]] = None
        self.on_client_disconnect: Optional[Callable[[str], None]] = None
        
        if not BLEAK_AVAILABLE:
            raise RuntimeError("Bleak not installed")
    
    async def start(self):
        """Start BLE GATT server"""
        print("[ALT-BT] Starting Bleak BLE server...")
        
        # Create characteristics
        self.rx_char = BleakGATTCharacteristic(
            uuid=MPAP_RX_CHAR_UUID,
            properties=GATTCharacteristicProperties.WRITE,
            value=None,
            descriptors=[]
        )
        
        self.tx_char = BleakGATTCharacteristic(
            uuid=MPAP_TX_CHAR_UUID,
            properties=GATTCharacteristicProperties.READ | GATTCharacteristicProperties.NOTIFY,
            value=None,
            descriptors=[]
        )
        
        # Create service
        service = BleakGATTService(
            uuid=MPAP_SERVICE_UUID,
            characteristics=[self.rx_char, self.tx_char]
        )
        
        # Start server
        self.server = BleakServer(services=[service])
        self.server.set_characteristic_write_request_handler(self._on_write)
        
        await self.server.start()
        print(f"[ALT-BT] BLE server started")
        print(f"[ALT-BT] Service: {MPAP_SERVICE_UUID}")
    
    def _on_write(self, characteristic: BleakGATTCharacteristic, data: bytes, client_address: str):
        """Handle incoming write from client"""
        if client_address not in self.clients:
            # New client
            client = BLEClient(
                address=client_address,
                tx_characteristic=self.tx_char,
                on_data=lambda msg: None,
                on_disconnect=lambda: None
            )
            self.clients[client_address] = client
            
            if self.on_client_connect:
                self.on_client_connect(client)
        
        client = self.clients[client_address]
        
        # Accumulate data (BLE has small MTU, ~20-512 bytes)
        client.buffer += data
        
        # Try to parse complete messages
        while b'\n' in client.buffer:
            idx = client.buffer.index(b'\n')
            message = client.buffer[:idx].decode('utf-8')
            client.buffer = client.buffer[idx+1:]
            
            if client.on_data:
                client.on_data(message)
    
    async def send_to(self, client_address: str, data: dict):
        """Send data to specific client via notification"""
        if client_address not in self.clients:
            return
        
        client = self.clients[client_address]
        payload = json.dumps(data).encode() + b'\n'
        
        # BLE has MTU limitations, chunk if necessary
        chunk_size = 512  # Max BLE MTU
        for i in range(0, len(payload), chunk_size):
            chunk = payload[i:i+chunk_size]
            await self.server.notify(client.tx_characteristic, chunk, client_address)
    
    async def broadcast(self, data: dict):
        """Broadcast to all connected clients"""
        for address in self.clients:
            await self.send_to(address, data)
    
    async def stop(self):
        """Stop server"""
        if self.server:
            await self.server.stop()
        print("[ALT-BT] BLE server stopped")


# Error scenarios to test:
# 1. MTU overflow (>512 bytes)
# 2. Connection timeout
# 3. Concurrent writes from multiple clients
# 4. Buffer overflow from fragmented messages
async def test_bleak_errors():
    """Test error scenarios"""
    print("\n[ALT-BT] Testing error scenarios...")
    
    errors = []
    
    # Test 1: Large message handling
    try:
        large_data = {"data": "x" * 10000}  # 10KB message
        payload = json.dumps(large_data).encode()
        
        if len(payload) > 512:
            errors.append("ERROR: BLE MTU exceeded (payload > 512 bytes)")
            print(f"[ALT-BT] ⚠️  MTU issue: {len(payload)} bytes > 512 limit")
    except Exception as e:
        errors.append(f"Large message error: {e}")
    
    # Test 2: Concurrent client simulation
    try:
        clients = [f"client_{i}" for i in range(100)]
        print(f"[ALT-BT] ⚠️  Concurrent clients: BLE typically max 4-8 simultaneous")
    except Exception as e:
        errors.append(f"Concurrent client error: {e}")
    
    return errors


if __name__ == '__main__':
    if BLEAK_AVAILABLE:
        errors = asyncio.run(test_bleak_errors())
        print(f"\n[ALT-BT] Found {len(errors)} potential issues")
        for err in errors:
            print(f"  - {err}")
    else:
        print("[ALT-BT] Skipped - Bleak not installed")
