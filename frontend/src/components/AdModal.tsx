import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adsAPI } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface AdModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AdModal({ visible, onClose }: AdModalProps) {
  const [isWatching, setIsWatching] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [reward, setReward] = useState<number | null>(null);
  const updateUser = useAuthStore((s) => s.updateUser);

  useEffect(() => {
    if (visible && isWatching && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [visible, isWatching, countdown]);

  const startWatching = () => {
    setIsWatching(true);
    setCountdown(5);
  };

  const collectReward = async () => {
    try {
      const response = await adsAPI.watchAd();
      setReward(response.data.reward);
      updateUser({ wallet_balance: response.data.new_balance });
      setTimeout(() => {
        setIsWatching(false);
        setReward(null);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error collecting reward:', error);
      onClose();
    }
  };

  const handleClose = () => {
    setIsWatching(false);
    setCountdown(5);
    setReward(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {!isWatching ? (
            <>
              <Ionicons name="gift" size={60} color="#FFD700" />
              <Text style={styles.title}>Watch Ad to Earn!</Text>
              <Text style={styles.description}>
                Watch a short video ad and earn real money. 50% of ad revenue goes to you!
              </Text>
              <TouchableOpacity style={styles.watchButton} onPress={startWatching}>
                <Ionicons name="play-circle" size={24} color="#fff" />
                <Text style={styles.watchButtonText}>Watch Ad</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipButton} onPress={handleClose}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </>
          ) : reward !== null ? (
            <>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
              <Text style={styles.rewardTitle}>Congratulations!</Text>
              <Text style={styles.rewardAmount}>+${reward.toFixed(2)}</Text>
              <Text style={styles.rewardText}>Added to your wallet</Text>
            </>
          ) : countdown > 0 ? (
            <>
              <View style={styles.adPlaceholder}>
                <Text style={styles.adLabel}>SIMULATED AD</Text>
                <Ionicons name="videocam" size={60} color="#666" />
                <Text style={styles.adText}>Video Advertisement</Text>
              </View>
              <Text style={styles.countdown}>Skip in {countdown}s</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
              <Text style={styles.completeText}>Ad Complete!</Text>
              <TouchableOpacity style={styles.collectButton} onPress={collectReward}>
                <Text style={styles.collectButtonText}>Collect Reward</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  watchButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
    alignItems: 'center',
    gap: 8,
  },
  watchButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    marginTop: 15,
    padding: 10,
  },
  skipText: {
    color: '#666',
    fontSize: 14,
  },
  adPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#2a2a3e',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adLabel: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  adText: {
    color: '#666',
    marginTop: 10,
  },
  countdown: {
    color: '#aaa',
    marginTop: 15,
    fontSize: 14,
  },
  completeText: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 15,
  },
  collectButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  collectButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rewardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
  },
  rewardAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  rewardText: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 5,
  },
});
