import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rewardsAPI } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface SpinWheelProps {
  visible: boolean;
  onClose: () => void;
}

const PRIZES = ['$0.01', '$0.02', '$0.05', '$0.10', '$0.25', '$0.50', '$1.00', 'Try Again'];
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

export default function SpinWheel({ visible, onClose }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<{ prize: number; message: string } | null>(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const updateUser = useAuthStore((s) => s.updateUser);

  const spin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setResult(null);

    try {
      const response = await rewardsAPI.spin();
      const prize = response.data.prize;
      
      // Calculate rotation to land on prize
      const prizeIndex = prize === 0 ? 7 : PRIZES.findIndex(p => p === `$${prize.toFixed(2)}`);
      const segmentAngle = 360 / 8;
      const targetAngle = 360 * 5 + (prizeIndex * segmentAngle) + segmentAngle / 2;

      Animated.timing(rotation, {
        toValue: targetAngle,
        duration: 4000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setResult({ prize, message: response.data.message });
        setIsSpinning(false);
        if (prize > 0) {
          updateUser({ wallet_balance: (useAuthStore.getState().user?.wallet_balance || 0) + prize });
        }
      });
    } catch (error: any) {
      setIsSpinning(false);
      if (error.response?.status === 400) {
        setResult({ prize: 0, message: error.response.data.detail });
      }
    }
  };

  const handleClose = () => {
    rotation.setValue(0);
    setResult(null);
    onClose();
  };

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.title}>Lucky Spin!</Text>
          <Text style={styles.subtitle}>Spin once daily for free rewards</Text>

          <View style={styles.wheelContainer}>
            <View style={styles.pointer}>
              <Ionicons name="caret-down" size={40} color="#FFD700" />
            </View>
            <Animated.View
              style={[
                styles.wheel,
                { transform: [{ rotate: rotateInterpolate }] },
              ]}
            >
              {PRIZES.map((prize, index) => (
                <View
                  key={index}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: COLORS[index],
                      transform: [{ rotate: `${index * 45}deg` }],
                    },
                  ]}
                >
                  <Text style={styles.prizeText}>{prize}</Text>
                </View>
              ))}
            </Animated.View>
          </View>

          {result ? (
            <View style={styles.resultContainer}>
              <Ionicons
                name={result.prize > 0 ? 'trophy' : 'refresh'}
                size={40}
                color={result.prize > 0 ? '#FFD700' : '#aaa'}
              />
              <Text style={styles.resultText}>{result.message}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.spinButton, isSpinning && styles.spinButtonDisabled]}
              onPress={spin}
              disabled={isSpinning}
            >
              <Ionicons name="sync" size={24} color="#fff" />
              <Text style={styles.spinButtonText}>
                {isSpinning ? 'Spinning...' : 'SPIN'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 20,
  },
  wheelContainer: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointer: {
    position: 'absolute',
    top: -5,
    zIndex: 10,
  },
  wheel: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#2a2a3e',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  segment: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    left: '50%',
    top: 0,
    transformOrigin: 'left bottom',
    justifyContent: 'center',
    paddingLeft: 20,
  },
  prizeText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  spinButton: {
    flexDirection: 'row',
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 20,
    alignItems: 'center',
    gap: 10,
  },
  spinButtonDisabled: {
    opacity: 0.6,
  },
  spinButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  resultContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  resultText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 10,
    textAlign: 'center',
  },
});
