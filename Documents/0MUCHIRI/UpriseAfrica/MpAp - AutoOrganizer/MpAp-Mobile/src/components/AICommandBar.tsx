/**
 * AI Command Bar Component
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Theme } from '../types';
import { colors } from '../theme';

interface AICommandBarProps {
  theme: Theme;
  processing: boolean;
  onCommand: (command: string) => void;
}

const QUICK_COMMANDS = [
  { label: 'Auto-schedule week', command: 'Schedule my week' },
  { label: 'Flag overdue', command: 'Flag all overdue' },
  { label: 'Set alarms', command: 'Set alarms for deadlines' },
  { label: 'Prioritise', command: 'Prioritise everything' },
];

export const AICommandBar: React.FC<AICommandBarProps> = ({
  theme,
  processing,
  onCommand,
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (input.trim() && !processing) {
      onCommand(input.trim());
      setInput('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Label */}
      <View style={styles.header}>
        <Icon name="robot" size={14} color={colors.accent} />
        <Text style={[styles.label, { color: colors.accent }]}>
          MAP AI
        </Text>
      </View>

      {/* Quick commands */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.quickCommands}
        contentContainerStyle={styles.quickCommandsContent}
      >
        {QUICK_COMMANDS.map((cmd) => (
          <TouchableOpacity
            key={cmd.command}
            style={[styles.chip, { backgroundColor: theme.background }}
            onPress={() => onCommand(cmd.command)}
            disabled={processing}
          >
            <Text style={[styles.chipText, { color: theme.muted }]}>
              {cmd.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.background,
            color: theme.text,
            borderColor: theme.border,
          }]}
          placeholder="Ask MAP to plan, reschedule, or prioritise..."
          placeholderTextColor={theme.muted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSubmit}
          editable={!processing}
        />
        
        <TouchableOpacity
          style={[styles.button, { 
            backgroundColor: processing ? theme.border : colors.accent + '20',
            opacity: processing ? 0.5 : 1,
          }}
          onPress={handleSubmit}
          disabled={processing || !input.trim()}
        >
          {processing ? (
            <Icon name="loading" size={16} color={colors.accent} />
          ) : (
            <>
              <Text style={[styles.buttonText, { color: colors.accent }]}>
                Execute
              </Text>
              <Icon name="arrow-top-right" size={14} color={colors.accent} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  quickCommands: {
    marginBottom: 10,
  },
  quickCommandsContent: {
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    gap: 4,
  },
  buttonText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
});
