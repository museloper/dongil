import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  formatWon,
  IMPORTANCE_LEVELS,
  TAG_MAX_LENGTH,
  TAG_MAX_PER_TRANSACTION,
  TagNameSchema,
  toLocalDateKey,
  TransactionCreateSchema,
  type Importance,
  type TransactionDto,
  type TxType,
} from '@dongil/shared';
import { useAccounts, useCategories, useCurrentBook, useDeleteTransaction, useSaveTransaction, useTags } from '@/features/queries';
import { closeModal } from '@/lib/nav';
import { formatDayLabel, formatTimeLabel, shiftDay, toTimeKey, withDateKey, withTimeKey } from '@/lib/date';
import { useTheme } from '@/theme/theme';
import { CategoryIcon } from './category-icon';
import { Keypad } from './keypad';
import { AppText, Button, Chip, IconButton, PressableScale, Segmented, haptic } from './ui';

export function TransactionForm({ initial }: { initial?: TransactionDto }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const accounts = useAccounts();
  const { book } = useCurrentBook();
  const categories = useCategories();
  const save = useSaveTransaction();
  const usedTags = useTags();
  const remove = useDeleteTransaction();

  const [type, setType] = useState<TxType>(initial?.type ?? 'EXPENSE');
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [categoryId, setCategoryId] = useState<string | null>(initial?.category?.id ?? null);
  const [accountId, setAccountId] = useState<string | null>(initial?.account.id ?? null);
  const [toAccountId, setToAccountId] = useState<string | null>(initial?.toAccount?.id ?? null);
  const [occurredAt, setOccurredAt] = useState(initial?.occurredAt ?? new Date().toISOString());
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [importance, setImportance] = useState<Importance | null>(initial?.importance ?? null);
  const [tags, setTags] = useState<string[]>(initial?.tags.map((t) => t.name) ?? []);
  const [tagInput, setTagInput] = useState('');
  const [keypadOpen, setKeypadOpen] = useState(!initial);
  const [showPicker, setShowPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 주 자산을 맨 앞에 두어 먼저 선택되게 한다. 수정 화면은 accountId 가 있어 기존 계좌가 그대로 유지된다
  const accountList = [...(accounts.data ?? [])].sort(
    (a, b) => Number(b.id === book?.defaultAccountId) - Number(a.id === book?.defaultAccountId),
  );
  const cats = (categories.data ?? []).filter((c) => c.type === type);
  const suggestions = (usedTags.data ?? []).filter((t) => !tags.includes(t.name));
  const fromId = accountId ?? accountList[0]?.id ?? null;
  const dateKey = toLocalDateKey(new Date(occurredAt));
  const timeKey = toTimeKey(occurredAt);

  const changeType = (t: TxType) => {
    setType(t);
    // 수입/지출이 바뀌면 카테고리 종류가 달라지므로 초기화
    if (t !== type) setCategoryId(null);
  };

  const addTag = (raw: string) => {
    const parsed = TagNameSchema.safeParse(raw);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    if (tags.length >= TAG_MAX_PER_TRANSACTION && !tags.includes(parsed.data)) return setError(`태그는 ${TAG_MAX_PER_TRANSACTION}개까지 달 수 있습니다`);
    setError(null);
    if (!tags.includes(parsed.data)) setTags([...tags, parsed.data]);
    // 추천 태그를 눌렀을 때는 입력 중인 내용을 지우지 않는다
    if (raw === tagInput) setTagInput('');
  };

  const submit = () => {
    const body = {
      type,
      amount,
      accountId: fromId ?? '',
      toAccountId: type === 'TRANSFER' ? toAccountId : null,
      categoryId: type === 'TRANSFER' ? null : categoryId,
      memo: memo.trim() || null,
      occurredAt,
      importance: type === 'EXPENSE' ? importance : null,
      // 입력해 두고 추가를 누르지 않은 태그도 함께 저장한다
      tags: type === 'EXPENSE' ? (tagInput.trim() ? [...tags, tagInput] : tags) : [],
    };
    if (!amount) return setError('금액을 입력하세요');
    const parsed = TransactionCreateSchema.safeParse(body);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    save.mutate(
      { id: initial?.id, body: parsed.data },
      {
        onSuccess: () => {
          haptic('success');
          closeModal();
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  const onDelete = () => {
    if (!initial) return;
    const run = () => remove.mutate(initial.id, { onSuccess: () => closeModal(), onError: (e) => setError(e.message) });
    if (Platform.OS === 'web') return run();
    Alert.alert('이 기록을 삭제할까요?', undefined, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: run },
    ]);
  };

  const amountColor = type === 'INCOME' ? colors.income : type === 'EXPENSE' ? colors.text : colors.textSub;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 16 }]}>
        <IconButton name="close" label="닫기" onPress={() => closeModal()} />
        <AppText variant="heading">{initial ? '기록 수정' : '새 기록'}</AppText>
        {initial ? <IconButton name="trash-outline" tone="expense" onPress={onDelete} /> : <View style={{ width: 36 }} />}
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Segmented
          value={type}
          onChange={changeType}
          options={[
            { value: 'EXPENSE', label: '지출' },
            { value: 'INCOME', label: '수입' },
            { value: 'TRANSFER', label: '이체' },
          ]}
        />
      </View>

      {/* 금액 */}
      <PressableScale onPress={() => setKeypadOpen(true)} style={styles.amountBox} withHaptic={false} scaleTo={0.98}>
        <AppText variant="caption" tone="textSub">
          {type === 'EXPENSE' ? '얼마를 썼나요?' : type === 'INCOME' ? '얼마를 받았나요?' : '얼마를 옮기나요?'}
        </AppText>
        <AppText
          variant="hero"
          style={{ color: amount ? amountColor : colors.textMuted, fontSize: 40 }}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {amount ? formatWon(amount) : '0원'}
        </AppText>
      </PressableScale>

      {keypadOpen ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={[styles.keypadWrap, { paddingBottom: insets.bottom + 12 }]}>
          <Keypad value={amount} onChange={setAmount} />
          <Button title="다음" onPress={() => setKeypadOpen(false)} disabled={!amount} style={{ marginHorizontal: 20, marginTop: 8 }} />
        </Animated.View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.details} keyboardShouldPersistTaps="handled">
            {type !== 'TRANSFER' ? (
              <Field label="카테고리">
                <Animated.View layout={LinearTransition} style={styles.catGrid}>
                  {cats.map((c) => {
                    const active = c.id === categoryId;
                    return (
                      <PressableScale
                        key={c.id}
                        onPress={() => setCategoryId(c.id)}
                        style={[styles.catItem, active && { backgroundColor: `${c.color}1F`, borderColor: c.color }]}
                        scaleTo={0.92}>
                        <CategoryIcon icon={c.icon} color={c.color} size={40} />
                        <AppText variant="caption" tone={active ? 'text' : 'textSub'} numberOfLines={1}>
                          {c.name}
                        </AppText>
                      </PressableScale>
                    );
                  })}
                </Animated.View>
              </Field>
            ) : null}

            <Field label={type === 'TRANSFER' ? '보내는 계좌' : type === 'INCOME' ? '입금 계좌' : '결제 수단'}>
              <AccountChips accounts={accountList} value={fromId} onChange={setAccountId} />
            </Field>

            {type === 'TRANSFER' && (
              <Field label="받는 계좌">
                <AccountChips accounts={accountList.filter((a) => a.id !== fromId)} value={toAccountId} onChange={setToAccountId} />
              </Field>
            )}

            <Field label="날짜">
              <View style={[styles.dateRow, { backgroundColor: colors.fill }]}>
                <IconButton name="chevron-back" onPress={() => setOccurredAt(withDateKey(occurredAt, shiftDay(dateKey, -1)))} tone="textSub" />
                <PressableScale onPress={() => Platform.OS === 'android' && setShowPicker(true)} style={styles.dateCenter}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textSub} />
                  <AppText>{formatDayLabel(dateKey)}</AppText>
                </PressableScale>
                <IconButton name="chevron-forward" onPress={() => setOccurredAt(withDateKey(occurredAt, shiftDay(dateKey, 1)))} tone="textSub" />
              </View>
              {Platform.OS === 'ios' && (
                <DateTimePicker
                  value={new Date(occurredAt)}
                  mode="date"
                  display="compact"
                  locale="ko-KR"
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                  onValueChange={(_e, d) => setOccurredAt(withDateKey(occurredAt, toLocalDateKey(d)))}
                />
              )}
              {Platform.OS === 'android' && showPicker && (
                <DateTimePicker
                  value={new Date(occurredAt)}
                  mode="date"
                  onValueChange={(_e, d) => {
                    setShowPicker(false);
                    setOccurredAt(withDateKey(occurredAt, toLocalDateKey(d)));
                  }}
                  onDismiss={() => setShowPicker(false)}
                />
              )}
            </Field>

            <Field label="시간">
              <PressableScale
                onPress={() => Platform.OS === 'android' && setShowTimePicker(true)}
                style={[styles.dateRow, styles.timeRow, { backgroundColor: colors.fill }]}
                scaleTo={0.98}>
                <Ionicons name="time-outline" size={16} color={colors.textSub} />
                <AppText>{formatTimeLabel(timeKey)}</AppText>
                {Platform.OS === 'ios' && (
                  <DateTimePicker
                    value={timePickerValue(timeKey)}
                    mode="time"
                    display="compact"
                    locale="ko-KR"
                    style={{ marginLeft: 'auto' }}
                    onValueChange={(_e, d) => setOccurredAt(withTimeKey(occurredAt, fromTimePicker(d)))}
                  />
                )}
              </PressableScale>
              {Platform.OS === 'android' && showTimePicker && (
                <DateTimePicker
                  value={timePickerValue(timeKey)}
                  mode="time"
                  onValueChange={(_e, d) => {
                    setShowTimePicker(false);
                    setOccurredAt(withTimeKey(occurredAt, fromTimePicker(d)));
                  }}
                  onDismiss={() => setShowTimePicker(false)}
                />
              )}
            </Field>

            <Field label="메모">
              <TextInput
                value={memo}
                onChangeText={setMemo}
                placeholder="어디에 썼는지 적어두면 검색이 쉬워요"
                placeholderTextColor={colors.textMuted}
                maxLength={100}
                style={[styles.memo, { backgroundColor: colors.fill, color: colors.text }]}
              />
            </Field>

            {type === 'EXPENSE' && (
              <>
                <Field label="중요도">
                  <View style={styles.tagInputRow}>
                    {IMPORTANCE_LEVELS.map((level) => (
                      <Chip key={level} label={level} active={importance === level} onPress={() => setImportance(importance === level ? null : level)} />
                    ))}
                  </View>
                </Field>

                <Field label="태그">
                  {tags.length > 0 && (
                    <View style={styles.tagWrap}>
                      {tags.map((name) => (
                        <Chip key={name} label={`#${name} ×`} active onPress={() => setTags(tags.filter((t) => t !== name))} />
                      ))}
                    </View>
                  )}
                  <View style={styles.tagInputRow}>
                    <TextInput
                      value={tagInput}
                      onChangeText={setTagInput}
                      placeholder="여행, 명절처럼 묶어 볼 이름"
                      placeholderTextColor={colors.textMuted}
                      maxLength={TAG_MAX_LENGTH + 1}
                      returnKeyType="done"
                      submitBehavior="submit"
                      onSubmitEditing={() => tagInput.trim() && addTag(tagInput)}
                      style={[styles.memo, { flex: 1, backgroundColor: colors.fill, color: colors.text }]}
                    />
                    <Chip label="추가" active={false} onPress={() => addTag(tagInput)} />
                  </View>
                  {suggestions.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
                      {suggestions.map((t) => (
                        <Chip key={t.id} label={`#${t.name}`} active={false} onPress={() => addTag(t.name)} />
                      ))}
                    </ScrollView>
                  )}
                </Field>
              </>
            )}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border }]}>
            {error && <AppText tone="expense" style={{ textAlign: 'center' }}>{error}</AppText>}
            <Button title={initial ? '수정 완료' : '저장하기'} onPress={submit} loading={save.isPending} />
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

/**
 * 시간 선택기는 기기 시간대로 시:분을 보여주므로, KST 시:분을 기기 로컬 시:분으로 옮겨 담는다.
 * 기기 시간대가 KST 가 아니어도 화면에 보이는 시간과 저장되는 KST 시간이 같아진다.
 */
function timePickerValue(time: string) {
  const [h, m] = time.split(':').map(Number);
  return new Date(2000, 0, 1, h, m);
}

function fromTimePicker(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <AppText variant="label" tone="textSub">{label}</AppText>
      {children}
    </View>
  );
}

function AccountChips({ accounts, value, onChange }: {
  accounts: { id: string; name: string; color: string }[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  if (!accounts.length) {
    return (
      <PressableScale onPress={() => router.push('/accounts')}>
        <AppText tone="primary">+ 계좌를 먼저 추가하세요</AppText>
      </PressableScale>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {accounts.map((a) => (
        <Chip key={a.id} label={a.name} active={a.id === value} onPress={() => onChange(a.id)} color={a.color} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 12 },
  amountBox: { alignItems: 'center', gap: 4, paddingVertical: 24, paddingHorizontal: 20 },
  keypadWrap: { marginTop: 'auto' },
  details: { paddingHorizontal: 20, paddingBottom: 24, gap: 24 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  catItem: {
    width: '25%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, paddingHorizontal: 6, height: 52 },
  dateCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeRow: { justifyContent: 'flex-start', gap: 6, paddingHorizontal: 16 },
  memo: { height: 52, borderRadius: 14, paddingHorizontal: 16, fontSize: 15 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
});
