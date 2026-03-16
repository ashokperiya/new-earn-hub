import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { walletAPI } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
}

export default function WalletScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('paypal');
  const [withdrawDetails, setWithdrawDetails] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await walletAPI.getTransactions();
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchTransactions();
    setIsRefreshing(false);
  }, []);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 100) {
      Alert.alert('Error', 'Minimum withdrawal is $100');
      return;
    }
    if (amount > (user?.wallet_balance || 0)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }
    if (!withdrawDetails.trim()) {
      Alert.alert('Error', 'Please enter payment details');
      return;
    }

    setIsWithdrawing(true);
    try {
      const response = await walletAPI.withdraw(amount, withdrawMethod, withdrawDetails);
      Alert.alert('Success', response.data.message);
      updateUser({ wallet_balance: response.data.new_balance });
      setShowWithdraw(false);
      setWithdrawAmount('');
      setWithdrawDetails('');
      await fetchTransactions();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Withdrawal failed');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'ad_reward': return { name: 'videocam', color: '#4ECDC4' };
      case 'game_reward': return { name: 'game-controller', color: '#6c5ce7' };
      case 'referral': return { name: 'people', color: '#fd79a8' };
      case 'daily_reward': return { name: 'gift', color: '#FFD700' };
      case 'spin_reward': return { name: 'sync', color: '#00b894' };
      case 'withdrawal': return { name: 'arrow-down-circle', color: '#ff6b6b' };
      default: return { name: 'cash', color: '#00b894' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const icon = getTransactionIcon(item.type);
    return (
      <View style={styles.transactionItem}>
        <View style={[styles.transactionIcon, { backgroundColor: icon.color + '20' }]}>
          <Ionicons name={icon.name as any} size={20} color={icon.color} />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDesc}>{item.description}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={[styles.transactionAmount, item.amount < 0 && styles.negativeAmount]}>
          {item.amount >= 0 ? '+' : ''}${Math.abs(item.amount).toFixed(2)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#6c5ce7" />
        }
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            ${(user?.wallet_balance || 0).toFixed(2)}
          </Text>
          <View style={styles.earningsRow}>
            <View style={styles.earningsItem}>
              <Ionicons name="trending-up" size={16} color="#00b894" />
              <Text style={styles.earningsText}>
                Total earned: ${(user?.total_earnings || 0).toFixed(2)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.withdrawButton,
              (user?.wallet_balance || 0) < 100 && styles.withdrawButtonDisabled,
            ]}
            onPress={() => setShowWithdraw(true)}
            disabled={(user?.wallet_balance || 0) < 100}
          >
            <Ionicons name="arrow-down-circle" size={20} color="#fff" />
            <Text style={styles.withdrawButtonText}>Withdraw</Text>
          </TouchableOpacity>
          {(user?.wallet_balance || 0) < 100 && (
            <Text style={styles.minWithdrawText}>
              Minimum withdrawal: $100 (${(100 - (user?.wallet_balance || 0)).toFixed(2)} more needed)
            </Text>
          )}
        </View>

        <View style={styles.earnMore}>
          <Text style={styles.earnMoreTitle}>Earn More</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.earnCard}>
              <Ionicons name="chatbubbles" size={24} color="#6c5ce7" />
              <Text style={styles.earnCardTitle}>Chat & Earn</Text>
              <Text style={styles.earnCardDesc}>$0.01-$0.05 per ad</Text>
            </View>
            <View style={styles.earnCard}>
              <Ionicons name="game-controller" size={24} color="#00b894" />
              <Text style={styles.earnCardTitle}>Play Games</Text>
              <Text style={styles.earnCardDesc}>$0.001 per point</Text>
            </View>
            <View style={styles.earnCard}>
              <Ionicons name="people" size={24} color="#fd79a8" />
              <Text style={styles.earnCardTitle}>Refer Friends</Text>
              <Text style={styles.earnCardDesc}>$2.00 per referral</Text>
            </View>
          </ScrollView>
        </View>

        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Ionicons name="receipt-outline" size={40} color="#333" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.map((item) => (
              <View key={item.id}>{renderTransaction({ item })}</View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showWithdraw} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setShowWithdraw(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Amount (USD)</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimum $100"
              placeholderTextColor="#666"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.methodButtons}>
              {['paypal', 'upi', 'bank'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.methodButton,
                    withdrawMethod === method && styles.methodButtonActive,
                  ]}
                  onPress={() => setWithdrawMethod(method)}
                >
                  <Text
                    style={[
                      styles.methodButtonText,
                      withdrawMethod === method && styles.methodButtonTextActive,
                    ]}
                  >
                    {method.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Payment Details</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder={
                withdrawMethod === 'paypal'
                  ? 'PayPal email'
                  : withdrawMethod === 'upi'
                  ? 'UPI ID'
                  : 'Bank account details'
              }
              placeholderTextColor="#666"
              value={withdrawDetails}
              onChangeText={setWithdrawDetails}
              multiline
            />

            <TouchableOpacity
              style={[styles.submitButton, isWithdrawing && styles.submitButtonDisabled]}
              onPress={handleWithdraw}
              disabled={isWithdrawing}
            >
              {isWithdrawing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Request Withdrawal</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimerText}>
              Note: Withdrawals are processed within 3-5 business days (MOCKED)
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
    backgroundColor: '#0a0a1a',
  },
  header: {
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
  balanceCard: {
    backgroundColor: '#1a1a2e',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#888',
    fontSize: 14,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  earningsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  earningsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  earningsText: {
    color: '#00b894',
    fontSize: 14,
  },
  withdrawButton: {
    flexDirection: 'row',
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    gap: 8,
  },
  withdrawButtonDisabled: {
    backgroundColor: '#444',
  },
  withdrawButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  minWithdrawText: {
    color: '#888',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  earnMore: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  earnMoreTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  earnCard: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    width: 140,
    alignItems: 'center',
  },
  earnCardTitle: {
    color: '#fff',
    fontWeight: '600',
    marginTop: 8,
    fontSize: 14,
  },
  earnCardDesc: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  transactionsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transactionDesc: {
    color: '#fff',
    fontSize: 14,
  },
  transactionDate: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  transactionAmount: {
    color: '#00b894',
    fontSize: 16,
    fontWeight: 'bold',
  },
  negativeAmount: {
    color: '#ff6b6b',
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#666',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  methodButton: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  methodButtonActive: {
    backgroundColor: '#6c5ce7',
  },
  methodButtonText: {
    color: '#888',
    fontWeight: '600',
  },
  methodButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#00b894',
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
  disclaimerText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
