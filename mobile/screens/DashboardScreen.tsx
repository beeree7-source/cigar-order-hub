import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { analyticsService } from '../services/api';

export default function DashboardScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await analyticsService.getSummary();
      setSummary(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.header}>Dashboard</Text>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.blueCard]}>
          <Text style={styles.statValue}>{summary?.totalOrders || 0}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>

        <View style={[styles.statCard, styles.greenCard]}>
          <Text style={styles.statValue}>${summary?.totalRevenue?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>

        <View style={[styles.statCard, styles.purpleCard]}>
          <Text style={styles.statValue}>{summary?.totalProducts || 0}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>

        <View style={[styles.statCard, styles.orangeCard]}>
          <Text style={styles.statValue}>{summary?.lowStockCount || 0}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
      </View>

      <View style={styles.menuGrid}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Orders')}
        >
          <Text style={styles.menuIcon}>📦</Text>
          <Text style={styles.menuText}>Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Products')}
        >
          <Text style={styles.menuIcon}>🎁</Text>
          <Text style={styles.menuText}>Products</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Invoices')}
        >
          <Text style={styles.menuIcon}>📄</Text>
          <Text style={styles.menuText}>Invoices</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3a8a',
    padding: 20,
    paddingBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  statCard: {
    width: '48%',
    margin: '1%',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  blueCard: {
    backgroundColor: '#1e3a8a',
  },
  greenCard: {
    backgroundColor: '#047857',
  },
  purpleCard: {
    backgroundColor: '#7c3aed',
  },
  orangeCard: {
    backgroundColor: '#ea580c',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    marginTop: 20,
  },
  menuItem: {
    width: '48%',
    margin: '1%',
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
});
