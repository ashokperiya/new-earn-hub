import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import AdModal from '../../src/components/AdModal';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

interface Game {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  reward: string;
}

const GAMES: Game[] = [
  {
    id: 'tap',
    name: 'Tap Frenzy',
    icon: 'finger-print',
    color: '#FF6B6B',
    description: 'Tap as fast as you can!',
    reward: 'Up to $0.50',
  },
  {
    id: 'memory',
    name: 'Memory Match',
    icon: 'grid',
    color: '#4ECDC4',
    description: 'Match the pairs',
    reward: 'Up to $0.75',
  },
  {
    id: 'quiz',
    name: 'Quick Quiz',
    icon: 'help-circle',
    color: '#45B7D1',
    description: 'Test your knowledge',
    reward: 'Up to $1.00',
  },
  {
    id: 'catch',
    name: 'Coin Catcher',
    icon: 'cash',
    color: '#96CEB4',
    description: 'Catch falling coins',
    reward: 'Up to $0.60',
  },
];

export default function GamesScreen() {
  const [showAd, setShowAd] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const handlePlayGame = (gameId: string) => {
    setSelectedGame(gameId);
    setShowAd(true);
  };

  const handleAdClose = () => {
    setShowAd(false);
    if (selectedGame) {
      router.push(`/game/${selectedGame}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Game Center</Text>
        <View style={styles.statsContainer}>
          <Ionicons name="trophy" size={18} color="#FFD700" />
          <Text style={styles.statsText}>
            {user?.game_stats?.total_score || 0} pts
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.bannerCard}>
          <View style={styles.bannerContent}>
            <Ionicons name="game-controller" size={40} color="#6c5ce7" />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Play & Earn</Text>
              <Text style={styles.bannerSubtitle}>
                Win coins that convert to real cash!
              </Text>
            </View>
          </View>
          <View style={styles.bannerStats}>
            <View style={styles.bannerStat}>
              <Text style={styles.bannerStatValue}>
                {user?.game_stats?.total_games || 0}
              </Text>
              <Text style={styles.bannerStatLabel}>Games Played</Text>
            </View>
            <View style={styles.bannerStatDivider} />
            <View style={styles.bannerStat}>
              <Text style={styles.bannerStatValue}>
                ${((user?.game_stats?.total_score || 0) * 0.001).toFixed(2)}
              </Text>
              <Text style={styles.bannerStatLabel}>Total Earned</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Available Games</Text>
        <View style={styles.gamesGrid}>
          {GAMES.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={[styles.gameCard, { width: cardWidth }]}
              onPress={() => handlePlayGame(game.id)}
            >
              <View style={[styles.gameIcon, { backgroundColor: game.color + '20' }]}>
                <Ionicons name={game.icon as any} size={32} color={game.color} />
              </View>
              <Text style={styles.gameName}>{game.name}</Text>
              <Text style={styles.gameDescription}>{game.description}</Text>
              <View style={styles.gameReward}>
                <Ionicons name="cash-outline" size={14} color="#00b894" />
                <Text style={styles.gameRewardText}>{game.reward}</Text>
              </View>
              <TouchableOpacity
                style={[styles.playButton, { backgroundColor: game.color }]}
                onPress={() => handlePlayGame(game.id)}
              >
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.playButtonText}>Play</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.leaderboardPreview}>
          <View style={styles.leaderboardHeader}>
            <Ionicons name="podium" size={24} color="#FFD700" />
            <Text style={styles.leaderboardTitle}>Leaderboard</Text>
          </View>
          <Text style={styles.leaderboardSubtitle}>
            Compete with other players for weekly prizes!
          </Text>
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View Full Rankings</Text>
            <Ionicons name="chevron-forward" size={20} color="#6c5ce7" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AdModal visible={showAd} onClose={handleAdClose} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
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
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statsText: {
    color: '#FFD700',
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  bannerCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  bannerText: {
    marginLeft: 16,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  bannerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
  },
  bannerStat: {
    alignItems: 'center',
  },
  bannerStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6c5ce7',
  },
  bannerStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  bannerStatDivider: {
    width: 1,
    backgroundColor: '#2a2a3e',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gameCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
  },
  gameIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  gameReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  gameRewardText: {
    fontSize: 12,
    color: '#00b894',
    fontWeight: '600',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  playButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  leaderboardPreview: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  leaderboardSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  viewAllText: {
    color: '#6c5ce7',
    fontWeight: '600',
  },
});
