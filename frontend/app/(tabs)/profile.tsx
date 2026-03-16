import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { authAPI, emergencyAPI } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

export default function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyType, setEmergencyType] = useState('medical');
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [isSendingEmergency, setIsSendingEmergency] = useState(false);
  
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const photo = `data:image/jpeg;base64,${result.assets[0].base64}`;
      try {
        await authAPI.updateProfile({ profile_photo: photo });
        updateUser({ profile_photo: photo });
        Alert.alert('Success', 'Profile photo updated!');
      } catch (error) {
        Alert.alert('Error', 'Failed to update photo');
      }
    }
  };

  const startEditing = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditVillage(user?.village || '');
    setEditDistrict(user?.district || '');
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await authAPI.updateProfile({
        name: editName,
        phone: editPhone || undefined,
        village: editVillage || undefined,
        district: editDistrict || undefined,
      });
      updateUser({
        name: editName,
        phone: editPhone,
        village: editVillage,
        district: editDistrict,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmergencyAlert = async () => {
    if (!emergencyMessage.trim()) {
      Alert.alert('Error', 'Please describe your emergency');
      return;
    }

    setIsSendingEmergency(true);
    try {
      await emergencyAPI.send(emergencyType, emergencyMessage);
      Alert.alert(
        'Emergency Alert Sent',
        'Your emergency contacts and village admins have been notified.',
        [{ text: 'OK', onPress: () => { setShowEmergency(false); setEmergencyMessage(''); } }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send alert. Please try calling emergency services directly.');
    } finally {
      setIsSendingEmergency(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const EMERGENCY_TYPES = [
    { id: 'medical', label: 'Medical', icon: 'medkit', color: '#FF6B6B' },
    { id: 'accident', label: 'Accident', icon: 'car', color: '#FF6B35' },
    { id: 'fire', label: 'Fire', icon: 'flame', color: '#FFD93D' },
    { id: 'disaster', label: 'Disaster', icon: 'warning', color: '#45B7D1' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
            {user?.profile_photo ? (
              <Image source={{ uri: user.profile_photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={50} color="#666" />
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          {isEditing ? (
            <View style={styles.editForm}>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Name"
                placeholderTextColor="#666"
              />
              <TextInput
                style={styles.editInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Phone"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.editInput}
                value={editVillage}
                onChangeText={setEditVillage}
                placeholder="Village"
                placeholderTextColor="#666"
              />
              <TextInput
                style={styles.editInput}
                value={editDistrict}
                onChangeText={setEditDistrict}
                placeholder="District"
                placeholderTextColor="#666"
              />
              <View style={styles.editButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color="#888" />
                <Text style={styles.locationText}>
                  {user?.village || 'Village'}, {user?.district || 'District'}, {user?.state}
                </Text>
              </View>
              <TouchableOpacity style={styles.editProfileButton} onPress={startEditing}>
                <Ionicons name="pencil" size={16} color="#FF6B35" />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Points Card */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsIcon}>
            <Ionicons name="star" size={32} color="#FFD93D" />
          </View>
          <View style={styles.pointsInfo}>
            <Text style={styles.pointsValue}>{user?.points || 0}</Text>
            <Text style={styles.pointsLabel}>Points Earned</Text>
          </View>
        </View>

        {/* Emergency Button */}
        <TouchableOpacity style={styles.emergencyButton} onPress={() => setShowEmergency(true)}>
          <Ionicons name="alert-circle" size={24} color="#fff" />
          <Text style={styles.emergencyButtonText}>Emergency Alert</Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="wallet" size={24} color="#4ECDC4" />
              <Text style={styles.statValue}>Track</Text>
              <Text style={styles.statLabel}>Moi Records</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={24} color="#FF6B35" />
              <Text style={styles.statValue}>Join</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="megaphone" size={24} color="#FFD93D" />
              <Text style={styles.statValue}>Share</Text>
              <Text style={styles.statLabel}>News</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="storefront" size={24} color="#6c5ce7" />
              <Text style={styles.statValue}>List</Text>
              <Text style={styles.statLabel}>Services</Text>
            </View>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Our Life v1.0</Text>
          <Text style={styles.appInfoSubtext}>Your Village, Your Community</Text>
        </View>
      </ScrollView>

      {/* Emergency Modal */}
      <Modal visible={showEmergency} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.emergencyModal}>
            <View style={styles.modalHeader}>
              <View style={styles.emergencyHeaderIcon}>
                <Ionicons name="alert-circle" size={28} color="#FF6B6B" />
              </View>
              <Text style={styles.emergencyModalTitle}>Emergency Alert</Text>
              <TouchableOpacity onPress={() => setShowEmergency(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.emergencySubtitle}>Select emergency type:</Text>
            <View style={styles.emergencyTypes}>
              {EMERGENCY_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.emergencyTypeButton,
                    emergencyType === type.id && { backgroundColor: type.color },
                  ]}
                  onPress={() => setEmergencyType(type.id)}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={24}
                    color={emergencyType === type.id ? '#fff' : type.color}
                  />
                  <Text style={[
                    styles.emergencyTypeText,
                    emergencyType === type.id && styles.emergencyTypeTextActive,
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.emergencyInput}
              placeholder="Describe your emergency..."
              placeholderTextColor="#666"
              value={emergencyMessage}
              onChangeText={setEmergencyMessage}
              multiline
            />

            <TouchableOpacity
              style={[styles.sendAlertButton, isSendingEmergency && styles.sendAlertButtonDisabled]}
              onPress={handleEmergencyAlert}
              disabled={isSendingEmergency}
            >
              {isSendingEmergency ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="alert" size={20} color="#fff" />
                  <Text style={styles.sendAlertText}>SEND EMERGENCY ALERT</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.emergencyDisclaimer}>
              This will notify your emergency contacts and village admins.
            </Text>
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
  content: {
    padding: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF6B35',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0f0f1a',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  locationText: {
    color: '#888',
    fontSize: 14,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    gap: 8,
  },
  editProfileText: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  editForm: {
    width: '100%',
    paddingHorizontal: 16,
  },
  editInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  pointsIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFD93D20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsInfo: {
    marginLeft: 16,
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD93D',
  },
  pointsLabel: {
    color: '#888',
    fontSize: 14,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    gap: 12,
  },
  emergencyButtonText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: 20,
  },
  appInfoText: {
    color: '#666',
    fontSize: 14,
  },
  appInfoSubtext: {
    color: '#444',
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  emergencyModal: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  emergencyHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B6B20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emergencyModalTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emergencySubtitle: {
    color: '#888',
    marginBottom: 12,
  },
  emergencyTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  emergencyTypeButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#2a2a3e',
    gap: 8,
  },
  emergencyTypeText: {
    color: '#888',
    fontWeight: '600',
  },
  emergencyTypeTextActive: {
    color: '#fff',
  },
  emergencyInput: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  sendAlertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    padding: 18,
    borderRadius: 12,
    gap: 10,
  },
  sendAlertButtonDisabled: {
    opacity: 0.6,
  },
  sendAlertText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emergencyDisclaimer: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
