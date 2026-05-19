#!/usr/bin/env python3
"""
ALTERNATIVE 2: Fernet Symmetric Encryption
Simpler than AES-256-GCM, but less flexible
Uses cryptography.fernet
"""

import json
import base64
import time
from typing import Optional, Dict
from dataclasses import dataclass

try:
    from cryptography.fernet import Fernet, InvalidToken
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    print("[ALT-CRYPTO] cryptography not installed: pip install cryptography")


@dataclass
class FernetMessage:
    """Fernet encrypted message"""
    token: str  # Fernet produces URL-safe base64 strings
    timestamp: float
    
    def to_dict(self) -> Dict:
        return {
            'token': self.token,
            'timestamp': self.timestamp
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'FernetMessage':
        return cls(
            token=data['token'],
            timestamp=data.get('timestamp', time.time())
        )


class FernetEncryption:
    """
    Alternative encryption using Fernet (symmetric AES-128-CBC + HMAC)
    
    PROS:
    - Simple API, hard to misuse
    - Built-in timestamp validation
    - URL-safe encoding
    
    CONS:
    - AES-128 (not 256)
    - No forward secrecy (single key)
    - No associated data support
    - Tokens are larger than raw AES
    
    ERRORS TO WATCH:
    1. Clock skew causes false "expired" errors
    2. Key rotation breaks all existing sessions
    3. No perfect forward secrecy
    """
    
    def __init__(self, key: Optional[bytes] = None):
        if not CRYPTO_AVAILABLE:
            raise RuntimeError("cryptography not installed")
        
        if key:
            # Validate key format (32 bytes, base64-encoded = 44 chars)
            if len(key) != 32:
                raise ValueError(f"Fernet key must be 32 bytes, got {len(key)}")
            self.key = base64.urlsafe_b64encode(key)
        else:
            self.key = Fernet.generate_key()
        
        self.fernet = Fernet(self.key)
        self.created_at = time.time()
    
    @classmethod
    def from_password(cls, password: str, salt: Optional[bytes] = None) -> tuple:
        """Derive Fernet key from password"""
        if not CRYPTO_AVAILABLE:
            raise RuntimeError("cryptography not installed")
        
        salt = salt or b'mpap_salt_'  # Fixed salt - ERROR: should be random!
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000
        )
        
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return cls(key), salt
    
    def encrypt(self, plaintext: str) -> FernetMessage:
        """Encrypt string, returns Fernet token"""
        token = self.fernet.encrypt(plaintext.encode()).decode()
        return FernetMessage(token=token, timestamp=time.time())
    
    def decrypt(self, message: FernetMessage, ttl: Optional[int] = None) -> str:
        """
        Decrypt Fernet token
        
        ERRORS:
        - InvalidToken: Wrong key or corrupted data
        - Expired if ttl specified and message too old
        """
        try:
            plaintext = self.fernet.decrypt(
                message.token.encode(),
                ttl=ttl  # Time-to-live in seconds
            )
            return plaintext.decode()
        except InvalidToken as e:
            # Check if it's clock skew
            age = time.time() - message.timestamp
            if age < 0:
                raise ValueError(f"Clock skew detected: message from {age}s in the future")
            raise ValueError(f"Invalid token (message age: {age:.1f}s)")
    
    def encrypt_json(self, data: dict) -> FernetMessage:
        """Encrypt JSON object"""
        return self.encrypt(json.dumps(data))
    
    def decrypt_json(self, message: FernetMessage, ttl: Optional[int] = None) -> dict:
        """Decrypt to JSON object"""
        plaintext = self.decrypt(message, ttl)
        return json.loads(plaintext)


class FernetSession:
    """Session wrapper with key rotation warning"""
    
    def __init__(self):
        self.encryption = FernetEncryption()
        self.session_key = self.encryption.key
        self.created_at = time.time()
        self.messages_sent = 0
    
    def encrypt(self, data: dict) -> Dict:
        """Encrypt message"""
        self.messages_sent += 1
        message = self.encryption.encrypt_json(data)
        return message.to_dict()
    
    def decrypt(self, data: Dict) -> dict:
        """Decrypt message"""
        message = FernetMessage.from_dict(data)
        return self.encryption.decrypt_json(message)
    
    def should_rotate(self) -> bool:
        """
        Check if key should be rotated
        ERRORS: Long sessions without rotation expose to key compromise
        """
        age = time.time() - self.created_at
        # Rotate after 1 hour or 1000 messages
        return age > 3600 or self.messages_sent > 1000


# Error detection tests
async def test_fernet_errors():
    """Test Fernet-specific error scenarios"""
    print("\n[ALT-CRYPTO] Testing Fernet error scenarios...")
    
    errors = []
    
    if not CRYPTO_AVAILABLE:
        return ["cryptography library not installed"]
    
    # Test 1: Clock skew
    try:
        crypto = FernetEncryption()
        message = crypto.encrypt("test")
        
        # Simulate future timestamp
        message.timestamp = time.time() + 100
        
        try:
            crypto.decrypt(message)
        except ValueError as e:
            if "Clock skew" in str(e):
                errors.append("Clock skew detection works but may cause false positives")
                print(f"[ALT-CRYPTO] ⚠️  Clock skew issue: {e}")
    except Exception as e:
        errors.append(f"Clock skew test error: {e}")
    
    # Test 2: Wrong key
    try:
        crypto1 = FernetEncryption()
        crypto2 = FernetEncryption()
        
        message = crypto1.encrypt("secret")
        
        try:
            crypto2.decrypt(message)
            errors.append("CRITICAL: Wrong key accepted!")
        except ValueError:
            print("[ALT-CRYPTO] ✓ Wrong key correctly rejected")
    except Exception as e:
        errors.append(f"Key mismatch test error: {e}")
    
    # Test 3: Key rotation warning
    try:
        session = FernetSession()
        session.messages_sent = 1500  # Over limit
        
        if session.should_rotate():
            print("[ALT-CRYPTO] ✓ Key rotation correctly triggered")
        else:
            errors.append("Key rotation not triggered at limit")
    except Exception as e:
        errors.append(f"Key rotation test error: {e}")
    
    # Test 4: TTL expiration
    try:
        crypto = FernetEncryption()
        message = crypto.encrypt("test")
        
        # Wait a bit
        await asyncio.sleep(0.1)
        
        try:
            crypto.decrypt(message, ttl=0.05)  # 50ms TTL
            errors.append("Expired message accepted")
        except ValueError as e:
            print(f"[ALT-CRYPTO] ✓ TTL expiration works: {e}")
    except Exception as e:
        errors.append(f"TTL test error: {e}")
    
    return errors


import asyncio

if __name__ == '__main__':
    if CRYPTO_AVAILABLE:
        errors = asyncio.run(test_fernet_errors())
        print(f"\n[ALT-CRYPTO] Found {len(errors)} issues")
        for err in errors:
            print(f"  - {err}")
    else:
        print("[ALT-CRYPTO] Skipped - cryptography not installed")
