import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { authService } from '../services/api';
import { notificationsService } from '../services/api';
import {
  checkBiometricSupport,
  isBiometricEnabled,
  setBiometricEnabled,
} from '../services/auth';

export default function SettingsScreen({ navigation }: any) {
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [notifications, setNotifications] = useState({
    email_alerts: true,
    low_stock_alert: true,
    order_confirmation: true,
    shipment_notification: true,
    payment_reminder: true,
    weekly_summary: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const supported = await checkBiometricSupport();
      setBiometricSupported(supported);
      
      const enabled = await isBiometricEnabled();
      setBiometricEnabledState(enabled);

      const notifSettings = await notificationsService.getSettings();
      if (notifSettings) {
        setNotifications(notifSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    setBiometricEnabledState(value);
    await setBiometricEnabled(value);
  };

  const handleNotificationToggle = async (key: string, value: boolean) => {
    const newSettings = { ...notifications, [key]: value };
    setNotifications(newSettings);
    
    try {
      await notificationsService.updateSettings(newSettings);
    } catch (error) {
      console.error('Error updating notifications:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        
        {biometricSupported && (
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Biometric Authentication</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Email Alerts</Text>
          <Switch
            value={notifications.email_alerts}
            onValueChange={(value) => handleNotificationToggle('email_alerts', value)}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Low Stock Alerts</Text>
          <Switch
            value={notifications.low_stock_alert}
            onValueChange={(value) => handleNotificationToggle('low_stock_alert', value)}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Order Confirmations</Text>
          <Switch
            value={notifications.order_confirmation}
            onValueChange={(value) => handleNotificationToggle('order_confirmation', value)}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Shipment Notifications</Text>
          <Switch
            value={notifications.shipment_notification}
            onValueChange={(value) => handleNotificationToggle('shipment_notification', value)}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Payment Reminders</Text>
          <Switch
            value={notifications.payment_reminder}
            onValueChange={(value) => handleNotificationToggle('payment_reminder', value)}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Weekly Summary</Text>
          <Switch
            value={notifications.weekly_summary}
            onValueChange={(value) => handleNotificationToggle('weekly_summary', value)}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.infoText}>Cigar Order Hub Mobile</Text>
        <Text style={styles.infoText}>Version 1.0.0</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingLabel: {
    fontSize: 16,
    color: '#334155',
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
