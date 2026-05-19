/**
 * Board Column Component
 * Displays a Kanban column with tasks
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Task, Theme, ColumnType } from '../types';
import { TaskCard } from './TaskCard';

interface BoardColumnProps {
  title: string;
  color: string;
  count: number;
  tasks: Task[];
  theme: Theme;
  onTaskPress?: (task: Task) => void;
  onTaskMove?: (taskId: number, newCol: ColumnType) => void;
  onToggleAlarm?: (taskId: number) => void;
  onDeleteTask?: (taskId: number) => void;
  onAddPress?: () => void;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({
  title,
  color,
  count,
  tasks,
  theme,
  onTaskPress,
  onTaskMove,
  onToggleAlarm,
  onDeleteTask,
  onAddPress,
}) => {
  return (
    <View style={[styles.container, { backgroundColor: theme.surface + '40' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.title, { color: theme.text }]}>
            {title}
          </Text>
          <Text style={[styles.count, { color: theme.muted }]}>
            ({count})
          </Text>
        </View>
        
        <TouchableOpacity onPress={onAddPress} style={styles.addBtn}>
          <Icon name="plus" size={16} color={theme.muted} />
        </TouchableOpacity>
      </View>

      {/* Task List */}
      <ScrollView 
        style={styles.taskList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.taskListContent}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            theme={theme}
            onPress={onTaskPress}
            onToggleAlarm={onToggleAlarm}
            onDelete={onDeleteTask}
          />
        ))}
        
        {tasks.length === 0 && (
          <View style={[styles.empty, { borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              No tasks
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 280,
    marginRight: 12,
    borderRadius: 8,
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 11,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  count: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  addBtn: {
    padding: 4,
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    paddingBottom: 10,
  },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
