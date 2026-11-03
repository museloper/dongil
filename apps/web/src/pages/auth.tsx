import { useState } from 'react';
import { Link } from 'react-router';
import { LoginSchema, SignupSchema } from '@dongil/shared';
import { AuthShell } from '@/components/auth-shell';
import { AppText, Button, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export function LoginPage() {
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
      onSubmit={submit}
      footer={
        <>
          <AppText tone="textSub">처음이신가요?</AppText>
          <Link to="/signup" className="link">회원가입</Link>
        </>
      }>
      <Input label="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoCapitalize="none" />
      <Input label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" autoComplete="current-password" />
      {error && <AppText tone="expense" role="alert">{error}</AppText>}
      <Button title="로그인" type="submit" loading={loading} style={{ marginTop: 8 }} />
    </AuthShell>
  );
}

export function SignupPage() {
  const signup = useAuth((s) => s.signup);
  const [form, setForm] = useState({ nickname: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

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
      onSubmit={submit}
      footer={
        <>
          <AppText tone="textSub">이미 계정이 있나요?</AppText>
          <Link to="/login" className="link">로그인</Link>
        </>
      }>
      <Input label="닉네임" value={form.nickname} onChange={set('nickname')} placeholder="홍길동" error={errors.nickname} maxLength={20} autoComplete="nickname" />
      <Input label="이메일" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" error={errors.email} autoComplete="email" autoCapitalize="none" />
      <Input label="비밀번호" type="password" value={form.password} onChange={set('password')} placeholder="8자 이상" error={errors.password} autoComplete="new-password" />
      {serverError && <AppText tone="expense" role="alert">{serverError}</AppText>}
      <Button title="시작하기" type="submit" loading={loading} style={{ marginTop: 8 }} />
    </AuthShell>
  );
}
