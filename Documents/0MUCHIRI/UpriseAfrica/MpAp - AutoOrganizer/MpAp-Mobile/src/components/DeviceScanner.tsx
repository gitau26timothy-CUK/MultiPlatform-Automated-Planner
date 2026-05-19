/**
 * Bluetooth Device Scanner Component
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MpApBluetoothClient } from '../BluetoothClient';
import { BluetoothDevice, Theme } from '../types';
import { colors } from '../theme';

interface DeviceScannerProps {
  onConnect: (address: string) => void;
  onCancel: () => void;
  theme: Theme;
}

export const DeviceScanner: React.FC<DeviceScannerProps> = ({
  onConnect,
  onCancel,
  theme,
}) => {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    startScan();
  }, []);

  const startScan = async () => {
    setScanning(true);
    setDevices([]);

    try {
      // Get paired devices first
      const paired = await MpApBluetoothClient.getPairedDevices();
      setDevices(paired);

      // Discover new devices
      const discovered = await MpApBluetoothClient.discoverDevices();
      
      // Merge and deduplicate
      const allDevices = [...paired];
      for (const d of discovered) {
        if (!allDevices.find(p => p.address === d.address)) {
          allDevices.push(d);
        }
      }
      
      setDevices(allDevices);
    } catch (err) {
      Alert.alert('Scan Error', String(err));
    } finally {
      setScanning(false);
    }
  };

  const handleConnect = async (device: BluetoothDevice) => {
    setConnecting(device.address);
    try {
      await onConnect(device.address);
    } catch (err) {
      Alert.alert('Connection Failed', String(err));
    } finally {
      setConnecting(null);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'computer': return 'desktop-classic';
      case 'phone': return 'cellphone';
      case 'tablet': return 'tablet';
      default: return 'bluetooth';
    }
  };

  const renderDevice = ({ item }: { item: BluetoothDevice }) => (
    <TouchableOpacity
      style={[styles.deviceItem, { backgroundColor: theme.surface }]}
      onPress={() => handleConnect(item)}
      disabled={!!connecting}
    >
      <View style={styles.deviceIcon}>
        <Icon
          name={getDeviceIcon(item.type)}
          size={24}
          color={connecting === item.address ? colors.accent : theme.muted}
        />
      </View>

      <View style={styles.deviceInfo}>
        <Text style={[styles.deviceName, { color: theme.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.deviceAddress, { color: theme.muted }]}>
          {item.address}
        </Text>
        {item.paired && (
          <View style={[styles.pairedBadge, { backgroundColor: colors.green + '20' }]}>
            <Text style={[styles.pairedText, { color: colors.green }]}>
              PAIRED
            </Text>
          </View>
        )}
      </View>

      <View style={styles.deviceAction}>
        {connecting === item.address ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Icon name="chevron-right" size={20} color={theme.muted} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.overlay}>
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        {/* Header */}
        <View style={[styles.header, { borderColor: theme.border }]}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>
              Connect to MpAp Server
            </Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              Select your desktop device
            </Text>
          </View>
          
          <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
            <Icon name="close" size={20} color={theme.muted} />
          </TouchableOpacity>
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          style={[styles.scanBtn, { backgroundColor: colors.accent + '20' }]}
          onPress={startScan}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <>
              <Icon name="magnify" size={16} color={colors.accent} />
              <Text style={[styles.scanText, { color: colors.accent }]}>
                Scan for Devices
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Device List */}
        <FlatList
          data={devices}
          renderItem={renderDevice}
          keyExtractor={(item) => item.address}
          contentContainerStyle={styles.deviceList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="bluetooth-off" size={40} color={theme.border} />
              <Text style={[styles.emptyText, { color: theme.muted }]}>
                No devices found
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.muted }]}>
                Make sure your desktop MpAp server is running and Bluetooth is enabled
              </Text>
            </View>
          }
        />

        {/* Info */}
        <View style={[styles.info, { backgroundColor: theme.background }]}>
          <Icon name="information" size={14} color={theme.muted} />
          <Text style={[styles.infoText, { color: theme.muted }]}>
            Looking for "MpAp AutoOrganizer" service on RFCOMM channel 1
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
  },
  closeBtn: {
    padding: 4,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scanText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deviceList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  deviceAddress: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  pairedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pairedText: {
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  deviceAction: {
    width: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'monospace',
  },
});
