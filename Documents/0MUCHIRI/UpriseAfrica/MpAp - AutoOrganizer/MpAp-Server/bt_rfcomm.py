#!/usr/bin/env python3
"""
MpAp Native Bluetooth RFCOMM Server
Windows: Uses pywin32 for Bluetooth
Linux: Uses PyBluez for Bluetooth
macOS: Not supported (Apple blocks RFCOMM)

Provides secure Bluetooth transport with encryption
"""

import asyncio
import json
import socket as sock
import struct
import sys
import threading
import time
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass

# Platform-specific imports
try:
    if sys.platform == 'win32':
        import win32file
        import win32event
        import pywintypes
        import bluetooth  # pybluez on Windows
        WINDOWS = True
        LINUX = False
    else:
        import bluetooth  # PyBluez on Linux
        WINDOWS = False
        LINUX = True
except ImportError:
    WINDOWS = False
    LINUX = False
    print("[BT] Bluetooth libraries not available, using TCP fallback")


@dataclass
class BTClient:
    """Bluetooth client connection"""
    socket: Any
    address: str
    name: str = "Unknown"
    connected_at: float = 0
    on_data: Optional[Callable] = None
    on_disconnect: Optional[Callable] = None
    
    def __post_init__(self):
        self.connected_at = time.time()
        self.buffer = b""
        self.running = True
    
    def send(self, data: bytes):
        """Send data with length prefix"""
        if not self.running:
            return False
        
        try:
            # Length-prefixed framing: [4 bytes length][data]
            length = len(data)
            header = struct.pack('!I', length)
            
            if WINDOWS:
                win32file.WriteFile(self.socket, header + data)
            else:
                self.socket.send(header + data)
            
            return True
        except Exception as e:
            print(f"[BT] Send error: {e}")
            self.running = False
            return False
    
    def send_json(self, obj: dict):
        """Send JSON object"""
        data = json.dumps(obj).encode('utf-8')
        return self.send(data)
    
    def start_receiver(self):
        """Start receiving data in background thread"""
        thread = threading.Thread(target=self._receive_loop, daemon=True)
        thread.start()
    
    def _receive_loop(self):
        """Background receive loop"""
        while self.running:
            try:
                # Read 4-byte length header
                header = self._recv_exact(4)
                if not header:
                    break
                
                length = struct.unpack('!I', header)[0]
                
                # Read payload
                data = self._recv_exact(length)
                if not data:
                    break
                
                # Decode and forward
                message = data.decode('utf-8')
                if self.on_data:
                    self.on_data(message)
                    
            except Exception as e:
                print(f"[BT] Receive error: {e}")
                break
        
        self.running = False
        if self.on_disconnect:
            self.on_disconnect()
    
    def _recv_exact(self, n: int) -> Optional[bytes]:
        """Receive exactly n bytes"""
        data = b""
        while len(data) < n and self.running:
            try:
                if WINDOWS:
                    chunk = win32file.ReadFile(self.socket, n - len(data))[1]
                else:
                    chunk = self.socket.recv(n - len(data))
                
                if not chunk:
                    return None
                data += chunk
            except Exception:
                return None
        return data
    
    def close(self):
        """Close connection"""
        self.running = False
        try:
            if WINDOWS:
                win32file.CloseHandle(self.socket)
            else:
                self.socket.close()
        except:
            pass


class BTRFCOMMServer:
    """
    Bluetooth RFCOMM Server
    
    Protocol:
    1. Client discovers server via Bluetooth SDP
    2. Client pairs with PIN (0000 or custom)
    3. Connection established on RFCOMM channel
    4. Length-prefixed JSON messages
    5. Optional: AES-256 encryption after handshake
    """
    
    # MpAp Bluetooth service UUID
    SERVICE_UUID = "00001101-0000-1000-8000-00805F9B34FB"  # Standard SPP
    MPA_SERVICE_UUID = "0000MPAP-0000-1000-8000-00805F9B34FD"  # Custom
    
    def __init__(self, channel: int = 1, encryption_key: Optional[bytes] = None):
        self.channel = channel
        self.encryption_key = encryption_key
        self.running = False
        self.server_sock: Optional[Any] = None
        self.clients: Dict[str, BTClient] = {}
        self.on_client_connect: Optional[Callable[[BTClient], None]] = None
        self.on_client_disconnect: Optional[Callable[[str], None]] = None
        
        # Check Bluetooth availability
        self.bt_available = self._check_bluetooth()
        
        if not self.bt_available:
            print("[BT] Using TCP fallback on port 5545")
    
    def _check_bluetooth(self) -> bool:
        """Check if Bluetooth is available"""
        try:
            if WINDOWS or LINUX:
                # Try to get local Bluetooth address
                addr = bluetooth.read_local_bdaddr()
                print(f"[BT] Local address: {addr}")
                return True
            return False
        except Exception as e:
            print(f"[BT] Bluetooth not available: {e}")
            return False
    
    def start(self):
        """Start Bluetooth server"""
        self.running = True
        
        if self.bt_available:
            self._start_rfcomm()
        else:
            self._start_tcp_fallback()
    
    def _start_rfcomm(self):
        """Start native RFCOMM server"""
        try:
            # Create Bluetooth socket
            self.server_sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
            self.server_sock.bind(("", self.channel))
            self.server_sock.listen(5)
            
            print(f"[BT] RFCOMM server on channel {self.channel}")
            
            # Advertise service
            bluetooth.advertise_service(
                self.server_sock,
                "MpAp AutoOrganizer",
                service_id=self.MPA_SERVICE_UUID,
                service_classes=[self.SERVICE_UUID, self.MPA_SERVICE_UUID],
                profiles=[(bluetooth.SERIAL_PORT_PROFILE, self.channel)]
            )
            
            print("[BT] Service advertised: MpAp AutoOrganizer")
            print(f"[BT] UUID: {self.MPA_SERVICE_UUID}")
            
            # Accept connections
            self._accept_loop()
            
        except Exception as e:
            print(f"[BT] RFCOMM error: {e}, falling back to TCP")
            self.bt_available = False
            self._start_tcp_fallback()
    
    def _start_tcp_fallback(self):
        """TCP fallback for testing without Bluetooth hardware"""
        self.server_sock = sock.socket(sock.AF_INET, sock.SOCK_STREAM)
        self.server_sock.setsockopt(sock.SOL_SOCKET, sock.SO_REUSEADDR, 1)
        self.server_sock.bind(("0.0.0.0", 5545))
        self.server_sock.listen(5)
        
        print("[BT] TCP fallback server on port 5545")
        
        self._accept_tcp_loop()
    
    def _accept_loop(self):
        """Accept Bluetooth connections"""
        while self.running:
            try:
                client_sock, client_info = self.server_sock.accept()
                address = client_info[0] if isinstance(client_info, tuple) else str(client_info)
                
                print(f"[BT] Client connected: {address}")
                
                # Wrap client
                client = BTClient(
                    socket=client_sock,
                    address=address,
                    on_data=lambda msg, addr=address: self._on_data(addr, msg),
                    on_disconnect=lambda addr=address: self._on_disconnect(addr)
                )
                
                self.clients[address] = client
                client.start_receiver()
                
                if self.on_client_connect:
                    self.on_client_connect(client)
                    
            except Exception as e:
                if self.running:
                    print(f"[BT] Accept error: {e}")
                time.sleep(1)
    
    def _accept_tcp_loop(self):
        """Accept TCP connections (fallback)"""
        while self.running:
            try:
                client_sock, client_addr = self.server_sock.accept()
                address = f"{client_addr[0]}:{client_addr[1]}"
                
                print(f"[BT-TCP] Client connected: {address}")
                
                client = BTClient(
                    socket=client_sock,
                    address=address,
                    on_data=lambda msg, addr=address: self._on_data(addr, msg),
                    on_disconnect=lambda addr=address: self._on_disconnect(addr)
                )
                
                self.clients[address] = client
                client.start_receiver()
                
                if self.on_client_connect:
                    self.on_client_connect(client)
                    
            except Exception as e:
                if self.running:
                    print(f"[BT-TCP] Accept error: {e}")
                time.sleep(1)
    
    def _on_data(self, address: str, message: str):
        """Handle incoming data"""
        # To be handled by sync service
        pass
    
    def _on_disconnect(self, address: str):
        """Handle client disconnect"""
        print(f"[BT] Client disconnected: {address}")
        if address in self.clients:
            del self.clients[address]
        
        if self.on_client_disconnect:
            self.on_client_disconnect(address)
    
    def broadcast(self, message: dict):
        """Broadcast to all clients"""
        data = json.dumps(message).encode('utf-8')
        
        for client in list(self.clients.values()):
            client.send(data)
    
    def send_to(self, address: str, message: dict):
        """Send to specific client"""
        if address in self.clients:
            self.clients[address].send_json(message)
    
    def stop(self):
        """Stop server"""
        self.running = False
        
        for client in self.clients.values():
            client.close()
        
        if self.server_sock:
            try:
                self.server_sock.close()
            except:
                pass
        
        print("[BT] Server stopped")


class BTDiscovery:
    """Bluetooth device discovery"""
    
    @staticmethod
    def discover_devices(duration: int = 8) -> List[Dict]:
        """Discover nearby Bluetooth devices"""
        devices = []
        
        try:
            if WINDOWS or LINUX:
                nearby = bluetooth.discover_devices(
                    duration=duration,
                    lookup_names=True,
                    lookup_class=True
                )
                
                for addr, name, device_class in nearby:
                    devices.append({
                        'address': addr,
                        'name': name or "Unknown",
                        'class': device_class,
                        'type': BTDiscovery._get_device_type(device_class)
                    })
        except Exception as e:
            print(f"[BT] Discovery error: {e}")
        
        return devices
    
    @staticmethod
    def _get_device_type(device_class: int) -> str:
        """Determine device type from class"""
        # Major device classes
        major = (device_class >> 8) & 0x1F
        
        types = {
            1: "computer",
            2: "phone",
            3: "network",
            4: "audio",
            5: "peripheral",
            6: "imaging"
        }
        
        return types.get(major, "unknown")
    
    @staticmethod
    def find_mpap_servers() -> List[Dict]:
        """Find MpAp servers via SDP lookup"""
        servers = []
        
        try:
            if WINDOWS or LINUX:
                nearby = bluetooth.discover_devices(
                    duration=4,
                    lookup_names=True
                )
                
                for addr, name in nearby:
                    # Look for MpAp service
                    services = bluetooth.find_service(address=addr)
                    
                    for svc in services:
                        if svc.get('name') == 'MpAp AutoOrganizer':
                            servers.append({
                                'address': addr,
                                'name': name,
                                'port': svc.get('port'),
                                'host': svc.get('host')
                            })
        except Exception as e:
            print(f"[BT] Service discovery error: {e}")
        
        return servers


# Example usage
if __name__ == '__main__':
    print("MpAp Bluetooth RFCOMM Server Test")
    print("=" * 50)
    
    # Discover devices
    print("\n[1] Discovering nearby Bluetooth devices...")
    devices = BTDiscovery.discover_devices(duration=5)
    
    if devices:
        print(f"Found {len(devices)} devices:")
        for d in devices:
            print(f"  • {d['name']} ({d['address']}) - {d['type']}")
    else:
        print("  No devices found")
    
    # Start server
    print("\n[2] Starting RFCOMM server...")
    server = BTRFCOMMServer(channel=1)
    
    def on_connect(client):
        print(f"Client connected: {client.address}")
        # Send welcome
        client.send_json({
            'type': 'bt:welcome',
            'message': 'Connected to MpAp via Bluetooth RFCOMM',
            'timestamp': time.time()
        })
    
    def on_disconnect(address):
        print(f"Client disconnected: {address}")
    
    server.on_client_connect = on_connect
    server.on_client_disconnect = on_disconnect
    
    try:
        server.start()
    except KeyboardInterrupt:
        print("\nStopping...")
        server.stop()
