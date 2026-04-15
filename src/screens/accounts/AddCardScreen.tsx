import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { Colors, OwnerColors, OwnerLabels } from '../../constants/colors';
import { CardType, Owner } from '../../types';
import { CARD_TYPE_LABELS } from '../../constants/categories';

const CARD_TYPES: CardType[] = ['credit', 'debit'];
const OWNERS: Owner[] = ['me', 'spouse', 'joint'];
const PAYMENT_DAYS = [1, 5, 7, 10, 12, 14, 15, 17, 20, 25, 27];

export function AddCardScreen({ navigation, route }: any) {
  const existing = route?.params?.card;
  const { household } = useAuthStore();
  const { createCard, updateCard, accounts, loadAccounts } = useDataStore();

  const [name, setName]               = useState(existing?.name ?? '');
  const [cardType, setCardType]       = useState<CardType>(existing?.card_type ?? 'credit');
  const [paymentDay, setPaymentDay]   = useState<number>(existing?.payment_day ?? 15);
  const [linkedAccountId, setLinkedAccountId] = useState<string | null>(existing?.linked_account_id ?? null);
  const [owner, setOwner]             = useState<Owner>(existing?.owner ?? 'me');
  const [isLoading, setIsLoading]     = useState(false);

  useEffect(() => {
    if (household) loadAccounts(household.id);
  }, [household]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('입력 오류', '카드 이름을 입력해주세요');
      return;
    }
    if (!household) return;

    setIsLoading(true);
    try {
      if (existing) {
        await updateCard(existing.id, {
          name: name.trim(),
          card_type: cardType,
          payment_day: paymentDay,
          linked_account_id: linkedAccountId,
          owner,
        });
      } else {
        await createCard(household.id, {
          name: name.trim(),
          card_type: cardType,
          payment_day: paymentDay,
          linked_account_id: linkedAccountId,
          owner,
        });
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('저장 실패', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cancel}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{existing ? '카드 수정' : '카드 추가'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={isLoading}>
            <Text style={[styles.save, isLoading && { opacity: 0.5 }]}>
              {isLoading ? '저장중' : '저장'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* 카드명 */}
          <View style={styles.group}>
            <Text style={styles.label}>카드 이름 *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="예: 신한카드, 삼성카드"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          {/* 카드 종류 */}
          <View style={styles.group}>
            <Text style={styles.label}>카드 종류</Text>
            <View style={styles.chipRow}>
              {CARD_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, cardType === t && styles.chipActive]}
                  onPress={() => setCardType(t)}
                >
                  <Text style={[styles.chipText, cardType === t && styles.chipTextActive]}>
                    {CARD_TYPE_LABELS[t]}카드
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 결제일 */}
          <View style={styles.group}>
            <Text style={styles.label}>결제일</Text>
            <View style={styles.chipRow}>
              {PAYMENT_DAYS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayChip, paymentDay === d && styles.chipActive]}
                  onPress={() => setPaymentDay(d)}
                >
                  <Text style={[styles.chipText, paymentDay === d && styles.chipTextActive]}>
                    {d}일
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 연결 통장 */}
          <View style={styles.group}>
            <Text style={styles.label}>연결 통장 (선택)</Text>
            <TouchableOpacity
              style={[styles.chip, !linkedAccountId && styles.chipActive]}
              onPress={() => setLinkedAccountId(null)}
            >
              <Text style={[styles.chipText, !linkedAccountId && styles.chipTextActive]}>없음</Text>
            </TouchableOpacity>
            <View style={[styles.chipRow, { marginTop: 8 }]}>
              {accounts.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.chip, linkedAccountId === a.id && styles.chipActive]}
                  onPress={() => setLinkedAccountId(a.id)}
                >
                  <Text style={[styles.chipText, linkedAccountId === a.id && styles.chipTextActive]}>
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 소유자 */}
          <View style={styles.group}>
            <Text style={styles.label}>소유자</Text>
            <View style={styles.ownerRow}>
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cancel: { fontSize: 16, color: Colors.textSecondary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  save: { fontSize: 16, fontWeight: '700', color: Colors.primary },

  content: { padding: 20 },
  group: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  chipText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '700' },
  ownerRow: { flexDirection: 'row', gap: 10 },
  ownerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  ownerBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
});
