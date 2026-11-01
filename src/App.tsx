import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { ConfirmHost, ToastHost } from '@/components/dialog';
import { TabBar } from '@/components/screen';
import { Loading } from '@/components/ui';
import { UpdatePrompt } from '@/components/update-prompt';
import { useAuth } from '@/lib/auth';
import { queryClient } from '@/lib/query-client';
import { useApplyTheme } from '@/theme/theme';
import AccountsPage from '@/pages/accounts';
import { LoginPage, SignupPage } from '@/pages/auth';
import BookSettingsPage from '@/pages/book-settings';
import BooksPage from '@/pages/books';
import BudgetPage from '@/pages/budget';
import BudgetEditPage from '@/pages/budget-edit';
import CategoriesPage from '@/pages/categories';
import HomePage from '@/pages/home';
import SettingsPage from '@/pages/settings';
import StatsPage from '@/pages/stats';
import { EditTransactionPage, NewTransactionPage } from '@/pages/transaction';
import TransactionsPage from '@/pages/transactions';

function TabsLayout() {
  return (
    <div className="with-tabs">
      <Outlet />
      <TabBar />
    </div>
  );
}

function Authed() {
  const status = useAuth((s) => s.status);
  return status === 'authed' ? <Outlet /> : <Navigate to="/login" replace />;
}

function Guest() {
  const status = useAuth((s) => s.status);
  return status === 'authed' ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  const status = useAuth((s) => s.status);
  const bootstrap = useAuth((s) => s.bootstrap);
  useApplyTheme();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // 공유 가계부: 홈 화면 앱으로 돌아오면 상대가 입력한 내용을 다시 불러온다
  useEffect(() => {
    const onVisible = () => focusManager.setFocused(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">
        {status === 'loading' ? (
          <Loading />
        ) : (
          <BrowserRouter>
            <Routes>
              <Route element={<Authed />}>
                <Route element={<TabsLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="transactions" element={<TransactionsPage />} />
                  <Route path="stats" element={<StatsPage />} />
                  <Route path="budget" element={<BudgetPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route path="transaction/new" element={<NewTransactionPage />} />
                <Route path="transaction/:id" element={<EditTransactionPage />} />
                <Route path="budget-edit" element={<BudgetEditPage />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="books" element={<BooksPage />} />
                <Route path="book-settings" element={<BookSettingsPage />} />
              </Route>
              <Route element={<Guest />}>
                <Route path="login" element={<LoginPage />} />
                <Route path="signup" element={<SignupPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        )}
      </div>
      <ConfirmHost />
      <ToastHost />
      <UpdatePrompt />
    </QueryClientProvider>
  );
}
