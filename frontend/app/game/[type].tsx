import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { gamesAPI } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

const { width, height } = Dimensions.get('window');

const GAMES: Record<string, { name: string; color: string; icon: string }> = {
  tap: { name: 'Tap Frenzy', color: '#FF6B6B', icon: 'finger-print' },
  memory: { name: 'Memory Match', color: '#4ECDC4', icon: 'grid' },
  quiz: { name: 'Quick Quiz', color: '#45B7D1', icon: 'help-circle' },
  catch: { name: 'Coin Catcher', color: '#96CEB4', icon: 'cash' },
};

const QUIZ_QUESTIONS = [
  { question: 'What is the capital of France?', options: ['London', 'Paris', 'Berlin', 'Madrid'], answer: 1 },
  { question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Saturn'], answer: 2 },
  { question: 'What is 15 x 8?', options: ['100', '120', '140', '160'], answer: 1 },
  { question: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Monet'], answer: 2 },
  { question: 'What is the largest ocean?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
];

export default function GameScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'ended'>('ready');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [reward, setReward] = useState(0);
  const router = useRouter();
  const updateUser = useAuthStore((s) => s.updateUser);
  const user = useAuthStore((s) => s.user);

  // Game-specific states
  const [tapCount, setTapCount] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [memoryCards, setMemoryCards] = useState<number[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [coinPosition, setCoinPosition] = useState({ x: width / 2, y: 100 });
  const [catcherPosition, setCatcherPosition] = useState(width / 2);
  const [coinsCollected, setCoinsCollected] = useState(0);

  const coinAnim = useRef(new Animated.Value(0)).current;

  const game = GAMES[type || 'tap'];

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === 'playing') {
      endGame();
    }
  }, [gameState, timeLeft]);

  useEffect(() => {
    if (gameState === 'playing' && type === 'catch') {
      animateCoin();
    }
  }, [gameState, type]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(30);
    setTapCount(0);
    setQuizIndex(0);
    setQuizCorrect(0);
    setCoinsCollected(0);

    if (type === 'memory') {
      initMemoryGame();
    }
  };

  const initMemoryGame = () => {
    const pairs = [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6];
    setMemoryCards(pairs.sort(() => Math.random() - 0.5));
    setFlippedCards([]);
    setMatchedPairs([]);
  };

  const animateCoin = () => {
    const newX = Math.random() * (width - 60) + 30;
    setCoinPosition({ x: newX, y: 100 });
    coinAnim.setValue(0);

    Animated.timing(coinAnim, {
      toValue: height - 300,
      duration: 2000,
      useNativeDriver: true,
    }).start(() => {
      if (gameState === 'playing') {
        animateCoin();
      }
    });
  };

  const endGame = async () => {
    setGameState('ended');
    
    let finalScore = score;
    if (type === 'tap') finalScore = tapCount;
    if (type === 'quiz') finalScore = quizCorrect * 20;
    if (type === 'memory') finalScore = matchedPairs.length * 15;
    if (type === 'catch') finalScore = coinsCollected * 10;

    setScore(finalScore);

    try {
      const response = await gamesAPI.submitScore(type!, finalScore);
      setReward(response.data.reward);
      
      // Update local user state
      const newBalance = (user?.wallet_balance || 0) + response.data.reward;
      updateUser({
        wallet_balance: newBalance,
        game_stats: response.data.game_stats,
      });
    } catch (error) {
      console.error('Error submitting score:', error);
    }
  };

  const handleTap = () => {
    if (gameState !== 'playing') return;
    setTapCount((prev) => prev + 1);
  };

  const handleQuizAnswer = (answerIndex: number) => {
    if (QUIZ_QUESTIONS[quizIndex].answer === answerIndex) {
      setQuizCorrect((prev) => prev + 1);
    }
    
    if (quizIndex < QUIZ_QUESTIONS.length - 1) {
      setQuizIndex((prev) => prev + 1);
    } else {
      endGame();
    }
  };

  const handleMemoryCard = (index: number) => {
    if (flippedCards.length === 2 || matchedPairs.includes(index) || flippedCards.includes(index)) return;

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      if (memoryCards[newFlipped[0]] === memoryCards[newFlipped[1]]) {
        setMatchedPairs((prev) => [...prev, ...newFlipped]);
        setFlippedCards([]);
        if (matchedPairs.length + 2 === 12) {
          endGame();
        }
      } else {
        setTimeout(() => setFlippedCards([]), 1000);
      }
    }
  };

  const handleCatcherMove = (direction: 'left' | 'right') => {
    setCatcherPosition((prev) => {
      const newPos = direction === 'left' ? prev - 30 : prev + 30;
      return Math.max(40, Math.min(width - 40, newPos));
    });
  };

  const checkCoinCatch = () => {
    const coinCurrentY = coinAnim._value;
    if (coinCurrentY > height - 350 && coinCurrentY < height - 280) {
      const coinX = coinPosition.x;
      if (Math.abs(coinX - catcherPosition) < 50) {
        setCoinsCollected((prev) => prev + 1);
        animateCoin();
      }
    }
  };

  useEffect(() => {
    if (type === 'catch' && gameState === 'playing') {
      const interval = setInterval(checkCoinCatch, 100);
      return () => clearInterval(interval);
    }
  }, [type, gameState, catcherPosition, coinPosition]);

  const renderGameContent = () => {
    if (gameState === 'ready') {
      return (
        <View style={styles.readyContainer}>
          <View style={[styles.gameIconLarge, { backgroundColor: game.color + '20' }]}>
            <Ionicons name={game.icon as any} size={80} color={game.color} />
          </View>
          <Text style={styles.gameName}>{game.name}</Text>
          <Text style={styles.gameInstructions}>
            {type === 'tap' && 'Tap as fast as you can in 30 seconds!'}
            {type === 'quiz' && 'Answer 5 questions correctly to win!'}
            {type === 'memory' && 'Match all pairs before time runs out!'}
            {type === 'catch' && 'Catch falling coins with your basket!'}
          </Text>
          <TouchableOpacity style={[styles.startButton, { backgroundColor: game.color }]} onPress={startGame}>
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.startButtonText}>START GAME</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (gameState === 'ended') {
      return (
        <View style={styles.endContainer}>
          <Ionicons name="trophy" size={80} color="#FFD700" />
          <Text style={styles.endTitle}>Game Over!</Text>
          <Text style={styles.endScore}>Score: {score}</Text>
          <Text style={styles.endReward}>+${reward.toFixed(2)} earned!</Text>
          <View style={styles.endButtons}>
            <TouchableOpacity style={[styles.playAgainButton, { backgroundColor: game.color }]} onPress={startGame}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.playAgainText}>Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exitButton} onPress={() => router.back()}>
              <Text style={styles.exitText}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Playing state
    switch (type) {
      case 'tap':
        return (
          <TouchableOpacity style={styles.tapArea} onPress={handleTap} activeOpacity={0.8}>
            <Text style={styles.tapCount}>{tapCount}</Text>
            <Text style={styles.tapText}>TAP!</Text>
          </TouchableOpacity>
        );

      case 'quiz':
        const currentQ = QUIZ_QUESTIONS[quizIndex];
        return (
          <View style={styles.quizContainer}>
            <Text style={styles.quizProgress}>Question {quizIndex + 1}/5</Text>
            <Text style={styles.quizQuestion}>{currentQ.question}</Text>
            <View style={styles.quizOptions}>
              {currentQ.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quizOption}
                  onPress={() => handleQuizAnswer(index)}
                >
                  <Text style={styles.quizOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'memory':
        return (
          <View style={styles.memoryContainer}>
            <Text style={styles.memoryScore}>Pairs: {matchedPairs.length / 2}/6</Text>
            <View style={styles.memoryGrid}>
              {memoryCards.map((card, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.memoryCard,
                    (flippedCards.includes(index) || matchedPairs.includes(index)) && styles.memoryCardFlipped,
                  ]}
                  onPress={() => handleMemoryCard(index)}
                >
                  {(flippedCards.includes(index) || matchedPairs.includes(index)) ? (
                    <Text style={styles.memoryCardText}>{card}</Text>
                  ) : (
                    <Ionicons name="help" size={24} color="#666" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'catch':
        return (
          <View style={styles.catchContainer}>
            <Text style={styles.catchScore}>Coins: {coinsCollected}</Text>
            <Animated.View
              style={[
                styles.coin,
                {
                  left: coinPosition.x - 20,
                  transform: [{ translateY: coinAnim }],
                },
              ]}
            >
              <Ionicons name="logo-bitcoin" size={40} color="#FFD700" />
            </Animated.View>
            <View style={[styles.catcher, { left: catcherPosition - 40 }]}>
              <Ionicons name="basket" size={60} color="#6c5ce7" />
            </View>
            <View style={styles.catchControls}>
              <TouchableOpacity style={styles.catchButton} onPress={() => handleCatcherMove('left')}>
                <Ionicons name="arrow-back" size={40} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.catchButton} onPress={() => handleCatcherMove('right')}>
                <Ionicons name="arrow-forward" size={40} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{game?.name}</Text>
        {gameState === 'playing' && (
          <View style={styles.timer}>
            <Ionicons name="time" size={18} color="#FFD700" />
            <Text style={styles.timerText}>{timeLeft}s</Text>
          </View>
        )}
      </View>

      <View style={styles.gameContainer}>{renderGameContent()}</View>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  timerText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  gameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  readyContainer: {
    alignItems: 'center',
  },
  gameIconLarge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  gameName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  gameInstructions: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  endContainer: {
    alignItems: 'center',
  },
  endTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  endScore: {
    fontSize: 24,
    color: '#888',
    marginTop: 12,
  },
  endReward: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00b894',
    marginTop: 8,
  },
  endButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
  },
  playAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
  },
  playAgainText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  exitButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: '#2a2a3e',
  },
  exitText: {
    color: '#888',
    fontWeight: 'bold',
  },
  tapArea: {
    width: width - 40,
    height: 400,
    backgroundColor: '#FF6B6B20',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF6B6B',
  },
  tapCount: {
    fontSize: 100,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  tapText: {
    fontSize: 24,
    color: '#FF6B6B',
    marginTop: 10,
  },
  quizContainer: {
    width: '100%',
    alignItems: 'center',
  },
  quizProgress: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  quizQuestion: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
  },
  quizOptions: {
    width: '100%',
    gap: 12,
  },
  quizOption: {
    backgroundColor: '#1a1a2e',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  quizOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  memoryContainer: {
    width: '100%',
    alignItems: 'center',
  },
  memoryScore: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  memoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  memoryCard: {
    width: 70,
    height: 70,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memoryCardFlipped: {
    backgroundColor: '#4ECDC4',
  },
  memoryCardText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  catchContainer: {
    width: '100%',
    height: height - 300,
    position: 'relative',
  },
  catchScore: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  coin: {
    position: 'absolute',
    top: 50,
  },
  catcher: {
    position: 'absolute',
    bottom: 120,
  },
  catchControls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  catchButton: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    borderRadius: 30,
  },
});
