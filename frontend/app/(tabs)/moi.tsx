import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { moiAPI } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

interface MoiEntry {
  id: string;
  person_name: string;
  person_phone: string | null;
  event_type: string;
  event_name: string;
  amount: number;
  direction: string;
  date: string;
  notes: string | null;
}

interface MoiSummary {
  total_given: number;
  total_received: number;
  balance: number;
  total_entries: number;
}

const EVENT_TYPES = [
  { id: 'wedding', label: 'Wedding', icon: 'heart' },
  { id: 'birthday', label: 'Birthday', icon: 'gift' },
  { id: 'housewarming', label: 'Housewarming', icon: 'home' },
  { id: 'festival', label: 'Festival', icon: 'sparkles' },
  { id: 'funeral', label: 'Funeral', icon: 'flower' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export default function MoiScreen() {
  const [entries, setEntries] = useState<MoiEntry[]>([]);
  const [summary, setSummary] = useState<MoiSummary | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterDirection, setFilterDirection] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [eventType, setEventType] = useState('wedding');
  const [eventName, setEventName] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState('received');
  const [notes, setNotes] = useState('');

  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchData();
  }, [filterDirection]);

  const fetchData = async () => {
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        moiAPI.getAll(filterDirection || undefined),
        moiAPI.getSummary(),
      ]);
      setEntries(entriesRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching moi data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  }, [filterDirection]);

  const resetForm = () => {
    setPersonName('');
    setPersonPhone('');
    setEventType('wedding');
    setEventName('');
    setAmount('');
    setDirection('received');
    setNotes('');
  };

  const handleAddEntry = async () => {
    if (!personName.trim() || !eventName.trim() || !amount) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    setIsLoading(true);
    try {
      await moiAPI.create({
        person_name: personName,
        person_phone: personPhone || undefined,
        event_type: eventType,
        event_name: eventName,
        amount: parseFloat(amount),
        direction,
        notes: notes || undefined,
      });
      setShowAddModal(false);
      resetForm();
      await fetchData();
      Alert.alert('Success', 'Entry added successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add entry');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await moiAPI.delete(id);
            await fetchData();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete entry');
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getEventIcon = (type: string) => {
    const event = EVENT_TYPES.find(e => e.id === type);
    return event?.icon || 'document';
  };

  const renderEntry = ({ item }: { item: MoiEntry }) => (
    <TouchableOpacity
      style={styles.entryCard}
      onLongPress={() => handleDeleteEntry(item.id)}
    >
      <View style={styles.entryLeft}>
        <View style={[styles.eventIcon, { backgroundColor: item.direction === 'received' ? '#4ECDC420' : '#FF6B3520' }]}>
          <Ionicons
            name={getEventIcon(item.event_type) as any}
            size={20}
            color={item.direction === 'received' ? '#4ECDC4' : '#FF6B35'}
          />
        </View>
        <View style={styles.entryInfo}>
          <Text style={styles.personName}>{item.person_name}</Text>
          <Text style={styles.eventName}>{item.event_name}</Text>
          <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
        </View>
      </View>
      <View style={styles.entryRight}>
        <Text style={[styles.amount, item.direction === 'received' ? styles.amountReceived : styles.amountGiven]}>
          {item.direction === 'received' ? '+' : '-'}Rs.{item.amount.toLocaleString()}
        </Text>
        <Text style={styles.directionLabel}>{item.direction === 'received' ? 'Received' : 'Given'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Moi Ledger</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      {summary && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="arrow-down-circle" size={24} color="#4ECDC4" />
              <Text style={styles.summaryLabel}>Received</Text>
              <Text style={styles.summaryValueReceived}>Rs.{summary.total_received.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="arrow-up-circle" size={24} color="#FF6B35" />
              <Text style={styles.summaryLabel}>Given</Text>
              <Text style={styles.summaryValueGiven}>Rs.{summary.total_given.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Net Balance:</Text>
            <Text style={[styles.balanceValue, summary.balance >= 0 ? styles.balancePositive : styles.balanceNegative]}>
              {summary.balance >= 0 ? '+' : ''}Rs.{summary.balance.toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {/* Filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, filterDirection === null && styles.filterChipActive]}
          onPress={() => setFilterDirection(null)}
        >
          <Text style={[styles.filterText, filterDirection === null && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterDirection === 'received' && styles.filterChipActive]}
          onPress={() => setFilterDirection('received')}
        >
          <Text style={[styles.filterText, filterDirection === 'received' && styles.filterTextActive]}>Received</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterDirection === 'given' && styles.filterChipActive]}
          onPress={() => setFilterDirection('given')}
        >
          <Text style={[styles.filterText, filterDirection === 'given' && styles.filterTextActive]}>Given</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={60} color="#333" />
            <Text style={styles.emptyText}>No entries yet</Text>
            <Text style={styles.emptySubtext}>Start tracking your Moi contributions</Text>
          </View>
        }
      />

      {/* Add Entry Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Moi Entry</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Direction Toggle */}
            <View style={styles.directionToggle}>
              <TouchableOpacity
                style={[styles.directionButton, direction === 'received' && styles.directionButtonActive]}
                onPress={() => setDirection('received')}
              >
                <Ionicons name="arrow-down" size={18} color={direction === 'received' ? '#fff' : '#888'} />
                <Text style={[styles.directionButtonText, direction === 'received' && styles.directionButtonTextActive]}>
                  Received
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.directionButton, direction === 'given' && styles.directionButtonActiveGiven]}
                onPress={() => setDirection('given')}
              >
                <Ionicons name="arrow-up" size={18} color={direction === 'given' ? '#fff' : '#888'} />
                <Text style={[styles.directionButtonText, direction === 'given' && styles.directionButtonTextActive]}>
                  Given
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Person Name *"
              placeholderTextColor="#666"
              value={personName}
              onChangeText={setPersonName}
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number (optional)"
              placeholderTextColor="#666"
              value={personPhone}
              onChangeText={setPersonPhone}
              keyboardType="phone-pad"
            />

            {/* Event Type */}
            <Text style={styles.inputLabel}>Event Type</Text>
            <View style={styles.eventTypesGrid}>
              {EVENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.eventTypeChip, eventType === type.id && styles.eventTypeChipActive]}
                  onPress={() => setEventType(type.id)}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={16}
                    color={eventType === type.id ? '#fff' : '#888'}
                  />
                  <Text style={[styles.eventTypeText, eventType === type.id && styles.eventTypeTextActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Event Name * (e.g., Son's Wedding)"
              placeholderTextColor="#666"
              value={eventName}
              onChangeText={setEventName}
            />

            <TextInput
              style={styles.input}
              placeholder="Amount (Rs.) *"
              placeholderTextColor="#666"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Notes (optional)"
              placeholderTextColor="#666"
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleAddEntry}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add Entry</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#FF6B35',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: '#1a1a2e',
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
  summaryValueReceived: {
    color: '#4ECDC4',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  summaryValueGiven: {
    color: '#FF6B35',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#2a2a3e',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
    gap: 8,
  },
  balanceLabel: {
    color: '#888',
    fontSize: 14,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  balancePositive: {
    color: '#4ECDC4',
  },
  balanceNegative: {
    color: '#FF6B6B',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
  },
  filterChipActive: {
    backgroundColor: '#FF6B35',
  },
  filterText: {
    color: '#888',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  entryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryInfo: {
    marginLeft: 12,
    flex: 1,
  },
  personName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  eventName: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  entryDate: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  amountReceived: {
    color: '#4ECDC4',
  },
  amountGiven: {
    color: '#FF6B35',
  },
  directionLabel: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#666',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  directionToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  directionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#2a2a3e',
    gap: 8,
  },
  directionButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  directionButtonActiveGiven: {
    backgroundColor: '#FF6B35',
  },
  directionButtonText: {
    color: '#888',
    fontWeight: '600',
  },
  directionButtonTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  eventTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  eventTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a3e',
    gap: 4,
  },
  eventTypeChipActive: {
    backgroundColor: '#FF6B35',
  },
  eventTypeText: {
    color: '#888',
    fontSize: 12,
  },
  eventTypeTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
