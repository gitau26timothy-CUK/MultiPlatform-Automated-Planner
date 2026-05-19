/**
 * MpAp Mobile App
 * React Native client for MpAp AutoOrganizer
 * 
 * Features:
 * - Bluetooth RFCOMM connection to desktop server
 * - Real-time task sync
 * - AES-256 encrypted transport
 * - Kanban board UI
 * - AI command interface
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MpApBluetoothClient } from './src/BluetoothClient';
import { Task, Event, ColumnType } from './src/types';
import { TaskCard } from './src/components/TaskCard';
import { BoardColumn } from './src/components/BoardColumn';
import { AICommandBar } from './src/components/AICommandBar';
import { DeviceScanner } from './src/components/DeviceScanner';
import { colors, darkTheme, lightTheme } from './src/theme';

// Column definitions
const COLUMNS: { id: ColumnType; title: string; color: string }[] = [
  { id: 0, title: 'BACKLOG', color: colors.gray },
  { id: 1, title: 'TO DO', color: colors.accent },
  { id: 2, title: 'IN PROGRESS', color: colors.amber },
  { id: 3, title: 'DONE', color: colors.green },
];

const App: React.FC = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? darkTheme : lightTheme;

  // State
  const [client] = useState(() => new MpApBluetoothClient());
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskColumn, setNewTaskColumn] = useState<ColumnType>(1);
  const [aiProcessing, setAIProcessing] = useState(false);

  // Setup client callbacks
  useEffect(() => {
    client.onConnected = () => {
      setConnected(true);
      setConnecting(false);
      Alert.alert('Connected', 'Connected to MpAp server via Bluetooth');
    };

    client.onDisconnected = () => {
      setConnected(false);
      Alert.alert('Disconnected', 'Connection to MpAp server lost');
    };

    client.onTasksSynced = (newTasks: Task[]) => {
      setTasks(newTasks);
    };

    client.onEventsSynced = (newEvents: Event[]) => {
      setEvents(newEvents);
    };

    client.onTaskUpdated = (task: Task) => {
      setTasks((prev: Task[]) => {
        const exists = prev.find((t: Task) => t.id === task.id);
        if (exists) {
          return prev.map((t: Task) => t.id === task.id ? task : t);
        }
        return [...prev, task];
      });
    };

    client.onTaskDeleted = (taskId: number) => {
      setTasks((prev: Task[]) => prev.filter((t: Task) => t.id !== taskId));
    };

    client.onNotification = (title: string, message: string) => {
      Alert.alert(title, message);
    };

    return () => {
      client.disconnect();
    };
  }, [client]);

  // Connection handlers
  const handleConnect = async (deviceAddress: string) => {
    setConnecting(true);
    try {
      await client.connect(deviceAddress);
    } catch (err) {
      setConnecting(false);
      Alert.alert('Connection Failed', String(err));
    }
  };

  const handleDisconnect = () => {
    client.disconnect();
  };

  // Task operations
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    await client.addTask({
      title: newTaskTitle,
      tag: 'project',
      priority: 'mid',
      due: 'TBD',
      progress: 0,
      col: newTaskColumn,
      avatars: ['ME'],
      alarm: false,
    });
    
    setNewTaskTitle('');
    setShowAddTask(false);
  };

  const handleMoveTask = async (taskId: number, newCol: ColumnType) => {
    await client.moveTask(taskId, newCol);
  };

  const handleToggleAlarm = async (taskId: number) => {
    await client.toggleAlarm(taskId);
  };

  const handleDeleteTask = async (taskId: number) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => client.deleteTask(taskId)
        },
      ]
    );
  };

  // AI commands
  const handleAICommand = async (command: string) => {
    setAIProcessing(true);
    try {
      await client.sendAICommand(command);
    } finally {
      setAIProcessing(false);
    }
  };

  // Render
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <Icon name="view-dashboard" size={24} color={colors.accent} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              MAP <Text style={styles.headerVersion}>v2.1</Text>
            </Text>
          </View>
          
          <View style={styles.headerRight}>
            {connected ? (
              <View style={styles.connectedBadge}>
                <Icon name="bluetooth-connect" size={16} color={colors.green} />
                <Text style={styles.connectedText}>BT LINKED</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.connectButton}
                onPress={() => setShowScanner(true)}
                disabled={connecting}
              >
                {connecting ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <>
                    <Icon name="bluetooth" size={16} color={colors.accent} />
                    <Text style={styles.connectText}>CONNECT</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            
            {connected && (
              <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectBtn}>
                <Icon name="close" size={16} color={colors.red} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Main Content */}
        <ScrollView style={styles.content} horizontal showsHorizontalScrollIndicator={false}>
          {COLUMNS.map(column => (
            <BoardColumn
              key={column.id}
              title={column.title}
              color={column.color}
              count={tasks.filter((t: Task) => t.col === column.id).length}
              tasks={tasks.filter((t: Task) => t.col === column.id)}
              theme={theme}
              onTaskPress={(task) => Alert.alert(task.title, `Priority: ${task.priority}\nDue: ${task.due}`)}
              onTaskMove={handleMoveTask}
              onToggleAlarm={handleToggleAlarm}
              onDeleteTask={handleDeleteTask}
              onAddPress={() => {
                setNewTaskColumn(column.id);
                setShowAddTask(true);
              }}
            />
          ))}
        </ScrollView>

        {/* Stats */}
        <View style={[styles.statsBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {tasks.filter((t: Task) => t.col < 3).length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.muted }]}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.red }]}>
              {tasks.filter((t: Task) => t.alarm && t.col < 3).length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.muted }]}>Alarms</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.green }]}>
              {tasks.filter((t: Task) => t.col === 3).length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.muted }]}>Done</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.amber }]}>
              {events.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.muted }]}>Events</Text>
          </View>
        </View>

        {/* AI Command Bar */}
        <AICommandBar
          theme={theme}
          processing={aiProcessing}
          onCommand={handleAICommand}
        />

        {/* Device Scanner Modal */}
        <Modal visible={showScanner} animationType="slide" transparent>
          <DeviceScanner
            onConnect={handleConnect}
            onCancel={() => setShowScanner(false)}
            theme={theme}
          />
        </Modal>

        {/* Add Task Modal */}
        <Modal visible={showAddTask} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modal, { backgroundColor: theme.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Add Task to {COLUMNS[newTaskColumn].title}
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                placeholder="Task title..."
                placeholderTextColor={theme.muted}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: theme.border }]}
                  onPress={() => setShowAddTask(false)}
                >
                  <Text style={{ color: theme.text }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: colors.accent }]}
                  onPress={handleAddTask}
                >
                  <Text style={{ color: colors.background }}>Add Task</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  headerVersion: {
    fontSize: 12,
    opacity: 0.6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  connectedText: {
    color: colors.green,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  connectText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  disconnectBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
});

export default App;
