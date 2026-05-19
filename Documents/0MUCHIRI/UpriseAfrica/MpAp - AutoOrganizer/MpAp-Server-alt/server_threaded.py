#!/usr/bin/env python3
"""
ALTERNATIVE 3: Threaded Server (vs Asyncio)
Uses threading instead of asyncio for I/O
"""

import socket
import threading
import json
import struct
import time
import sqlite3
from typing import Dict, Optional, Callable, Any
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
import queue


@dataclass
class ThreadedClient:
    """Threaded client wrapper"""
    socket: socket.socket
    address: str
    id: str
    connected_at: float
    message_queue: queue.Queue = None
    
    def __post_init__(self):
        if self.message_queue is None:
            self.message_queue = queue.Queue()


class ThreadedServer:
    """
    Alternative server using threading (vs asyncio)
    
    PROS:
    - Simpler code (no async/await)
    - Blocking I/O is natural
    - Easier debugging
    
    CONS:
    - Thread overhead (memory per connection)
    - GIL limits CPU parallelism
    - Thread safety issues (need locks)
    
    ERRORS TO WATCH:
    1. Race conditions on shared data
    2. Thread leaks (not cleaning up)
    3. Deadlocks on locks
    4. Memory growth with many threads
    """
    
    def __init__(self, host: str = '0.0.0.0', port: int = 5546):
        self.host = host
        self.port = port
        self.server_socket: Optional[socket.socket] = None
        self.clients: Dict[str, ThreadedClient] = {}
        self.running = False
        self.lock = threading.Lock()  # ERROR-PRONE: Shared state
        
        # Callbacks
        self.on_connect: Optional[Callable[[ThreadedClient], None]] = None
        self.on_disconnect: Optional[Callable[[str], None]] = None
        self.on_message: Optional[Callable[[str, dict], None]] = None
        
        # Thread pool for handling clients
        self.executor = ThreadPoolExecutor(max_workers=100)
        
        print(f"[ALT-SERVER] Threaded server initialized on {host}:{port}")
    
    def start(self):
        """Start threaded server"""
        self.running = True
        
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.server_socket.bind((self.host, self.port))
        self.server_socket.listen(5)
        
        print(f"[ALT-SERVER] Threaded server listening on {self.host}:{self.port}")
        
        # Accept loop in main thread
        while self.running:
            try:
                client_sock, client_addr = self.server_socket.accept()
                self.executor.submit(self._handle_client, client_sock, client_addr)
            except Exception as e:
                if self.running:
                    print(f"[ALT-SERVER] Accept error: {e}")
    
    def _handle_client(self, client_sock: socket.socket, client_addr: tuple):
        """Handle single client in thread"""
        address = f"{client_addr[0]}:{client_addr[1]}"
        client_id = f"thread_{threading.current_thread().ident}_{address}"
        
        client = ThreadedClient(
            socket=client_sock,
            address=address,
            id=client_id,
            connected_at=time.time()
        )
        
        # CRITICAL SECTION: Shared state modification
        with self.lock:
            self.clients[client_id] = client
        
        print(f"[ALT-SERVER] Client connected: {address} (thread: {threading.current_thread().ident})")
        
        if self.on_connect:
            self.on_connect(client)
        
        # Start sender thread
        sender_thread = threading.Thread(target=self._client_sender, args=(client,))
        sender_thread.daemon = True
        sender_thread.start()
        
        # Receive loop
        try:
            buffer = b""
            while self.running:
                # Read length prefix
                while len(buffer) < 4:
                    data = client_sock.recv(4 - len(buffer))
                    if not data:
                        raise ConnectionError("Client disconnected")
                    buffer += data
                
                length = struct.unpack('!I', buffer[:4])[0]
                buffer = buffer[4:]
                
                # Read payload
                while len(buffer) < length:
                    data = client_sock.recv(length - len(buffer))
                    if not data:
                        raise ConnectionError("Client disconnected")
                    buffer += data
                
                payload = buffer[:length]
                buffer = buffer[length:]
                
                # Parse and handle
                try:
                    message = json.loads(payload.decode('utf-8'))
                    if self.on_message:
                        self.on_message(client_id, message)
                except json.JSONDecodeError as e:
                    print(f"[ALT-SERVER] JSON error from {address}: {e}")
                    
        except Exception as e:
            print(f"[ALT-SERVER] Client error {address}: {e}")
        finally:
            # Cleanup
            self._cleanup_client(client_id)
    
    def _client_sender(self, client: ThreadedClient):
        """Send messages to client from queue"""
        try:
            while self.running:
                try:
                    # Non-blocking with timeout
                    message = client.message_queue.get(timeout=1.0)
                    data = json.dumps(message).encode('utf-8')
                    frame = struct.pack('!I', len(data)) + data
                    client.socket.send(frame)
                except queue.Empty:
                    continue
                except Exception as e:
                    print(f"[ALT-SERVER] Send error: {e}")
                    break
        except Exception as e:
            print(f"[ALT-SERVER] Sender thread error: {e}")
    
    def send_to(self, client_id: str, message: dict):
        """Send message to specific client"""
        # RACE CONDITION: Client might disconnect between check and send
        with self.lock:
            if client_id not in self.clients:
                return
            client = self.clients[client_id]
        
        try:
            client.message_queue.put(message, block=False)
        except queue.Full:
            print(f"[ALT-SERVER] Queue full for {client_id}")
    
    def broadcast(self, message: dict):
        """Broadcast to all clients"""
        # RACE CONDITION: Dictionary size change during iteration
        with self.lock:
            client_ids = list(self.clients.keys())
        
        for client_id in client_ids:
            self.send_to(client_id, message)
    
    def _cleanup_client(self, client_id: str):
        """Clean up disconnected client"""
        with self.lock:
            if client_id in self.clients:
                client = self.clients[client_id]
                try:
                    client.socket.close()
                except:
                    pass
                del self.clients[client_id]
        
        print(f"[ALT-SERVER] Client disconnected: {client_id}")
        
        if self.on_disconnect:
            self.on_disconnect(client_id)
    
    def stop(self):
        """Stop server"""
        self.running = False
        
        with self.lock:
            for client in self.clients.values():
                try:
                    client.socket.close()
                except:
                    pass
            self.clients.clear()
        
        if self.server_socket:
            self.server_socket.close()
        
        self.executor.shutdown(wait=True)
        print("[ALT-SERVER] Threaded server stopped")
    
    def get_stats(self) -> dict:
        """Get server statistics"""
        with self.lock:
            return {
                'active_threads': threading.active_count(),
                'connected_clients': len(self.clients),
                'thread_pool_size': self.executor._max_workers,
            }


# Error detection
def test_threaded_errors():
    """Test threaded server error scenarios"""
    print("\n[ALT-SERVER] Testing threaded server errors...")
    
    errors = []
    server = ThreadedServer(port=5547)
    
    # Test 1: Race condition simulation
    print("[ALT-SERVER] Testing race conditions...")
    import concurrent.futures
    
    results = []
    def concurrent_access():
        # Simulate concurrent dictionary access
        try:
            for i in range(100):
                server.clients[f"fake_{i}"] = None
                if f"fake_{i}" in server.clients:
                    del server.clients[f"fake_{i}"]
            return "ok"
        except Exception as e:
            return f"error: {e}"
    
    # This will fail without the lock!
    # with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
    #     futures = [ex.submit(concurrent_access) for _ in range(10)]
    #     results = [f.result() for f in futures]
    
    if any("error" in str(r) for r in results):
        errors.append("Race condition detected without proper locking")
    
    # Test 2: Thread exhaustion
    print("[ALT-SERVER] Testing thread limits...")
    max_threads = 100
    print(f"[ALT-SERVER] ⚠️  Thread pool size: {max_threads}")
    print(f"[ALT-SERVER] ⚠️  Each thread uses ~8MB stack = ~800MB for 100 threads")
    errors.append(f"Thread pool uses {max_threads} threads - memory intensive")
    
    # Test 3: GIL limitation
    print("[ALT-SERVER] ⚠️  GIL prevents true parallelism - CPU-bound tasks block")
    errors.append("GIL limits CPU parallelism")
    
    return errors


if __name__ == '__main__':
    errors = test_threaded_errors()
    print(f"\n[ALT-SERVER] Found {len(errors)} issues")
    for err in errors:
        print(f"  - {err}")
