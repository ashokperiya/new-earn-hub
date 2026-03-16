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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { servicesAPI } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

interface Service {
  id: string;
  user_id: string;
  name: string;
  category: string;
  description: string;
  phone: string;
  village: string | null;
  district: string | null;
  price_range: string | null;
  rating: number;
  reviews: any[];
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'catering', label: 'Catering', icon: 'restaurant' },
  { id: 'photography', label: 'Photo', icon: 'camera' },
  { id: 'decoration', label: 'Decor', icon: 'color-palette' },
  { id: 'sound', label: 'Sound', icon: 'volume-high' },
  { id: 'tent', label: 'Tent', icon: 'home' },
  { id: 'makeup', label: 'Makeup', icon: 'sparkles' },
  { id: 'transport', label: 'Transport', icon: 'car' },
];

export default function ServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('catering');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [priceRange, setPriceRange] = useState('');

  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchServices();
  }, [filterCategory, searchQuery]);

  const fetchServices = async () => {
    try {
      const params: any = {};
      if (filterCategory && filterCategory !== 'all') {
        params.category = filterCategory;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const response = await servicesAPI.getAll(params);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchServices();
    setIsRefreshing(false);
  }, [filterCategory, searchQuery]);

  const resetForm = () => {
    setName('');
    setCategory('catering');
    setDescription('');
    setPhone('');
    setPriceRange('');
  };

  const handleAddService = async () => {
    if (!name.trim() || !description.trim() || !phone.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      await servicesAPI.create({
        name,
        category,
        description,
        phone,
        price_range: priceRange || undefined,
      });
      setShowAddModal(false);
      resetForm();
      await fetchServices();
      Alert.alert('Success', 'Service listed successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to list service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const getCategoryIcon = (cat: string) => {
    const category = CATEGORIES.find(c => c.id === cat);
    return category?.icon || 'business';
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'catering': return '#FF6B35';
      case 'photography': return '#4ECDC4';
      case 'decoration': return '#FFD93D';
      case 'sound': return '#45B7D1';
      case 'tent': return '#96CEB4';
      case 'makeup': return '#FF6B6B';
      case 'transport': return '#6c5ce7';
      default: return '#888';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={14}
            color={star <= rating ? '#FFD93D' : '#444'}
          />
        ))}
      </View>
    );
  };

  const renderService = ({ item }: { item: Service }) => (
    <View style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
          <Ionicons name={getCategoryIcon(item.category) as any} size={24} color={getCategoryColor(item.category)} />
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{item.name}</Text>
          <Text style={styles.serviceCategory}>
            {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
          </Text>
        </View>
        {item.rating > 0 && (
          <View style={styles.ratingContainer}>
            {renderStars(item.rating)}
            <Text style={styles.reviewCount}>({item.reviews.length})</Text>
          </View>
        )}
      </View>

      <Text style={styles.serviceDescription} numberOfLines={2}>{item.description}</Text>

      <View style={styles.serviceDetails}>
        {item.village && (
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={14} color="#888" />
            <Text style={styles.detailText}>{item.village}</Text>
          </View>
        )}
        {item.price_range && (
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={14} color="#888" />
            <Text style={styles.detailText}>{item.price_range}</Text>
          </View>
        )}
      </View>

      <View style={styles.serviceFooter}>
        <TouchableOpacity style={styles.callButton} onPress={() => handleCall(item.phone)}>
          <Ionicons name="call" size={18} color="#fff" />
          <Text style={styles.callButtonText}>Call Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.messageButton}>
          <Ionicons name="chatbubble-outline" size={18} color="#4ECDC4" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Services</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                (filterCategory === item.id || (filterCategory === null && item.id === 'all')) && styles.categoryChipActive,
              ]}
              onPress={() => setFilterCategory(item.id === 'all' ? null : item.id)}
            >
              <Ionicons
                name={item.icon as any}
                size={16}
                color={(filterCategory === item.id || (filterCategory === null && item.id === 'all')) ? '#fff' : '#888'}
              />
              <Text style={[
                styles.categoryText,
                (filterCategory === item.id || (filterCategory === null && item.id === 'all')) && styles.categoryTextActive,
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      <FlatList
        data={services}
        renderItem={renderService}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={60} color="#333" />
            <Text style={styles.emptyText}>No services found</Text>
            <Text style={styles.emptySubtext}>List your service to reach customers</Text>
          </View>
        }
      />

      {/* Add Service Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>List Your Service</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Business/Service Name *"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    category === cat.id && { backgroundColor: getCategoryColor(cat.id) },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={16}
                    color={category === cat.id ? '#fff' : '#888'}
                  />
                  <Text style={[styles.categoryOptionText, category === cat.id && styles.categoryOptionTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description *"
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number *"
              placeholderTextColor="#666"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="Price Range (e.g., Rs.5000-10000)"
              placeholderTextColor="#666"
              value={priceRange}
              onChangeText={setPriceRange}
            />

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleAddService}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>List Service</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#fff',
    fontSize: 16,
  },
  categoriesContainer: {
    marginTop: 12,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    marginRight: 8,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#FF6B35',
  },
  categoryText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  serviceCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  serviceName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  serviceCategory: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewCount: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  serviceDescription: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  serviceDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    color: '#888',
    fontSize: 13,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  callButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  messageButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a3e',
    gap: 4,
  },
  categoryOptionText: {
    color: '#888',
    fontSize: 12,
  },
  categoryOptionTextActive: {
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
