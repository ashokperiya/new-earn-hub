import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { postsAPI, aiAPI } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

interface Post {
  id: string;
  user_id: string;
  user_name: string;
  user_photo: string | null;
  content: string;
  media: string | null;
  media_type: string | null;
  category: string;
  location_level: string;
  village: string | null;
  district: string | null;
  likes: string[];
  comments: any[];
  created_at: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'announcement', label: 'News', icon: 'megaphone' },
  { id: 'event', label: 'Events', icon: 'calendar' },
  { id: 'job', label: 'Jobs', icon: 'briefcase' },
  { id: 'complaint', label: 'Issues', icon: 'alert-circle' },
];

export default function HomeScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  const fetchPosts = async () => {
    try {
      const params: any = { limit: 30 };
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      const response = await postsAPI.getAll(params);
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchPosts();
    setIsRefreshing(false);
  }, [selectedCategory]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const createPost = async () => {
    if (!newPost.trim() && !selectedImage) return;

    setIsPosting(true);
    try {
      await postsAPI.create({
        content: newPost,
        media: selectedImage || undefined,
        media_type: selectedImage ? 'image' : undefined,
        category: 'general',
      });
      setNewPost('');
      setSelectedImage(null);
      await fetchPosts();
    } catch (error) {
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const response = await postsAPI.like(postId);
      setPosts(posts.map(post => {
        if (post.id === postId) {
          const likes = response.data.liked
            ? [...post.likes, user!.id]
            : post.likes.filter(id => id !== user!.id);
          return { ...post, likes };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const askAI = async () => {
    if (!aiQuestion.trim()) return;
    setIsAiLoading(true);
    try {
      const response = await aiAPI.chat(aiQuestion);
      setAiResponse(response.data.response);
    } catch (error) {
      setAiResponse('Sorry, I could not process your request.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.id === category);
    return cat?.icon || 'document-text';
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.userAvatar}>
          {item.user_photo ? (
            <Image source={{ uri: item.user_photo }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={20} color="#666" />
          )}
        </View>
        <View style={styles.postInfo}>
          <Text style={styles.userName}>{item.user_name}</Text>
          <View style={styles.postMeta}>
            <Text style={styles.postTime}>{formatTime(item.created_at)}</Text>
            {item.village && <Text style={styles.postLocation}> • {item.village}</Text>}
          </View>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
          <Ionicons name={getCategoryIcon(item.category) as any} size={12} color="#fff" />
        </View>
      </View>
      <Text style={styles.postContent}>{item.content}</Text>
      {item.media && (
        <Image source={{ uri: item.media }} style={styles.postImage} />
      )}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.id)}>
          <Ionicons
            name={item.likes.includes(user!.id) ? 'heart' : 'heart-outline'}
            size={22}
            color={item.likes.includes(user!.id) ? '#FF6B35' : '#666'}
          />
          <Text style={styles.actionText}>{item.likes.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.actionText}>{item.comments.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'announcement': return '#FF6B35';
      case 'event': return '#4ECDC4';
      case 'job': return '#45B7D1';
      case 'complaint': return '#FF6B6B';
      default: return '#6c5ce7';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Our Life</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.aiButton} onPress={() => setShowAI(true)}>
            <Ionicons name="chatbubble-ellipses" size={22} color="#FF6B35" />
          </TouchableOpacity>
          <View style={styles.pointsBadge}>
            <Ionicons name="star" size={14} color="#FFD93D" />
            <Text style={styles.pointsText}>{user?.points || 0}</Text>
          </View>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              selectedCategory === cat.id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Ionicons
              name={cat.icon as any}
              size={16}
              color={selectedCategory === cat.id ? '#fff' : '#888'}
            />
            <Text style={[
              styles.categoryChipText,
              selectedCategory === cat.id && styles.categoryChipTextActive,
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
        ListHeaderComponent={
          <View style={styles.createPost}>
            <View style={styles.createPostHeader}>
              <View style={styles.userAvatar}>
                {user?.profile_photo ? (
                  <Image source={{ uri: user.profile_photo }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={20} color="#666" />
                )}
              </View>
              <TextInput
                style={styles.postInput}
                placeholder="Share news, updates, or thoughts..."
                placeholderTextColor="#666"
                value={newPost}
                onChangeText={setNewPost}
                multiline
              />
            </View>
            {selectedImage && (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <TouchableOpacity style={styles.removeImage} onPress={() => setSelectedImage(null)}>
                  <Ionicons name="close-circle" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.createPostFooter}>
              <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
                <Ionicons name="image" size={24} color="#4ECDC4" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.postButton, (!newPost.trim() && !selectedImage) && styles.postButtonDisabled]}
                onPress={createPost}
                disabled={isPosting || (!newPost.trim() && !selectedImage)}
              >
                {isPosting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={60} color="#333" />
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share news!</Text>
          </View>
        }
      />

      {/* AI Assistant Modal */}
      <Modal visible={showAI} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.aiModal}>
            <View style={styles.aiHeader}>
              <View style={styles.aiTitle}>
                <Ionicons name="chatbubble-ellipses" size={24} color="#FF6B35" />
                <Text style={styles.aiTitleText}>AI Assistant</Text>
              </View>
              <TouchableOpacity onPress={() => { setShowAI(false); setAiResponse(''); setAiQuestion(''); }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.aiSubtitle}>Ask about Moi, events, or anything!</Text>
            
            {aiResponse ? (
              <View style={styles.aiResponseContainer}>
                <Text style={styles.aiResponseText}>{aiResponse}</Text>
                <TouchableOpacity style={styles.askAgainButton} onPress={() => { setAiResponse(''); setAiQuestion(''); }}>
                  <Text style={styles.askAgainText}>Ask Another Question</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.aiInput}
                  placeholder="E.g., How much moi did I give Kumar?"
                  placeholderTextColor="#666"
                  value={aiQuestion}
                  onChangeText={setAiQuestion}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.aiAskButton, !aiQuestion.trim() && styles.aiAskButtonDisabled]}
                  onPress={askAI}
                  disabled={isAiLoading || !aiQuestion.trim()}
                >
                  {isAiLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color="#fff" />
                      <Text style={styles.aiAskButtonText}>Ask</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
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
    color: '#FF6B35',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiButton: {
    padding: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  pointsText: {
    color: '#FFD93D',
    fontWeight: '600',
    fontSize: 13,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    gap: 4,
  },
  categoryChipActive: {
    backgroundColor: '#FF6B35',
  },
  categoryChipText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingBottom: 20,
  },
  createPost: {
    backgroundColor: '#1a1a2e',
    margin: 16,
    borderRadius: 16,
    padding: 16,
  },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a3e',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  postInput: {
    flex: 1,
    marginLeft: 12,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
  },
  selectedImageContainer: {
    marginTop: 12,
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImage: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  createPostFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
  },
  mediaButton: {
    padding: 8,
  },
  postButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  postCard: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postTime: {
    color: '#666',
    fontSize: 12,
  },
  postLocation: {
    color: '#888',
    fontSize: 12,
  },
  categoryBadge: {
    padding: 6,
    borderRadius: 8,
  },
  postContent: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginTop: 12,
  },
  postActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: '#666',
    fontSize: 14,
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
  aiModal: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 300,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiTitleText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  aiSubtitle: {
    color: '#888',
    marginBottom: 20,
  },
  aiInput: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  aiAskButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  aiAskButtonDisabled: {
    opacity: 0.5,
  },
  aiAskButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  aiResponseContainer: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
  },
  aiResponseText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 24,
  },
  askAgainButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    alignItems: 'center',
  },
  askAgainText: {
    color: '#fff',
    fontWeight: '600',
  },
});
