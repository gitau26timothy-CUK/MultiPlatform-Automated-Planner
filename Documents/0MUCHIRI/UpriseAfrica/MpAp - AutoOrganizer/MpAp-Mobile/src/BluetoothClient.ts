/**
 * MpAp Bluetooth Client
 * Handles RFCOMM connection to desktop server with encryption
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { Task, Event, BluetoothDevice, ColumnType, SyncMessage, EncryptedMessage } from './types';

// Native Bluetooth module
const { BluetoothClassic, BLEManager } = NativeModules;

// AES-256 encryption (simplified - in production use native crypto)
class AES256Crypto {
  private key: Uint8Array;

  constructor(key?: Uint8Array) {
    this.key = key || this.generateKey();
  }

  private generateKey(): Uint8Array {
    const key = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      key[i] = Math.floor(Math.random() * 256);
    }
    return key;
  }

  async deriveFromPassword(password: string, salt: string): Promise<void> {
    // PBKDF2 derivation would happen here
    // For now, simple hash
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    
    // Simple key derivation (replace with proper PBKDF2 in production)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data[i]) | 0;
    }
    
    for (let i = 0; i < 32; i++) {
      this.key[i] = (hash >> (i % 4 * 8)) & 0xFF;
    }
  }

  encrypt(plaintext: string): EncryptedMessage {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate nonce
    const nonce = new Uint8Array(12);
    for (let i = 0; i < 12; i++) {
      nonce[i] = Math.floor(Math.random() * 256);
    }
    
    // XOR encryption (simplified - replace with AES-GCM in production)
    const ciphertext = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const keyByte = this.key[i % 32];
      const nonceByte = nonce[i % 12];
      ciphertext[i] = data[i] ^ keyByte ^ nonceByte;
    }
    
    // HMAC tag (simplified)
    const tag = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      tag[i] = this.key[i] ^ nonce[i % 12];
    }
    
    return {
      ciphertext: this.arrayToBase64(ciphertext),
      nonce: this.arrayToBase64(nonce),
      tag: this.arrayToBase64(tag),
    };
  }

  decrypt(message: EncryptedMessage): string {
    const ciphertext = this.base64ToArray(message.ciphertext);
    const nonce = this.base64ToArray(message.nonce);
    
    // XOR decryption
    const plaintext = new Uint8Array(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i++) {
      const keyByte = this.key[i % 32];
      const nonceByte = nonce[i % 12];
      plaintext[i] = ciphertext[i] ^ keyByte ^ nonceByte;
    }
    
    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  }

  private arrayToBase64(arr: Uint8Array): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    while (i < arr.length) {
      const a = arr[i++];
      const b = arr[i++] || 0;
      const c = arr[i++] || 0;
      
      const bitmap = (a << 16) | (b << 8) | c;
      
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += chars.charAt((bitmap >> 6) & 63);
      result += chars.charAt(bitmap & 63);
    }
    
    const padding = arr.length % 3;
    if (padding === 1) {
      result = result.slice(0, -2) + '==';
    } else if (padding === 2) {
      result = result.slice(0, -1) + '=';
    }
    
    return result;
  }

  private base64ToArray(str: string): Uint8Array {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const result: number[] = [];
    let i = 0;
    
    str = str.replace(/=/g, '');
    
    while (i < str.length) {
      const a = chars.indexOf(str[i++]);
      const b = chars.indexOf(str[i++]);
      const c = chars.indexOf(str[i++]) || 0;
      const d = chars.indexOf(str[i++]) || 0;
      
      const bitmap = (a << 18) | (b << 12) | (c << 6) | d;
      
      result.push((bitmap >> 16) & 255);
      if (c !== 64) result.push((bitmap >> 8) & 255);
      if (d !== 64) result.push(bitmap & 255);
    }
    
    return new Uint8Array(result);
  }
}

export class MpApBluetoothClient {
  // Connection state
  private connected = false;
  private socket: any = null;
  private encryption: AES256Crypto | null = null;
  private messageBuffer = '';

  // Data cache
  private tasks: Task[] = [];
  private events: Event[] = [];

  // Callbacks
  onConnected?: () => void;
  onDisconnected?: () => void;
  onTasksSynced?: (tasks: Task[]) => void;
  onEventsSynced?: (events: Event[]) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: number) => void;
  onNotification?: (title: string, message: string) => void;

  /**
   * Connect to MpAp server via Bluetooth RFCOMM
   */
  async connect(deviceAddress: string): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // Android Bluetooth Classic
        await BluetoothClassic.connect(deviceAddress, { secure: true });
        this.socket = BluetoothClassic;
      } else if (Platform.OS === 'ios') {
        // iOS uses BLE (Bluetooth Low Energy)
        throw new Error('iOS requires BLE implementation - use Android for RFCOMM');
      }

      this.connected = true;
      
      // Initiate encrypted handshake
      await this.performHandshake();
      
      // Start receiving data
      this.startReceiver();
      
      // Request initial sync
      await this.send({ type: 'sync:request' });
      
      if (this.onConnected) {
        this.onConnected();
      }
    } catch (err) {
      this.connected = false;
      throw err;
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.connected = false;
    
    if (this.socket) {
      try {
        if (Platform.OS === 'android') {
          BluetoothClassic.disconnect();
        }
      } catch (e) {
        // Ignore disconnect errors
      }
    }
    
    this.socket = null;
    this.encryption = null;
    
    if (this.onDisconnected) {
      this.onDisconnected();
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Add new task
   */
  async addTask(task: Omit<Task, 'id'>): Promise<void> {
    await this.send({
      type: 'task:update',
      task: task as Task,
    });
  }

  /**
   * Move task to different column
   */
  async moveTask(taskId: number, newCol: ColumnType): Promise<void> {
    await this.send({
      type: 'task:move',
      taskId,
      newCol,
    });
  }

  /**
   * Toggle task alarm
   */
  async toggleAlarm(taskId: number): Promise<void> {
    await this.send({
      type: 'task:toggle-alarm',
      taskId,
    });
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: number): Promise<void> {
    await this.send({
      type: 'task:delete',
      taskId,
    });
  }

  /**
   * Send AI command
   */
  async sendAICommand(command: string): Promise<void> {
    await this.send({
      type: 'ai:command',
      command,
    });
  }

  /**
   * Discover nearby Bluetooth devices
   */
  static async discoverDevices(): Promise<BluetoothDevice[]> {
    try {
      if (Platform.OS === 'android') {
        const devices = await BluetoothClassic.discoverDevices(8);
        return devices.map((d: any) => ({
          address: d.address,
          name: d.name || 'Unknown Device',
          type: this.classifyDevice(d.deviceClass),
          paired: d.paired || false,
        }));
      }
      return [];
    } catch (e) {
      console.error('Discovery error:', e);
      return [];
    }
  }

  /**
   * Get paired devices
   */
  static async getPairedDevices(): Promise<BluetoothDevice[]> {
    try {
      if (Platform.OS === 'android') {
        const devices = await BluetoothClassic.getPairedDevices();
        return devices.map((d: any) => ({
          address: d.address,
          name: d.name || 'Unknown Device',
          type: this.classifyDevice(d.deviceClass),
          paired: true,
        }));
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  private static classifyDevice(deviceClass: number): BluetoothDevice['type'] {
    if (!deviceClass) return 'unknown';
    
    const major = (deviceClass >> 8) & 0x1F;
    
    switch (major) {
      case 1: return 'computer';
      case 2: return 'phone';
      default: return 'unknown';
    }
  }

  private async performHandshake(): Promise<void> {
    // Generate ephemeral keys for ECDH
    this.encryption = new AES256Crypto();
    
    // Send handshake request
    const handshake = {
      type: 'crypto:handshake',
      public_key: 'client_public_key_placeholder',
      version: '1.0',
    };
    
    await this.sendRaw(JSON.stringify(handshake));
    
    // Wait for server response (would be handled in receiver)
    // For now, assume successful handshake
  }

  private async send(message: SyncMessage): Promise<void> {
    const data = JSON.stringify(message);
    
    if (this.encryption) {
      const encrypted = this.encryption.encrypt(data);
      await this.sendRaw(JSON.stringify({
        type: 'encrypted',
        payload: encrypted,
      }));
    } else {
      await this.sendRaw(data);
    }
  }

  private async sendRaw(data: string): Promise<void> {
    if (!this.socket || !this.connected) {
      throw new Error('Not connected');
    }

    // Add length prefix for framing
    const length = data.length;
    const framed = `${length}:${data}`;

    if (Platform.OS === 'android') {
      await BluetoothClassic.write(framed);
    }
  }

  private startReceiver(): void {
    if (Platform.OS === 'android') {
      const emitter = new NativeEventEmitter(BluetoothClassic);
      
      emitter.addListener('onDataReceived', (data: { data: string }) => {
        this.handleReceivedData(data.data);
      });
      
      emitter.addListener('onConnectionLost', () => {
        this.disconnect();
      });
    }
  }

  private handleReceivedData(chunk: string): void {
    this.messageBuffer += chunk;
    
    // Process complete messages
    while (true) {
      const colonIndex = this.messageBuffer.indexOf(':');
      if (colonIndex === -1) break;
      
      const lengthStr = this.messageBuffer.substring(0, colonIndex);
      const length = parseInt(lengthStr, 10);
      
      if (isNaN(length)) {
        this.messageBuffer = this.messageBuffer.substring(colonIndex + 1);
        continue;
      }
      
      const messageStart = colonIndex + 1;
      const messageEnd = messageStart + length;
      
      if (this.messageBuffer.length < messageEnd) break;
      
      const message = this.messageBuffer.substring(messageStart, messageEnd);
      this.messageBuffer = this.messageBuffer.substring(messageEnd);
      
      this.processMessage(message);
    }
  }

  private processMessage(data: string): void {
    try {
      let message: SyncMessage;
      
      // Try to parse as JSON
      const parsed = JSON.parse(data);
      
      if (parsed.type === 'encrypted' && this.encryption) {
        // Decrypt payload
        const decrypted = this.encryption.decrypt(parsed.payload);
        message = JSON.parse(decrypted);
      } else {
        message = parsed;
      }
      
      this.handleMessage(message);
    } catch (e) {
      console.error('Failed to process message:', e);
    }
  }

  private handleMessage(message: SyncMessage): void {
    switch (message.type) {
      case 'sync:tasks':
        this.tasks = message.tasks || [];
        if (this.onTasksSynced) {
          this.onTasksSynced(this.tasks);
        }
        break;
        
      case 'sync:events':
        this.events = message.events || [];
        if (this.onEventsSynced) {
          this.onEventsSynced(this.events);
        }
        break;
        
      case 'sync:complete':
        if (this.onNotification) {
          this.onNotification(
            'Sync Complete',
            `Synced with ${message.deviceCount} devices`
          );
        }
        break;
        
      case 'task:updated':
        if (message.task && this.onTaskUpdated) {
          this.onTaskUpdated(message.task);
        }
        break;
        
      case 'task:deleted':
        if (message.taskId && this.onTaskDeleted) {
          this.onTaskDeleted(message.taskId);
        }
        break;
        
      case 'ai:result':
        if (message.result && this.onNotification) {
          this.onNotification(
            message.result.success ? 'AI Success' : 'AI Failed',
            message.result.message
          );
        }
        break;
        
      case 'alarms:overdue':
        const count = message.tasks?.length || 0;
        if (count > 0 && this.onNotification) {
          this.onNotification(
            'Overdue Alarms',
            `You have ${count} overdue tasks with active alarms`
          );
        }
        break;
    }
  }
}
