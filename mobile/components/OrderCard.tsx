import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface OrderCardProps {
  order: {
    id: number;
    status: string;
    created_at: string;
    items: any;
  };
  onPress?: () => void;
}

export default function OrderCard({ order, onPress }: OrderCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#047857';
      case 'pending':
        return '#ea580c';
      case 'cancelled':
        return '#dc2626';
      default:
        return '#64748b';
    }
  };

  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const itemCount = Array.isArray(items) ? items.length : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.orderId}>Order #{order.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>
      <Text style={styles.date}>{new Date(order.created_at).toLocaleDateString()}</Text>
      <Text style={styles.items}>{itemCount} items</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  date: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 5,
  },
  items: {
    fontSize: 14,
    color: '#334155',
  },
});
