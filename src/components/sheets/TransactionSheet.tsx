import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ScrollView, Alert, Modal, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, OwnerColors, OwnerLabels } from '../../constants/colors';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { TransactionType, Owner, PaymentMethodType } from '../../types';
import { format } from 'date-fns';

interface TransactionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const OWNERS: Owner[] = ['me', 'spouse', 'joint'];
const PAYMENT_TYPES: { key: PaymentMethodType; label: string }[] = [
  { key: 'card',    label: '카드' },
  { key: 'account', label: '통장' },
  { key: 'cash',    label: '현금' },
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function TransactionSheet({ visible, onClose, onSuccess }: TransactionSheetProps) {
  const { household, member } = useAuthStore();
  const { accounts, cards, categories, loadCategories, loadAccounts, loadCards, createTransaction } = useDataStore();

  useEffect(() => {
    if (!household) return;
    if (categories.length === 0) loadCategories(household.id);
    if (accounts.length === 0) loadAccounts(household.id);
    if (cards.length === 0) loadCards(household.id);
  }, [household]);

  const [txType, setTxType]                       = useState<TransactionType>('expense');
  const [amount, setAmount]                       = useState('');
  const [selectedDate, setSelectedDate]           = useState(new Date());
  const [showDatePicker, setShowDatePicker]       = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [paymentMethodType, setPaymentMethodType] = useState<PaymentMethodType>('card');
  const [paymentMethodId, setPaymentMethodId]     = useState<string | null>(null);
  const [owner, setOwner]                         = useState<Owner>((member?.role as Owner) ?? 'me');
  const [memo, setMemo]                           = useState('');
  const [isSubmitting, setIsSubmitting]           = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dateLabel = format(selectedDate, 'M월 d일 (eee)').replace(
    /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/,
    (d) => ({ Mon:'월', Tue:'화', Wed:'수', Thu:'목', Fri:'금', Sat:'토', Sun:'일' }[d] ?? d)
  );

  const filteredCategories = categories.filter(c =>
    txType === 'income' ? c.type === 'income' : c.type === 'expense'
  );

  const handleNumpad = (val: string) => {
    if (val === '⌫') {
      setAmount(a => a.slice(0, -1));
    } else {
      if (amount.length >= 11) return;
      setAmount(a => a + val);
    }
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('오류', '금액을 입력해주세요');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('오류', '카테고리를 선택해주세요');
      return;
    }
    if (!household || !member) return;

    setIsSubmitting(true);
    try {
      await createTransaction(household.id, member.id, {
        type: txType,
        amount: numAmount,
        date: dateStr,
        category_id: selectedCategoryId,
        payment_method_type: paymentMethodType,
        payment_method_id: paymentMethodId,
        owner,
        memo: memo.trim() || undefined,
      });
      setAmount('');
      setSelectedCategoryId('');
      setMemo('');
      setSelectedDate(new Date());
      onSuccess?.();
      onClose();
    } catch (e: any) {
      Alert.alert('저장 실패', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayAmount = amount
    ? parseInt(amount).toLocaleString('ko-KR')
    : '0';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Type toggle */}
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[styles.typeBtn, txType === 'expense' && styles.typeBtnExpense]}
                onPress={() => setTxType('expense')}
              >
                <Text style={[styles.typeBtnText, txType === 'expense' && { color: '#fff' }]}>지출</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, txType === 'income' && styles.typeBtnIncome]}
                onPress={() => setTxType('income')}
              >
                <Text style={[styles.typeBtnText, txType === 'income' && { color: '#fff' }]}>수입</Text>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View style={styles.amountBox}>
              <Text style={[
                styles.amountText,
                { color: txType === 'expense' ? Colors.expense : Colors.income },
              ]}>
                ₩ {displayAmount}
              </Text>
            </View>

            {/* Date */}
            <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
              <MaterialIcons name="calendar-today" size={16} color={Colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={styles.dateText}>{dateLabel}</Text>
              <MaterialIcons name="expand-more" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>

            {/* iOS date picker modal */}
            {showDatePicker && Platform.OS === 'ios' && (
              <Modal visible transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
                <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
                  <View style={styles.dateModalOverlay} />
                </TouchableWithoutFeedback>
                <View style={styles.dateModalSheet}>
                  <View style={styles.dateModalHeader}>
                    <Text style={styles.dateModalTitle}>날짜 선택</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.dateModalDone}>
                      <Text style={styles.dateModalDoneText}>완료</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="spinner"
                    locale="ko-KR"
                    onChange={(_, d) => { if (d) setSelectedDate(d); }}
                    style={{ backgroundColor: Colors.surface }}
                  />
                </View>
              </Modal>
            )}

            {/* Android date picker */}
            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={(_, d) => { setShowDatePicker(false); if (d) setSelectedDate(d); }}
              />
            )}

            {/* Owner */}
            <View style={styles.row}>
              {OWNERS.map(o => (
                <TouchableOpacity
                  key={o}
                  style={[
                    styles.ownerBtn,
                    owner === o && { backgroundColor: OwnerColors[o], borderColor: OwnerColors[o] },
                  ]}
                  onPress={() => setOwner(o)}
                >
                  <Text style={[styles.ownerBtnText, owner === o && { color: '#fff' }]}>
                    {OwnerLabels[o]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category */}
            <Text style={styles.label}>카테고리</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {filteredCategories.filter(c => !c.parent_id).map(cat => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catChip,
                      isSelected && { backgroundColor: cat.color, borderColor: cat.color },
                    ]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                  >
                    <Text style={{ fontSize: 13, marginRight: 4 }}>{cat.icon}</Text>
                    <Text style={[styles.catLabel, isSelected && { color: '#fff' }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Payment method */}
            <Text style={styles.label}>결제수단</Text>
            <View style={[styles.row, { marginBottom: 8 }]}>
              {PAYMENT_TYPES.map(pt => (
                <TouchableOpacity
                  key={pt.key}
                  style={[
                    styles.payTypeBtn,
                    paymentMethodType === pt.key && styles.payTypeBtnActive,
                  ]}
                  onPress={() => { setPaymentMethodType(pt.key); setPaymentMethodId(null); }}
                >
                  <Text style={[
                    styles.payTypeBtnText,
                    paymentMethodType === pt.key && { color: Colors.primary },
                  ]}>{pt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {paymentMethodType === 'card' && cards.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {cards.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.methodChip, paymentMethodId === c.id && styles.methodChipActive]}
                    onPress={() => setPaymentMethodId(c.id)}
                  >
                    <Text style={styles.methodChipText}>💳 {c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {paymentMethodType === 'account' && accounts.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {accounts.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.methodChip, paymentMethodId === a.id && styles.methodChipActive]}
                    onPress={() => setPaymentMethodId(a.id)}
                  >
                    <Text style={styles.methodChipText}>🏦 {a.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Memo */}
            <TextInput
              style={styles.memoInput}
              placeholder="메모 (선택)"
              placeholderTextColor={Colors.textTertiary}
              value={memo}
              onChangeText={setMemo}
              returnKeyType="done"
            />

            {/* Numpad */}
            <View style={styles.numpad}>
              {['1','2','3','4','5','6','7','8','9','00','0','⌫'].map(k => (
                <TouchableOpacity
                  key={k}
                  style={styles.numKey}
                  onPress={() => k === '00' ? (setAmount(a => a.length ? a + '00' : a)) : handleNumpad(k)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.numKeyText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting ? '저장 중...' : '완료'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.88,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },

  typeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeBtnExpense: { backgroundColor: Colors.expense },
  typeBtnIncome:  { backgroundColor: Colors.income },
  typeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  amountBox: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  amountText: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    color: Colors.textPrimary,
  },

  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },

  ownerBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  ownerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },

  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.surface,
  },
  catLabel: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },

  payTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  payTypeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  payTypeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  methodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 8,
  },
  methodChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  methodChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dateModalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  dateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dateModalDone: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  dateModalDoneText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },

  memoInput: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 12,
  },

  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  numKey: {
    width: '31%',
    height: 50,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numKeyText: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.textPrimary,
  },

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});
