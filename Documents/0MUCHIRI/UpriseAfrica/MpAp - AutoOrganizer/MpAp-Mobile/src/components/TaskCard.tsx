/**
 * Task Card Component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Task, Theme } from '../types';
import { colors } from '../theme';

interface TaskCardProps {
  task: Task;
  theme: Theme;
  onPress?: (task: Task) => void;
  onLongPress?: (task: Task) => void;
  onToggleAlarm?: (taskId: number) => void;
  onDelete?: (taskId: number) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  theme,
  onPress,
  onLongPress,
  onToggleAlarm,
  onDelete,
}) => {
  const getTagColors = () => {
    switch (task.tag) {
      case 'assignment': return colors.tagAssignment;
      case 'deadline': return colors.tagDeadline;
      case 'project': return colors.tagProject;
      case 'event': return colors.tagEvent;
      case 'crypto': return colors.tagCrypto;
      default: return colors.tagProject;
    }
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high': return colors.red;
      case 'mid': return colors.amber;
      case 'low': return colors.green;
      case 'crypto': return colors.pink;
      default: return colors.muted;
    }
  };

  const tagColors = getTagColors();
  const priorityColor = getPriorityColor();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.surfaceLight, borderColor: theme.border }]}
      onPress={() => onPress?.(task)}
      onLongPress={() => onLongPress?.(task)}
      delayLongPress={500}
    >
      {/* Priority indicator */}
      <View style={[styles.priorityBar, { backgroundColor: priorityColor }]} />

      <View style={styles.content}>
        {/* Tag */}
        <View style={[styles.tag, { backgroundColor: tagColors.bg, borderColor: tagColors.border }]}>
          <Text style={[styles.tagText, { color: tagColors.text }]}>
            {task.tag.toUpperCase()}
          </Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {task.title}
        </Text>

        {/* Progress bar */}
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${task.progress}%`, backgroundColor: colors.accent2 },
            ]}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Avatars */}
          <View style={styles.avatars}>
            {task.avatars.map((avatar, index) => (
              <View
                key={index}
                style={[
                  styles.avatar,
                  { backgroundColor: colors.accent2, marginLeft: index > 0 ? -8 : 0 },
                ]}
              >
                <Text style={styles.avatarText}>{avatar}</Text>
              </View>
            ))}
          </View>

          {/* Alarm indicator */}
          {task.alarm && (
            <View style={[styles.alarmBadge, { backgroundColor: colors.amber + '20' }]}>
              <Icon name="bell" size={10} color={colors.amber} />
              <Text style={[styles.alarmText, { color: colors.amber }]}>alarm</Text>
            </View>
          )}
        </View>

        {/* Meta */}
        <View style={styles.meta}>
          <Text style={[styles.due, { 
            color: task.due.toLowerCase() === 'today' ? colors.red : theme.muted 
          }]}>
            ⊕ {task.due}
          </Text>
          <Text style={[styles.progressText, { color: theme.muted }]}>
            {task.progress}%
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onToggleAlarm?.(task.id)}
          >
            <Icon
              name={task.alarm ? 'bell' : 'bell-outline'}
              size={14}
              color={task.alarm ? colors.amber : theme.muted}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onDelete?.(task.id)}
          >
            <Icon name="delete-outline" size={14} color={colors.red} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  priorityBar: {
    width: 3,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    padding: 10,
    paddingLeft: 13,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 8,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 18,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  avatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.background,
  },
  avatarText: {
    color: colors.text,
    fontSize: 8,
    fontWeight: 'bold',
  },
  alarmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  alarmText: {
    fontSize: 8,
    fontFamily: 'monospace',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  due: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  progressText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    position: 'absolute',
    right: 8,
    bottom: 8,
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
});
