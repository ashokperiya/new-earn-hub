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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { eventsAPI } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string | null;
  location: string;
  village: string | null;
  district: string | null;
  image: string | null;
  attendees: string[];
}

const EVENT_TYPES = [
  { id: 'all', label: 'All', icon: 'calendar' },
  { id: 'festival', label: 'Festival', icon: 'sparkles' },
  { id: 'temple', label: 'Temple', icon: 'flame' },
  { id: 'wedding', label: 'Wedding', icon: 'heart' },
  { id: 'community', label: 'Community', icon: 'people' },
  { id: 'meeting', label: 'Meeting', icon: 'chatbubbles' },
];

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('community');
  const [startDate, setStartDate] = useState('');
  const [location, setLocation] = useState('');

  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchEvents();
  }, [filterType]);

  const fetchEvents = async () => {
    try {
      const params: any = { upcoming: true };
      if (filterType && filterType !== 'all') {
        params.event_type = filterType;
      }
      const response = await eventsAPI.getAll(params);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchEvents();
    setIsRefreshing(false);
  }, [filterType]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventType('community');
    setStartDate('');
    setLocation('');
  };

  const handleAddEvent = async () => {
    if (!title.trim() || !description.trim() || !startDate || !location.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      await eventsAPI.create({
        title,
        description,
        event_type: eventType,
        start_date: new Date(startDate).toISOString(),
        location,
      });
      setShowAddModal(false);
      resetForm();
      await fetchEvents();
      Alert.alert('Success', 'Event created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttend = async (eventId: string) => {
    try {
      const response = await eventsAPI.attend(eventId);
      setEvents(events.map(event => {
        if (event.id === eventId) {
          const attendees = response.data.attending
            ? [...event.attendees, user!.id]
            : event.attendees.filter(id => id !== user!.id);
          return { ...event, attendees };
        }
        return event;
      }));
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'festival': return '#FFD93D';
      case 'temple': return '#FF6B35';
      case 'wedding': return '#FF6B6B';
      case 'community': return '#4ECDC4';
      case 'meeting': return '#45B7D1';
      default: return '#6c5ce7';
    }
  };

  const getTypeIcon = (type: string) => {
    const eventType = EVENT_TYPES.find(t => t.id === type);
    return eventType?.icon || 'calendar';
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <View style={styles.eventCard}>
      <View style={[styles.eventTypeBar, { backgroundColor: getTypeColor(item.event_type) }]} />
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <View style={[styles.eventIcon, { backgroundColor: getTypeColor(item.event_type) + '20' }]}>
            <Ionicons name={getTypeIcon(item.event_type) as any} size={24} color={getTypeColor(item.event_type)} />
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <Text style={styles.eventType}>{item.event_type.charAt(0).toUpperCase() + item.event_type.slice(1)}</Text>
          </View>
        </View>
        
        <Text style={styles.eventDescription} numberOfLines={2}>{item.description}</Text>
        
        <View style={styles.eventDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={16} color="#888" />
            <Text style={styles.detailText}>{formatDate(item.start_date)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={16} color="#888" />
            <Text style={styles.detailText}>{item.location}</Text>
          </View>
          {item.village && (
            <View style={styles.detailItem}>
              <Ionicons name="home-outline" size={16} color="#888" />
              <Text style={styles.detailText}>{item.village}</Text>
            </View>
          )}
        </View>

        <View style={styles.eventFooter}>
          <View style={styles.attendeesInfo}>
            <Ionicons name="people" size={18} color="#4ECDC4" />
            <Text style={styles.attendeesText}>{item.attendees.length} attending</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.attendButton,
              item.attendees.includes(user!.id) && styles.attendButtonActive,
            ]}
            onPress={() => handleAttend(item.id)}
          >
            <Ionicons
              name={item.attendees.includes(user!.id) ? 'checkmark-circle' : 'add-circle-outline'}
              size={18}
              color={item.attendees.includes(user!.id) ? '#fff' : '#4ECDC4'}
            />
            <Text style={[
              styles.attendButtonText,
              item.attendees.includes(user!.id) && styles.attendButtonTextActive,
            ]}>
              {item.attendees.includes(user!.id) ? 'Attending' : 'Attend'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        {EVENT_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.filterChip,
              (filterType === type.id || (filterType === null && type.id === 'all')) && styles.filterChipActive,
            ]}
            onPress={() => setFilterType(type.id === 'all' ? null : type.id)}
          >
            <Ionicons
              name={type.icon as any}
              size={14}
              color={(filterType === type.id || (filterType === null && type.id === 'all')) ? '#fff' : '#888'}
            />
            <Text style={[
              styles.filterText,
              (filterType === type.id || (filterType === null && type.id === 'all')) && styles.filterTextActive,
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color="#333" />
            <Text style={styles.emptyText}>No upcoming events</Text>
            <Text style={styles.emptySubtext}>Create an event for your community</Text>
          </View>
        }
      />

      {/* Add Event Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Event</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Event Title *"
              placeholderTextColor="#666"
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description *"
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <Text style={styles.inputLabel}>Event Type</Text>
            <View style={styles.typeGrid}>
              {EVENT_TYPES.filter(t => t.id !== 'all').map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeChip,
                    eventType === type.id && { backgroundColor: getTypeColor(type.id) },
                  ]}
                  onPress={() => setEventType(type.id)}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={16}
                    color={eventType === type.id ? '#fff' : '#888'}
                  />
                  <Text style={[styles.typeText, eventType === type.id && styles.typeTextActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD) *"
              placeholderTextColor="#666"
              value={startDate}
              onChangeText={setStartDate}
            />

            <TextInput
              style={styles.input}
              placeholder="Location *"
              placeholderTextColor="#666"
              value={location}
              onChangeText={setLocation}
            />

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleAddEvent}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Create Event</Text>
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#FF6B35',
  },
  filterText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  eventTypeBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
    marginLeft: 12,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  eventType: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  eventDescription: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  eventDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#888',
    fontSize: 13,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
  },
  attendeesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendeesText: {
    color: '#4ECDC4',
    fontSize: 13,
  },
  attendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4ECDC4',
    gap: 6,
  },
  attendButtonActive: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  attendButtonText: {
    color: '#4ECDC4',
    fontWeight: '600',
  },
  attendButtonTextActive: {
    color: '#fff',
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
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a3e',
    gap: 4,
  },
  typeText: {
    color: '#888',
    fontSize: 12,
  },
  typeTextActive: {
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
