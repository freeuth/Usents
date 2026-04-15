import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../stores/authStore';

const COLOR_OPTIONS = [
  '#3B82F6','#EC4899','#8B5CF6','#10B981','#F59E0B',
  '#EF4444','#06B6D4','#6366F1','#84CC16','#F97316',
];

export function ProfileSettingsScreen({ navigation }: any) {
  const { member, user, updateMember } = useAuthStore();
  const [displayName, setDisplayName] = useState(member?.display_name ?? '');
  const [color, setColor] = useState(member?.color ?? Colors.primary);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    displayName.trim() !== (member?.display_name ?? '') ||
    color !== (member?.color ?? Colors.primary);

  const handleSave = async () => {
    if (!member || !displayName.trim()) {
      Alert.alert('이름을 입력해주세요');
      return;
    }
    setIsSaving(true);
    try {
      await updateMember(member.id, { display_name: displayName.trim(), color });
      Alert.alert('저장 완료', '프로필이 업데이트되었습니다');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필 설정</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!hasChanges || isSaving}
          style={[styles.saveBtn, (!hasChanges || isSaving) && { opacity: 0.4 }]}
        >
          <Text style={styles.saveBtnText}>저장</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Avatar preview */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: color }]}>
              <Text style={styles.avatarText}>
                {displayName?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <Text style={styles.avatarHint}>이름 첫 글자가 프로필 아이콘에 표시됩니다</Text>
          </View>

          {/* Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>프로필 정보</Text>
            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>이름</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="이름 입력"
                  placeholderTextColor={Colors.textTertiary}
                  maxLength={20}
                />
              </View>
              <View style={[styles.field, styles.fieldBorder]}>
                <Text style={styles.fieldLabel}>이메일</Text>
                <Text style={styles.fieldValue}>{user?.email ?? '-'}</Text>
              </View>
            </View>
          </View>

          {/* Color */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>프로필 색상</Text>
            <View style={styles.card}>
              <View style={styles.colorSection}>
                <View style={styles.colorGrid}>
                  {COLOR_OPTIONS.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                      onPress={() => setColor(c)}
                    >
                      {color === c && <MaterialIcons name="check" size={16} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  saveBtn: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 34, fontWeight: '800', color: '#fff' },
  avatarHint: { fontSize: 13, color: Colors.textTertiary },

  section: { marginBottom: 16, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  field: { paddingHorizontal: 16, paddingVertical: 14 },
  fieldBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  fieldLabel: { fontSize: 12, color: Colors.textTertiary, marginBottom: 6 },
  input: {
    fontSize: 16, fontWeight: '500', color: Colors.textPrimary,
    paddingVertical: 0,
  },
  fieldValue: { fontSize: 16, color: Colors.textSecondary },

  colorSection: { padding: 16 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorDot: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  colorDotActive: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.1 }] },
});
