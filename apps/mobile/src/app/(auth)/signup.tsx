import { Link } from 'expo-router';
import { useState } from 'react';
import { SignupSchema } from '@dongil/shared';
import { AuthShell } from '@/components/auth-form';
import { AppText, Button, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function SignupScreen() {
  const signup = useAuth((s) => s.signup);
  const [form, setForm] = useState({ nickname: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const submit = async () => {
    const parsed = SignupSchema.safeParse({ ...form, email: form.email.trim(), nickname: form.nickname.trim() });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setServerError(null);
    setLoading(true);
    try {
      await signup(parsed.data.email, parsed.data.password, parsed.data.nickname);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : '가입에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="반가워요!"
      subtitle="30초면 가계부가 준비돼요"
      footer={
        <>
          <AppText tone="textSub">이미 계정이 있나요?</AppText>
          <Link href="/login">
            <AppText tone="primary" style={{ fontWeight: '700' }}>
              로그인
            </AppText>
          </Link>
        </>
      }>
      <Input label="닉네임" value={form.nickname} onChangeText={set('nickname')} placeholder="홍길동" error={errors.nickname} maxLength={20} />
      <Input
        label="이메일"
        value={form.email}
        onChangeText={set('email')}
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        error={errors.email}
      />
      <Input
        label="비밀번호"
        value={form.password}
        onChangeText={set('password')}
        placeholder="8자 이상"
        secureTextEntry
        error={errors.password}
        onSubmitEditing={submit}
      />
      {serverError && <AppText tone="expense">{serverError}</AppText>}
      <Button title="시작하기" onPress={submit} loading={loading} style={{ marginTop: 8 }} />
    </AuthShell>
  );
}
