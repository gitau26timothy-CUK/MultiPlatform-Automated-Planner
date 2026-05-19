/**
 * MpAp Type Definitions
 */

export type ColumnType = 0 | 1 | 2 | 3;
export type TagType = 'assignment' | 'deadline' | 'project' | 'event' | 'crypto';
export type PriorityType = 'high' | 'mid' | 'low' | 'crypto';

export interface Task {
  id: number;
  title: string;
  tag: TagType;
  priority: PriorityType;
  due: string;
  progress: number;
  col: ColumnType;
  avatars: string[];
  alarm: boolean;
  ord?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Event {
  id: number;
  title: string;
  time: string;
  date?: string;
  duration?: string;
  source?: 'google' | 'outlook' | 'ical' | 'manual';
  color: string;
  detail?: string;
}

export interface BluetoothDevice {
  address: string;
  name: string;
  type: 'computer' | 'phone' | 'tablet' | 'unknown';
  signal?: number;
  paired?: boolean;
}

export interface EncryptedMessage {
  ciphertext: string;
  nonce: string;
  tag: string;
}

export interface SyncMessage {
  type: 
    | 'sync:request'
    | 'sync:tasks'
    | 'sync:events'
    | 'sync:complete'
    | 'task:update'
    | 'task:updated'
    | 'task:move'
    | 'task:delete'
    | 'task:deleted'
    | 'task:toggle-alarm'
    | 'ai:command'
    | 'ai:result'
    | 'alarms:overdue'
    | 'devices:list'
    | 'encrypted'
    | 'crypto:handshake';
  tasks?: Task[];
  events?: Event[];
  task?: Task;
  taskId?: number;
  newCol?: ColumnType;
  command?: string;
  result?: AIResult;
  timestamp?: string;
  deviceCount?: number;
  devices?: BluetoothDevice[];
}

export interface AIResult {
  success: boolean;
  message: string;
  affected?: number;
}

export interface Theme {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
}
