import React from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';

// i18n設定
import './src/lib/i18n';

// 画面コンポーネント
import Home from './screens/Home';
import AddTransaction from './screens/AddTransaction';
import History from './screens/History';
import Settlement from './screens/Settlement';
import Calendar from './screens/Calendar';
import Reports from './screens/Reports';
import Budget from './screens/Budget';
import Settings from './screens/Settings';
import Goals from './screens/Goals';
import CategoryManagement from './src/screens/CategoryManagement';
import BottomNav from './components/BottomNav';
import Welcome from './src/screens/onboarding/Welcome';
import CreateGroup from './src/screens/onboarding/CreateGroup';
import JoinGroup from './src/screens/onboarding/JoinGroup';
import ProfileSetup from './src/screens/onboarding/ProfileSetup';
import CategoryTemplate from './src/screens/onboarding/CategoryTemplate';
import { Login } from './src/screens/auth/Login';
import { Signup } from './src/screens/auth/Signup';
import { ForgotPassword } from './src/screens/auth/ForgotPassword';
import { AuthCallback } from './src/screens/auth/AuthCallback';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ProtectedRoute } from './src/components/ProtectedRoute';

// フック
import { useRealtime } from './src/hooks/useRealtime';
import { useAppStore } from './src/stores/useAppStore';
import { useAuth } from './src/hooks/useAuth';
import { useOnlineStatus } from './src/hooks/useOnlineStatus';
import { useGlobalKeyboard } from './src/hooks/useGlobalKeyboard';
import { useAuthStore } from './src/stores/useAuthStore';

// アクセシビリティコンポーネント
import { SkipLinks, LiveRegion, ShortcutsHelp } from './src/components/accessibility';
import { OfflineBanner } from './src/components/ui/OfflineBanner';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { currentGroupId, selectedMonth } = useAppStore();
  const { session, isLoading: authLoading } = useAuthStore();
  
  // 認証状態の監視を開始（これがないとisLoadingが常にtrueのまま）
  useAuth();
  
  // オンライン状態監視
  useOnlineStatus();
  
  // グローバルキーボードショートカット
  const { isShortcutsHelpOpen, closeShortcutsHelp } = useGlobalKeyboard();
  
  // リアルタイム同期を有効化
  // フックは常に呼び出し、groupIdが空の場合はフック内部でスキップされる
  useRealtime(currentGroupId || '', selectedMonth || '');
  
  // ルート判定
  const onboardingRoutes = ['/onboarding', '/onboarding/group-setup', '/onboarding/join-group', '/onboarding/profile-setup', '/onboarding/template-selection'];
  const authRoutes = ['/auth'];
  const isOnboardingRoute = onboardingRoutes.some(route => location.pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => location.pathname.startsWith(route));
  const isMainApp = !isOnboardingRoute && !isAuthRoute;
  
  // 認証ローディング中はローディング画面を表示（認証ルートとオンボーディングルートを除く）
  if (authLoading && !isAuthRoute && !isOnboardingRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-[#73F590] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }
  
  // 認証チェック: 認証ルート以外で未認証の場合はログインへリダイレクト
  if (!authLoading && !session && !isAuthRoute && !isOnboardingRoute) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  
  // Hide bottom nav on specific full-screen or modal-like routes
  const hideNavRoutes = ['/add', '/settlement'];
  const showNav = !hideNavRoutes.includes(location.pathname) && isMainApp;

  return (
    <>
      {/* スキップリンク（アクセシビリティ） */}
      <SkipLinks />
      
      {/* オフラインバナー */}
      <OfflineBanner />
      
      {/* メインコンテンツ */}
      <main id="main-content" role="main">
        {children}
      </main>
      
      {/* ナビゲーション */}
      {showNav && (
        <nav id="main-navigation" role="navigation" aria-label="メインナビゲーション">
          <BottomNav />
        </nav>
      )}
      
      {/* ライブリージョン（トースト通知用） */}
      <LiveRegion />
      
      {/* ショートカットヘルプモーダル */}
      <ShortcutsHelp 
        isOpen={isShortcutsHelpOpen} 
        onClose={closeShortcutsHelp} 
      />
    </>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Auth Routes - 公開ルート */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Onboarding Routes - 保護ルート（グループ不要） */}
        <Route path="/onboarding" element={
          <ProtectedRoute requireGroup={false}>
            <Welcome />
          </ProtectedRoute>
        } />
        <Route path="/onboarding/group-setup" element={
          <ProtectedRoute requireGroup={false}>
            <CreateGroup />
          </ProtectedRoute>
        } />
        <Route path="/onboarding/join-group" element={
          <ProtectedRoute requireGroup={false}>
            <JoinGroup />
          </ProtectedRoute>
        } />
        <Route path="/onboarding/profile-setup" element={
          <ProtectedRoute requireGroup={false}>
            <ProfileSetup />
          </ProtectedRoute>
        } />
        <Route path="/onboarding/template-selection" element={
          <ProtectedRoute requireGroup={false}>
            <CategoryTemplate />
          </ProtectedRoute>
        } />
        
        {/* Main App Routes - 保護ルート（グループ必須） */}
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/add" element={
          <ProtectedRoute>
            <AddTransaction />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        } />
        <Route path="/settlement" element={
          <ProtectedRoute>
            <Settlement />
          </ProtectedRoute>
        } />
        <Route path="/calendar" element={
          <ProtectedRoute>
            <Calendar />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="/budget" element={
          <ProtectedRoute>
            <Budget />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/goals" element={
          <ProtectedRoute>
            <Goals />
          </ProtectedRoute>
        } />
        <Route path="/categories" element={
          <ProtectedRoute>
            <CategoryManagement />
          </ProtectedRoute>
        } />
      </Routes>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <Layout>
            <AnimatedRoutes />
          </Layout>
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
