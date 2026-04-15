import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ScrollView, Alert, Modal, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, OwnerColors, OwnerLabels } from '../../constants/colors';
import { useDataStore } from '../../stores/dataStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../lib/helpers';
import { format, parseISO } from 'date-fns';
import { TransactionType, Owner, PaymentMethodType, Transaction } from '../../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const OWNERS: Owner[] = ['me', 'spouse', 'joint'];
const PAYMENT_TYPES: { key: PaymentMethodType; label: string }[] = [
  { key: 'card', label: '카드' },
  { key: 'account', label: '통장' },
  { key: 'cash', label: '현금' },
];

interface Props {
  transaction: Transaction | null;
  visible: boolean;
  onClose: () => void;
}

function formatDateLabel(dateStr: string) {
  try {
    const d = parseISO(dateStr);
    const dayNames: Record<number, string> = { 0:'일', 1:'월', 2:'화', 3:'수', 4:'목', 5:'금', 6:'토' };
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dow = d.getDay();
    return `${month}월 ${day}일 (${dayNames[dow]})`;
  } catch {
    return dateStr;
  }
}

export function TransactionDetailSheet({ transaction: tx, visible, onClose }: Props) {
  const { household } = useAuthStore();
  const { categories, accounts, cards,
    loadCategories, loadAccounts, loadCards,
    updateTransaction, deleteTransaction } = useDataStore();

  const [mode, setMode] = useState<'detail' | 'edit'>('detail');

  // Edit state
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [paymentMethodType, setPaymentMethodType] = useState<PaymentMethodType>('card');
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [owner, setOwner] = useState<Owner>('me');
  const [memo, setMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible && tx) {
      setMode('detail');
      setTxType(tx.type as TransactionType);
      setAmount(String(tx.amount));
      try { setSelectedDate(parseISO(tx.date)); } catch { setSelectedDate(new Date()); }
      setSelectedCategoryId(tx.category_id ?? '');
      setPaymentMethodType(tx.payment_method_type);
      setPaymentMethodId(tx.payment_method_id);
      setOwner(tx.owner);
      setMemo(tx.memo ?? '');
    }
    if (!visible) setShowDatePicker(false);
  }, [visible, tx]);

  useEffect(() => {
    if (!household || !visible) return;
    if (categories.length === 0) loadCategories(household.id);
    if (accounts.length === 0) loadAccounts(household.id);
    if (cards.length === 0) loadCards(household.id);
  }, [visible, household]);

  if (!tx) return null;

  const filteredCategories = categories.filter(c =>
    !c.parent_id && (txType === 'income' ? c.type === 'income' : c.type === 'expense')
  );

  const displayAmount = amount ? parseInt(amount).toLocaleString('ko-KR') : '0';
  const dateLabel = formatDateLabel(format(selectedDate, 'yyyy-MM-dd'));

  const handleNumpad = (val: string) => {
    if (val === '⌫') { setAmount(a => a.slice(0, -1)); return; }
    if (val === '00' && !amount) return;
    if (amount.length >= 11) return;
    setAmount(a => a + val);
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { Alert.alert('오류', '금액을 입력해주세요'); return; }
    if (!selectedCategoryId) { Alert.alert('오류', '카테고리를 선택해주세요'); return; }
    setIsSaving(true);
    try {
      await updateTransaction(tx.id, {
        type: txType,
        amount: numAmount,
        date: format(selectedDate, 'yyyy-MM-dd'),
        category_id: selectedCategoryId,
        payment_method_type: paymentMethodType,
        payment_method_id: paymentMethodId,
        owner,
        memo: memo.trim() || undefined,
      });
      onClose();
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('거래 삭제', '이 거래를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try { await deleteTransaction(tx.id); onClose(); }
          catch (e: any) { Alert.alert('오류', e.message); }
        },
      },
    ]);
  };

  const category = categories.find(c => c.id === tx.category_id) ?? tx.category;
  const card = cards.find(c => c.id === tx.payment_method_id);
  const account = accounts.find(a => a.id === tx.payment_method_id);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            {mode === 'edit' ? (
              <TouchableOpacity onPress={() => setMode('detail')} style={styles.headerBtn}>
                <MaterialIcons name="arrow-back" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>{mode === 'edit' ? '거래 수정' : '거래 상세'}</Text>
            {mode === 'detail' ? (
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={() => setMode('edit')} style={styles.headerBtn}>
                  <MaterialIcons name="edit" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
                  <MaterialIcons name="delete-outline" size={20} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                style={[styles.saveBtn, isSaving && { opacity: 0.5 }]}
              >
                <Text style={styles.saveBtnText}>{isSaving ? '저장 중...' : '저장'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ─── DETAIL MODE ─── */}
          {mode === 'detail' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Amount hero */}
              <View style={styles.hero}>
                <View style={[styles.heroIcon, { backgroundColor: (category?.color ?? Colors.primary) + '20' }]}>
                  <MaterialIcons name={(category?.icon ?? 'payments') as any} size={32} color={category?.color ?? Colors.primary} />
                </View>
                <Text style={[styles.heroAmount, { color: tx.type === 'income' ? Colors.income : Colors.expense }]}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </Text>
                <View style={[styles.typeBadge, { backgroundColor: tx.type === 'income' ? Colors.income + '18' : Colors.expense + '18' }]}>
                  <Text style={[styles.typeBadgeText, { color: tx.type === 'income' ? Colors.income : Colors.expense }]}>
                    {tx.type === 'income' ? '수입' : '지출'}
                  </Text>
                </View>
              </View>

              {/* Detail rows */}
              <View style={styles.detailGroup}>
                {[
                  { icon: 'label' as const,          label: '카테고리', value: category?.name ?? '-' },
                  { icon: 'calendar-today' as const, label: '날짜',     value: formatDateLabel(tx.date) },
                  { icon: 'person' as const,         label: '대상',     value: OwnerLabels[tx.owner] },
                  { icon: 'payment' as const,        label: '결제수단', value:
                      tx.payment_method_type === 'card'    ? (card    ? `💳 ${card.name}`    : '카드') :
                      tx.payment_method_type === 'account' ? (account ? `🏦 ${account.name}` : '통장') :
                      '현금' },
                  ...(tx.memo ? [{ icon: 'notes' as const, label: '메모', value: tx.memo }] : []),
                ].map((row, i, arr) => (
                  <View key={row.label} style={[styles.detailRow, i < arr.length - 1 && styles.detailRowBorder]}>
                    <MaterialIcons name={row.icon} size={16} color={Colors.textTertiary} style={{ marginRight: 10 }} />
                    <Text style={styles.detailLabel}>{row.label}</Text>
                    <Text style={styles.detailValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
              <View style={{ height: 16 }} />
            </ScrollView>
          )}

          {/* ─── EDIT MODE ─── */}
          {mode === 'edit' && (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Type toggle */}
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeBtn, txType === 'expense' && styles.typeBtnExpense]}
                  onPress={() => { setTxType('expense'); setSelectedCategoryId(''); }}
                >
                  <Text style={[styles.typeBtnText, txType === 'expense' && { color: '#fff' }]}>지출</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, txType === 'income' && styles.typeBtnIncome]}
                  onPress={() => { setTxType('income'); setSelectedCategoryId(''); }}
                >
                  <Text style={[styles.typeBtnText, txType === 'income' && { color: '#fff' }]}>수입</Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <View style={styles.amountBox}>
                <Text style={[styles.amountText, { color: txType === 'expense' ? Colors.expense : Colors.income }]}>
                  ₩ {displayAmount}
                </Text>
              </View>

              {/* Date */}
              <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
                <MaterialIcons name="calendar-today" size={15} color={Colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={styles.dateText}>{dateLabel}</Text>
                <MaterialIcons name="expand-more" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>

              {showDatePicker && Platform.OS === 'ios' && (
                <Modal visible transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
                  <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
                    <View style={styles.dateOverlay} />
                  </TouchableWithoutFeedback>
                  <View style={styles.dateSheet}>
                    <View style={styles.dateSheetHeader}>
                      <Text style={styles.dateSheetTitle}>날짜 선택</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.dateSheetDone}>완료</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedDate} mode="date" display="spinner" locale="ko-KR"
                      onChange={(_, d) => { if (d) setSelectedDate(d); }}
                      style={{ backgroundColor: Colors.surface }}
                    />
                  </View>
                </Modal>
              )}
              {showDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={selectedDate} mode="date" display="default"
                  onChange={(_, d) => { setShowDatePicker(false); if (d) setSelectedDate(d); }}
                />
              )}

              {/* Owner */}
              <View style={styles.row}>
                {OWNERS.map(o => (
                  <TouchableOpacity
                    key={o}
                    style={[styles.ownerBtn, owner === o && { backgroundColor: OwnerColors[o], borderColor: OwnerColors[o] }]}
                    onPress={() => setOwner(o)}
                  >
                    <Text style={[styles.ownerBtnText, owner === o && { color: '#fff' }]}>{OwnerLabels[o]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category */}
              <Text style={styles.label}>카테고리</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {filteredCategories.map(cat => {
                  const isSel = selectedCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.catChip, isSel && { backgroundColor: cat.color, borderColor: cat.color }]}
                      onPress={() => setSelectedCategoryId(cat.id)}
                    >
                      <MaterialIcons name={cat.icon as any} size={13} color={isSel ? '#fff' : cat.color} style={{ marginRight: 4 }} />
                      <Text style={[styles.catLabel, isSel && { color: '#fff' }]}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Payment */}
              <Text style={styles.label}>결제수단</Text>
              <View style={[styles.row, { marginBottom: 8 }]}>
                {PAYMENT_TYPES.map(pt => (
                  <TouchableOpacity
                    key={pt.key}
                    style={[styles.payTypeBtn, paymentMethodType === pt.key && styles.payTypeBtnActive]}
                    onPress={() => { setPaymentMethodType(pt.key); setPaymentMethodId(null); }}
                  >
                    <Text style={[styles.payTypeBtnText, paymentMethodType === pt.key && { color: Colors.primary }]}>{pt.label}</Text>
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
              />

              {/* Numpad */}
              <View style={styles.numpad}>
                {['1','2','3','4','5','6','7','8','9','00','0','⌫'].map(k => (
                  <TouchableOpacity
                    key={k} style={styles.numKey}
                    onPress={() => k === '00' ? setAmount(a => a.length ? a + '00' : a) : handleNumpad(k)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.numKeyText}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    maxHeight: SCREEN_HEIGHT * 0.88,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 8,
  },
  handle: {
    width: 40, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, marginBottom: 4,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  headerActions: { flexDirection: 'row' },
  headerBtn: { padding: 6 },
  saveBtn: { backgroundColor: Colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Detail
  hero: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroAmount: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  typeBadgeText: { fontSize: 13, fontWeight: '700' },
  detailGroup: {
    backgroundColor: Colors.surfaceAlt, borderRadius: 16, overflow: 'hidden',
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  detailLabel: { fontSize: 14, color: Colors.textSecondary, width: 72 },
  detailValue: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.textPrimary, textAlign: 'right' },

  // Edit
  typeToggle: {
    flexDirection: 'row', backgroundColor: Colors.surfaceAlt,
    borderRadius: 12, padding: 3, marginBottom: 12,
  },
  typeBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  typeBtnExpense: { backgroundColor: Colors.expense },
  typeBtnIncome:  { backgroundColor: Colors.income },
  typeBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  amountBox: { alignItems: 'center', paddingVertical: 8, marginBottom: 12 },
  amountText: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  dateText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  ownerBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  ownerBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  catChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, marginRight: 8, backgroundColor: Colors.surface,
  },
  catLabel: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  payTypeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  payTypeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  payTypeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  methodChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, marginRight: 8,
  },
  methodChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  methodChipText: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  memoInput: {
    height: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, fontSize: 14, color: Colors.textPrimary, marginBottom: 12,
  },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  numKey: {
    width: '31%', height: 50, backgroundColor: Colors.surfaceAlt,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  numKeyText: { fontSize: 20, fontWeight: '500', color: Colors.textPrimary },
  dateOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  dateSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  dateSheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  dateSheetTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  dateSheetDone: { fontSize: 15, fontWeight: '700', color: Colors.primary },
});
