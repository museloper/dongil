import { Link } from 'expo-router';
import { useState } from 'react';
import { LoginSchema } from '@dongil/shared';
import { AuthShell } from '@/components/auth-form';
import { AppText, Button, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const parsed = LoginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    setLoading(true);
    try {
      await login(parsed.data.email, parsed.data.password);
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={'돈이 지나간 길,\n한눈에 보여요'}
      subtitle="로그인하고 이번 달 흐름을 확인하세요"
      footer={
        <>
          <AppText tone="textSub">처음이신가요?</AppText>
          <Link href="/signup">
            <AppText tone="primary" style={{ fontWeight: '700' }}>
              회원가입
            </AppText>
          </Link>
        </>
      }>
      <Input
        label="이메일"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Input
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        placeholder="비밀번호"
        secureTextEntry
        autoComplete="password"
        onSubmitEditing={submit}
      />
      {error && <AppText tone="expense">{error}</AppText>}
      <Button title="로그인" onPress={submit} loading={loading} style={{ marginTop: 8 }} />
    </AuthShell>
  );
}
