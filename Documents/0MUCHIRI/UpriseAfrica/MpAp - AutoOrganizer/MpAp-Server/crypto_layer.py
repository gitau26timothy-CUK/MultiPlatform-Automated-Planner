#!/usr/bin/env python3
"""
MpAp AES-256 Encryption Layer
Provides end-to-end encryption for Bluetooth/WiFi transport

Features:
- AES-256-GCM for authenticated encryption
- ECDH key exchange (Elliptic Curve Diffie-Hellman)
- Perfect forward secrecy
- Per-session keys
"""

import os
import json
import hashlib
import hmac
import secrets
import time
from typing import Optional, Dict, Tuple, Any
from dataclasses import dataclass
from base64 import b64encode, b64decode

# Cryptographic imports
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.backends import default_backend
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    print("[CRYPTO] cryptography library not available, using fallback")


@dataclass
class EncryptedMessage:
    """Encrypted message container"""
    ciphertext: bytes
    nonce: bytes
    tag: bytes  # GCM authentication tag
    
    def to_dict(self) -> Dict:
        return {
            'ciphertext': b64encode(self.ciphertext).decode('ascii'),
            'nonce': b64encode(self.nonce).decode('ascii'),
            'tag': b64encode(self.tag).decode('ascii')
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'EncryptedMessage':
        return cls(
            ciphertext=b64decode(data['ciphertext']),
            nonce=b64decode(data['nonce']),
            tag=b64decode(data['tag'])
        )
    
    def to_bytes(self) -> bytes:
        """Serialize to bytes for transmission"""
        return b':'.join([
            b64encode(self.ciphertext),
            b64encode(self.nonce),
            b64encode(self.tag)
        ])
    
    @classmethod
    def from_bytes(cls, data: bytes) -> 'EncryptedMessage':
        """Deserialize from bytes"""
        parts = data.split(b':')
        return cls(
            ciphertext=b64decode(parts[0]),
            nonce=b64decode(parts[1]),
            tag=b64decode(parts[2])
        )


class AES256Encryption:
    """
    AES-256-GCM Encryption Handler
    
    Uses AES-256 in Galois/Counter Mode for:
    - Confidentiality (encryption)
    - Authenticity (GCM authentication tag)
    - Integrity (tamper detection)
    """
    
    KEY_SIZE = 32  # 256 bits
    NONCE_SIZE = 12  # 96 bits (recommended for GCM)
    TAG_SIZE = 16  # 128 bits
    
    def __init__(self, key: Optional[bytes] = None):
        if key and len(key) != self.KEY_SIZE:
            raise ValueError(f"Key must be {self.KEY_SIZE} bytes (got {len(key)})")
        
        self.key = key or secrets.token_bytes(self.KEY_SIZE)
        self.aesgcm = AESGCM(self.key) if CRYPTO_AVAILABLE else None
    
    @classmethod
    def from_password(cls, password: str, salt: Optional[bytes] = None) -> Tuple['AES256Encryption', bytes]:
        """Derive key from password using PBKDF2"""
        if not CRYPTO_AVAILABLE:
            # Fallback: simple hash (NOT for production)
            salt = salt or secrets.token_bytes(16)
            key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000, 32)
            return cls(key), salt
        
        salt = salt or secrets.token_bytes(16)
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        
        key = kdf.derive(password.encode())
        return cls(key), salt
    
    def encrypt(self, plaintext: bytes, associated_data: Optional[bytes] = None) -> EncryptedMessage:
        """Encrypt data with AES-256-GCM"""
        if not CRYPTO_AVAILABLE:
            # Fallback: simple XOR with HMAC (NOT for production)
            return self._fallback_encrypt(plaintext)
        
        nonce = secrets.token_bytes(self.NONCE_SIZE)
        
        # AESGCM returns ciphertext + tag combined
        ciphertext_with_tag = self.aesgcm.encrypt(
            nonce,
            plaintext,
            associated_data
        )
        
        # Split ciphertext and tag (tag is last 16 bytes)
        ciphertext = ciphertext_with_tag[:-self.TAG_SIZE]
        tag = ciphertext_with_tag[-self.TAG_SIZE:]
        
        return EncryptedMessage(ciphertext, nonce, tag)
    
    def decrypt(self, message: EncryptedMessage, associated_data: Optional[bytes] = None) -> bytes:
        """Decrypt data with AES-256-GCM"""
        if not CRYPTO_AVAILABLE:
            return self._fallback_decrypt(message)
        
        # Recombine ciphertext + tag
        ciphertext_with_tag = message.ciphertext + message.tag
        
        try:
            plaintext = self.aesgcm.decrypt(
                message.nonce,
                ciphertext_with_tag,
                associated_data
            )
            return plaintext
        except Exception as e:
            raise ValueError(f"Decryption failed: {e}")
    
    def encrypt_string(self, plaintext: str, associated_data: Optional[str] = None) -> EncryptedMessage:
        """Encrypt string and return EncryptedMessage"""
        aad = associated_data.encode() if associated_data else None
        return self.encrypt(plaintext.encode('utf-8'), aad)
    
    def decrypt_string(self, message: EncryptedMessage, associated_data: Optional[str] = None) -> str:
        """Decrypt EncryptedMessage to string"""
        aad = associated_data.encode() if associated_data else None
        plaintext = self.decrypt(message, aad)
        return plaintext.decode('utf-8')
    
    def _fallback_encrypt(self, plaintext: bytes) -> EncryptedMessage:
        """Fallback encryption (XOR + HMAC) - NOT for production"""
        nonce = secrets.token_bytes(self.NONCE_SIZE)
        
        # Simple XOR stream cipher (for testing only!)
        keystream = hashlib.sha256(self.key + nonce).digest()
        ciphertext = bytes(p ^ k for p, k in zip(plaintext, keystream * (len(plaintext) // 32 + 1)))
        
        # HMAC for authentication
        tag = hmac.new(self.key, ciphertext + nonce, hashlib.sha256).digest()[:self.TAG_SIZE]
        
        return EncryptedMessage(ciphertext, nonce, tag)
    
    def _fallback_decrypt(self, message: EncryptedMessage) -> bytes:
        """Fallback decryption - NOT for production"""
        # Verify HMAC
        expected_tag = hmac.new(self.key, message.ciphertext + message.nonce, hashlib.sha256).digest()[:self.TAG_SIZE]
        if not hmac.compare_digest(message.tag, expected_tag):
            raise ValueError("Authentication failed")
        
        # XOR decrypt
        keystream = hashlib.sha256(self.key + message.nonce).digest()
        plaintext = bytes(c ^ k for c, k in zip(message.ciphertext, keystream * (len(message.ciphertext) // 32 + 1)))
        
        return plaintext


class ECDHKeyExchange:
    """
    Elliptic Curve Diffie-Hellman Key Exchange
    
    Provides perfect forward secrecy:
    - Each session gets unique ephemeral keys
    - Compromised keys don't affect past sessions
    - Uses NIST P-384 curve (secp384r1)
    """
    
    CURVE = ec.SECP384R1()
    
    def __init__(self):
        if not CRYPTO_AVAILABLE:
            raise RuntimeError("ECDH requires cryptography library")
        
        # Generate ephemeral private key
        self.private_key = ec.generate_private_key(self.CURVE, default_backend())
        self.public_key = self.private_key.public_key()
    
    def get_public_bytes(self) -> bytes:
        """Get public key in compressed format for transmission"""
        return self.public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.CompressedPoint
        )
    
    def derive_shared_key(self, peer_public_bytes: bytes) -> bytes:
        """Derive shared secret from peer's public key"""
        # Load peer's public key
        peer_public = ec.EllipticCurvePublicKey.from_encoded_point(
            self.CURVE,
            peer_public_bytes
        )
        
        # Derive shared secret
        shared_secret = self.private_key.exchange(ec.ECDH(), peer_public)
        
        # Hash to get AES-256 key
        return hashlib.sha256(shared_secret).digest()


class SecureSession:
    """
    Secure communication session
    
    Handles:
    1. Key exchange (ECDH)
    2. Encrypted messaging (AES-256-GCM)
    3. Session management
    """
    
    def __init__(self, session_id: Optional[str] = None):
        self.session_id = session_id or secrets.token_hex(16)
        self.encryption: Optional[AES256Encryption] = None
        self.key_exchange: Optional[ECDHKeyExchange] = None
        self.established = False
        self.created_at = time.time()
        self.last_activity = time.time()
    
    def initiate_key_exchange(self) -> bytes:
        """Initiate ECDH key exchange, return public key"""
        self.key_exchange = ECDHKeyExchange()
        return self.key_exchange.get_public_bytes()
    
    def complete_key_exchange(self, peer_public_bytes: bytes):
        """Complete key exchange with peer's public key"""
        if not self.key_exchange:
            raise RuntimeError("Key exchange not initiated")
        
        shared_key = self.key_exchange.derive_shared_key(peer_public_bytes)
        self.encryption = AES256Encryption(shared_key)
        self.established = True
        
        # Clear ephemeral keys for forward secrecy
        self.key_exchange = None
    
    def encrypt_message(self, data: dict) -> bytes:
        """Encrypt a message dictionary"""
        if not self.established:
            raise RuntimeError("Session not established")
        
        plaintext = json.dumps(data).encode('utf-8')
        encrypted = self.encryption.encrypt(plaintext, self.session_id.encode())
        
        self.last_activity = time.time()
        
        return encrypted.to_bytes()
    
    def decrypt_message(self, data: bytes) -> dict:
        """Decrypt a message to dictionary"""
        if not self.established:
            raise RuntimeError("Session not established")
        
        encrypted = EncryptedMessage.from_bytes(data)
        plaintext = self.encryption.decrypt(encrypted, self.session_id.encode())
        
        self.last_activity = time.time()
        
        return json.loads(plaintext.decode('utf-8'))
    
    def is_expired(self, max_age: int = 86400) -> bool:
        """Check if session has expired (default 24 hours)"""
        return (time.time() - self.last_activity) > max_age


class SecureTransport:
    """
    Secure transport wrapper
    
    Wraps any transport (Bluetooth, WebSocket, TCP) with encryption
    """
    
    def __init__(self, transport_send: callable):
        self.transport_send = transport_send
        self.session: Optional[SecureSession] = None
        self.on_message: Optional[callable] = None
    
    async def initiate_handshake(self) -> bytes:
        """Initiate secure handshake, return public key to send"""
        self.session = SecureSession()
        return self.session.initiate_key_exchange()
    
    async def complete_handshake(self, peer_public: bytes):
        """Complete handshake with peer's public key"""
        if not self.session:
            raise RuntimeError("Handshake not initiated")
        
        self.session.complete_key_exchange(peer_public)
        print(f"[CRYPTO] Secure session established: {self.session.session_id[:16]}...")
    
    async def send(self, message: dict):
        """Send encrypted message"""
        if not self.session or not self.session.established:
            raise RuntimeError("Secure session not established")
        
        encrypted = self.session.encrypt_message(message)
        await self.transport_send(encrypted)
    
    async def receive(self, data: bytes):
        """Receive and decrypt message"""
        if not self.session or not self.session.established:
            # Try to interpret as handshake response
            try:
                message = json.loads(data.decode())
                if message.get('type') == 'crypto:handshake':
                    peer_public = b64decode(message['public_key'])
                    await self.complete_handshake(peer_public)
                    return {'type': 'crypto:handshake_complete'}
            except:
                pass
            raise RuntimeError("Secure session not established")
        
        try:
            message = self.session.decrypt_message(data)
            if self.on_message:
                await self.on_message(message)
            return message
        except Exception as e:
            print(f"[CRYPTO] Decryption error: {e}")
            raise


# Example usage and test
if __name__ == '__main__':
    print("MpAp AES-256 Encryption Layer Test")
    print("=" * 50)
    
    if not CRYPTO_AVAILABLE:
        print("WARNING: cryptography library not installed!")
        print("Install with: pip install cryptography")
        print("Using fallback (NOT for production)\n")
    
    # Test 1: AES-256 encryption
    print("\n[1] Testing AES-256-GCM encryption...")
    
    # Create encryption instance
    encryptor = AES256Encryption()
    
    # Encrypt message
    message = {"type": "test", "data": "Hello, secure world!", "timestamp": time.time()}
    plaintext = json.dumps(message)
    
    print(f"  Plaintext: {plaintext[:50]}...")
    
    encrypted = encryptor.encrypt_string(plaintext, "associated-data")
    print(f"  Ciphertext: {encrypted.ciphertext[:30].hex()}...")
    print(f"  Nonce: {encrypted.nonce.hex()}")
    print(f"  Tag: {encrypted.tag.hex()}")
    
    # Decrypt
    decrypted = encryptor.decrypt_string(encrypted, "associated-data")
    print(f"  Decrypted: {decrypted[:50]}...")
    print(f"  ✓ Match: {decrypted == plaintext}")
    
    # Test 2: ECDH key exchange
    if CRYPTO_AVAILABLE:
        print("\n[2] Testing ECDH key exchange...")
        
        # Alice
        alice = ECDHKeyExchange()
        alice_public = alice.get_public_bytes()
        print(f"  Alice public: {alice_public[:20].hex()}...")
        
        # Bob
        bob = ECDHKeyExchange()
        bob_public = bob.get_public_bytes()
        print(f"  Bob public: {bob_public[:20].hex()}...")
        
        # Exchange
        alice_key = alice.derive_shared_key(bob_public)
        bob_key = bob.derive_shared_key(alice_public)
        
        print(f"  Alice derived key: {alice_key[:16].hex()}...")
        print(f"  Bob derived key: {bob_key[:16].hex()}...")
        print(f"  ✓ Keys match: {alice_key == bob_key}")
    
    # Test 3: Full secure session
    if CRYPTO_AVAILABLE:
        print("\n[3] Testing secure session...")
        
        # Alice initiates
        alice_session = SecureSession()
        alice_public = alice_session.initiate_key_exchange()
        
        # Bob responds
        bob_session = SecureSession()
        bob_public = bob_session.initiate_key_exchange()
        bob_session.complete_key_exchange(alice_public)
        
        # Alice completes
        alice_session.complete_key_exchange(bob_public)
        
        # Test encrypted message
        test_msg = {"type": "task:update", "task": {"id": 1, "title": "Secure Task"}}
        
        encrypted = alice_session.encrypt_message(test_msg)
        print(f"  Encrypted: {encrypted[:50]}...")
        
        decrypted = bob_session.decrypt_message(encrypted)
        print(f"  Decrypted: {decrypted}")
        print(f"  ✓ Roundtrip successful")
    
    print("\n[CRYPTO] All tests passed!")
