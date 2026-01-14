# UX拡張機能設計

## 概要

本ドキュメントでは、アプリケーションのユーザー体験を向上させる拡張機能の設計を定義します。

---

## 1. アクセシビリティ（Accessibility）

### 1.1 設計方針

WCAG 2.1 Level AA を目標とし、以下の4つの原則に基づいて実装します：

1. **知覚可能（Perceivable）**: 情報とUIコンポーネントをユーザーが知覚できる方法で提示
2. **操作可能（Operable）**: UIコンポーネントとナビゲーションを操作可能にする
3. **理解可能（Understandable）**: 情報とUIの操作を理解可能にする
4. **堅牢（Robust）**: 支援技術を含む様々なユーザーエージェントで確実に解釈できる

### 1.2 ARIA属性の実装

#### 1.2.1 ランドマーク

```tsx
// 各画面の構造
<header role="banner" aria-label="アプリヘッダー">...</header>
<main role="main" aria-label="メインコンテンツ">...</main>
<nav role="navigation" aria-label="メインナビゲーション">...</nav>
```

#### 1.2.2 インタラクティブ要素

```tsx
// ボタン
<button
  aria-label="取引を追加"
  aria-pressed={isActive}
  aria-disabled={isDisabled}
>
  <span className="material-symbols-outlined">add</span>
</button>

// モーダル/ボトムシート
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">取引を追加</h2>
  <p id="modal-description">新しい取引を入力してください</p>
</div>

// トースト通知
<div
  role="alert"
  aria-live="polite"
  aria-atomic="true"
>
  保存しました
</div>

// 進捗バー
<div
  role="progressbar"
  aria-valuenow={75}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="予算使用率"
>
  75%
</div>
```

#### 1.2.3 フォーム要素

```tsx
// 入力フィールド
<div>
  <label id="amount-label" htmlFor="amount-input">金額</label>
  <input
    id="amount-input"
    aria-labelledby="amount-label"
    aria-describedby="amount-error"
    aria-invalid={hasError}
    aria-required="true"
  />
  {hasError && (
    <span id="amount-error" role="alert">
      金額を入力してください
    </span>
  )}
</div>

// 選択グループ
<div role="group" aria-labelledby="type-label">
  <span id="type-label">種別</span>
  <button role="radio" aria-checked={isExpense}>支出</button>
  <button role="radio" aria-checked={isIncome}>収入</button>
</div>
```

#### 1.2.4 リスト・テーブル

```tsx
// 取引リスト
<ul role="list" aria-label="取引一覧">
  <li role="listitem">
    <article aria-label="食費 ¥1,500">...</article>
  </li>
</ul>

// グリッド（カレンダー）
<div role="grid" aria-label="2026年1月のカレンダー">
  <div role="row">
    <div role="columnheader">日</div>
    <div role="columnheader">月</div>
    ...
  </div>
  <div role="row">
    <div role="gridcell" aria-selected={isSelected}>1</div>
    ...
  </div>
</div>
```

### 1.3 フォーカス管理

#### 1.3.1 フォーカス順序

```tsx
// カスタムフック
function useFocusManagement() {
  const focusTrapRef = useRef<HTMLElement>(null);
  
  // モーダル開閉時のフォーカス制御
  const handleModalOpen = useCallback(() => {
    // 現在のフォーカス要素を保存
    previousFocusRef.current = document.activeElement as HTMLElement;
    // モーダル内の最初のフォーカス可能要素にフォーカス
    const firstFocusable = focusTrapRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (firstFocusable as HTMLElement)?.focus();
  }, []);

  const handleModalClose = useCallback(() => {
    // 元のフォーカス位置に戻す
    previousFocusRef.current?.focus();
  }, []);

  return { focusTrapRef, handleModalOpen, handleModalClose };
}
```

#### 1.3.2 フォーカストラップ

```tsx
// ボトムシート用フォーカストラップ
function FocusTrap({ children, isActive }: { children: ReactNode; isActive: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return <div ref={containerRef}>{children}</div>;
}
```

#### 1.3.3 スキップリンク

```tsx
// アプリのルートに配置
function SkipLinks() {
  return (
    <div className="sr-only focus:not-sr-only">
      <a href="#main-content" className="skip-link">
        メインコンテンツにスキップ
      </a>
      <a href="#main-navigation" className="skip-link">
        ナビゲーションにスキップ
      </a>
    </div>
  );
}
```

### 1.4 キーボードナビゲーション

#### 1.4.1 グローバルキーボードショートカット

| キー | 動作 |
|------|------|
| `?` | ショートカット一覧を表示 |
| `n` | 新規取引追加 |
| `h` | ホームへ移動 |
| `c` | カレンダーへ移動 |
| `r` | レポートへ移動 |
| `s` | 設定へ移動 |
| `/` | 検索にフォーカス |
| `Escape` | モーダルを閉じる |

```tsx
// グローバルキーボードフック
function useGlobalKeyboard() {
  const navigate = useNavigate();
  const { openBottomSheet } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力フィールドでは無効化
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case '?':
          openBottomSheet('shortcuts');
          break;
        case 'n':
          openBottomSheet('add');
          break;
        case 'h':
          navigate('/');
          break;
        case 'c':
          navigate('/calendar');
          break;
        case 'r':
          navigate('/reports');
          break;
        case 's':
          navigate('/settings');
          break;
        case '/':
          e.preventDefault();
          document.getElementById('search-input')?.focus();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, openBottomSheet]);
}
```

#### 1.4.2 コンポーネント別キーボード操作

```tsx
// 電卓キーパッド
function CalculatorKeypad() {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (/^[0-9]$/.test(e.key)) {
      appendDigit(e.key);
    } else if (e.key === 'Backspace') {
      deleteLastDigit();
    } else if (e.key === 'Delete') {
      clearAmount();
    } else if (e.key === 'Enter') {
      submitForm();
    }
  };

  return (
    <div
      role="group"
      aria-label="電卓キーパッド"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      ...
    </div>
  );
}

// カレンダーグリッド
function CalendarGrid() {
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        selectPreviousDay();
        break;
      case 'ArrowRight':
        selectNextDay();
        break;
      case 'ArrowUp':
        selectPreviousWeek();
        break;
      case 'ArrowDown':
        selectNextWeek();
        break;
      case 'Home':
        selectFirstDayOfMonth();
        break;
      case 'End':
        selectLastDayOfMonth();
        break;
      case 'PageUp':
        e.shiftKey ? selectPreviousYear() : selectPreviousMonth();
        break;
      case 'PageDown':
        e.shiftKey ? selectNextYear() : selectNextMonth();
        break;
      case 'Enter':
      case ' ':
        selectDate();
        break;
    }
  };

  return (
    <div role="grid" onKeyDown={handleKeyDown}>
      ...
    </div>
  );
}
```

### 1.5 コントラスト比

#### 1.5.1 カラーパレット更新

```css
/* 既存のカラーを WCAG AA 準拠に調整 */
:root {
  /* テキスト色 - コントラスト比 4.5:1 以上 */
  --text-primary: #111111;      /* 白背景で 17.9:1 */
  --text-secondary: #525252;    /* 白背景で 7.1:1（元は #6B7280 で 5.0:1） */
  --text-muted: #737373;        /* 白背景で 4.7:1 */
  
  /* アクセントカラー - テキスト用に暗め */
  --accent: #73F590;            /* 背景色として使用 */
  --accent-text: #0D6B2E;       /* 白背景で 7.3:1（ボタン内テキスト等） */
  --accent-dark: #1D9C45;       /* より視認性の高いアクセント */
  
  /* 警告・エラー色 */
  --danger: #DC2626;            /* 白背景で 5.3:1 */
  --danger-bg: #FEF2F2;         /* 薄い背景 */
  --warning: #B45309;           /* 白背景で 4.6:1（元は #F59E0B で 2.1:1） */
  --warning-bg: #FFFBEB;        /* 薄い背景 */
  --success: #059669;           /* 白背景で 4.7:1（元は #10B981 で 3.2:1） */
  --success-bg: #ECFDF5;        /* 薄い背景 */
  
  /* 非活性・プレースホルダー */
  --disabled: #A3A3A3;          /* 白背景で 3.5:1（アイコン用） */
  --placeholder: #737373;       /* 入力プレースホルダー */
}
```

#### 1.5.2 フォーカスインジケーター

```css
/* 明確なフォーカス表示 */
:focus-visible {
  outline: 2px solid var(--accent-dark);
  outline-offset: 2px;
}

/* ボタンのフォーカス */
button:focus-visible {
  box-shadow: 0 0 0 3px var(--accent);
}

/* 入力フィールドのフォーカス */
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  border-color: var(--accent-dark);
  box-shadow: 0 0 0 3px rgba(115, 245, 144, 0.3);
}
```

### 1.6 スクリーンリーダー対応

#### 1.6.1 非表示テキスト

```css
/* スクリーンリーダー専用テキスト */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

#### 1.6.2 ライブリージョン

```tsx
// 通知用コンポーネント
function LiveRegion() {
  const { toast } = useAppStore();
  
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {toast?.message}
    </div>
  );
}
```

---

## 2. UIコンポーネント標準化

### 2.1 ヘッダーコンポーネント

画面間で一貫したヘッダー体験を提供するため、共通ヘッダーコンポーネントを使用します。

#### 2.1.1 ヘッダーバリアント

| バリアント | 用途 | z-index | パディング |
|-----------|------|---------|-----------|
| `main` | メインナビ画面 | 40 | `pt-12 pb-3 px-4` |
| `sub` | サブ画面（戻るボタン付き） | 40 | `py-4 px-6` |
| `modal` | モーダル/フルスクリーン | 50 | `pt-4 pb-2 px-6` |

#### 2.1.2 共通ヘッダーコンポーネント

```tsx
// src/components/ui/Header.tsx
interface HeaderProps {
  variant: 'main' | 'sub' | 'modal';
  title?: string;
  leftElement?: 'home' | 'back' | 'close' | 'none' | React.ReactNode;
  rightElement?: React.ReactNode;
  onBack?: () => void;
  className?: string;
  children?: React.ReactNode;
}

function Header({
  variant,
  title,
  leftElement = variant === 'main' ? 'home' : 'back',
  rightElement,
  onBack,
  className,
  children,
}: HeaderProps) {
  const navigate = useNavigate();
  
  const baseStyles = 'sticky top-0 backdrop-blur-md flex items-center justify-between';
  const variantStyles = {
    main: 'z-40 bg-background-light/95 dark:bg-background-dark/95 pt-12 pb-3 px-4',
    sub: 'z-40 bg-background-light/90 dark:bg-background-dark/90 py-4 px-6',
    modal: 'z-50 bg-background-light/90 dark:bg-background-dark/90 pt-4 pb-2 px-6',
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const renderLeftElement = () => {
    if (leftElement === 'home') return <HeaderHomeButton />;
    if (leftElement === 'back') return <HeaderBackButton onClick={handleBack} />;
    if (leftElement === 'close') return <HeaderCloseButton onClick={handleBack} />;
    if (leftElement === 'none') return <div className="w-10" />;
    return leftElement;
  };

  return (
    <header className={cn(baseStyles, variantStyles[variant], className)}>
      {renderLeftElement()}
      {title && (
        <h1 className="text-base font-bold text-gray-900 dark:text-white absolute left-1/2 -translate-x-1/2">
          {title}
        </h1>
      )}
      {rightElement || <div className="w-10" />}
      {children}
    </header>
  );
}
```

#### 2.1.3 ホームボタンコンポーネント

```tsx
// src/components/ui/HeaderHomeButton.tsx
function HeaderHomeButton({ groupName, showDropdown = false, onClick }: HeaderHomeButtonProps) {
  const { currentGroup } = useAppStore();
  const displayName = groupName || currentGroup?.name || 'Our Home';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1.5 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white dark:ring-background-dark">
        {initial}
      </div>
      <span className="text-sm font-bold text-gray-900 dark:text-white">{displayName}</span>
      {showDropdown && (
        <span className="material-symbols-outlined text-[20px] text-gray-500">expand_more</span>
      )}
    </button>
  );
}
```

#### 2.1.4 戻るボタンコンポーネント

```tsx
// src/components/ui/HeaderBackButton.tsx
function HeaderBackButton({ onClick }: { onClick?: () => void }) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white transition-colors"
      aria-label="戻る"
    >
      <span className="material-symbols-outlined">arrow_back</span>
    </button>
  );
}
```

#### 2.1.5 使用例

```tsx
// メインナビ画面（Reports）
function Reports() {
  return (
    <div>
      <Header variant="main" title="Reports" />
      <main>...</main>
    </div>
  );
}

// サブ画面（Budget）
function Budget() {
  return (
    <div>
      <Header variant="sub" title="Budget" />
      <main>...</main>
    </div>
  );
}

// モーダル画面（AddTransaction）
function AddTransaction() {
  const navigate = useNavigate();
  
  return (
    <div>
      <Header 
        variant="modal" 
        title="Add Transaction"
        leftElement="close"
        rightElement={<button>Reset</button>}
        onBack={() => navigate(-1)}
      />
      <main>...</main>
    </div>
  );
}
```

#### 2.1.6 画面別適用マッピング

| 画面 | バリアント | 左側要素 | タイトル | 右側要素 |
|------|-----------|---------|---------|---------|
| Home | main | home | - (月表示) | 検索+通知 |
| Calendar | main | home | - (月ナビ) | 検索 |
| Reports | main | home | "Reports" | - |
| Settings | main | home + dropdown | "Settings" | - |
| AddTransaction | modal | close | "Add Transaction" | Reset |
| History | sub | - | - (検索バー) | フィルター |
| Budget | sub | back | "Budget" | - |
| Goals | main | home | "Goals" | 追加ボタン |
| Settlement | sub | back | "Settlement" | - |

---

## 3. 多言語対応（i18n）

### 3.1 技術選定

- **ライブラリ**: react-i18next + i18next
- **翻訳ファイル形式**: JSON
- **サポート言語**: 日本語（ja）、英語（en）

### 3.2 ディレクトリ構成

```
src/
├── locales/
│   ├── ja/
│   │   ├── common.json       # 共通テキスト
│   │   ├── navigation.json   # ナビゲーション
│   │   ├── transaction.json  # 取引関連
│   │   ├── budget.json       # 予算関連
│   │   ├── report.json       # レポート関連
│   │   ├── settings.json     # 設定関連
│   │   ├── auth.json         # 認証関連
│   │   └── errors.json       # エラーメッセージ
│   └── en/
│       ├── common.json
│       ├── navigation.json
│       ├── transaction.json
│       ├── budget.json
│       ├── report.json
│       ├── settings.json
│       ├── auth.json
│       └── errors.json
└── lib/
    └── i18n.ts               # 設定ファイル
```

### 3.3 設定ファイル

```typescript
// src/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 翻訳リソースのインポート
import jaCommon from '../locales/ja/common.json';
import jaNavigation from '../locales/ja/navigation.json';
import jaTransaction from '../locales/ja/transaction.json';
import jaBudget from '../locales/ja/budget.json';
import jaReport from '../locales/ja/report.json';
import jaSettings from '../locales/ja/settings.json';
import jaAuth from '../locales/ja/auth.json';
import jaErrors from '../locales/ja/errors.json';

import enCommon from '../locales/en/common.json';
import enNavigation from '../locales/en/navigation.json';
import enTransaction from '../locales/en/transaction.json';
import enBudget from '../locales/en/budget.json';
import enReport from '../locales/en/report.json';
import enSettings from '../locales/en/settings.json';
import enAuth from '../locales/en/auth.json';
import enErrors from '../locales/en/errors.json';

const resources = {
  ja: {
    common: jaCommon,
    navigation: jaNavigation,
    transaction: jaTransaction,
    budget: jaBudget,
    report: jaReport,
    settings: jaSettings,
    auth: jaAuth,
    errors: jaErrors,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    transaction: enTransaction,
    budget: enBudget,
    report: enReport,
    settings: enSettings,
    auth: enAuth,
    errors: enErrors,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ja',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
```

### 3.4 翻訳ファイル例

```json
// locales/ja/common.json
{
  "app": {
    "name": "OurHome Finance",
    "tagline": "二人のためのかんたん家計簿"
  },
  "actions": {
    "save": "保存",
    "cancel": "キャンセル",
    "delete": "削除",
    "edit": "編集",
    "add": "追加",
    "close": "閉じる",
    "confirm": "確認",
    "search": "検索",
    "filter": "フィルター",
    "reset": "リセット",
    "apply": "適用",
    "export": "エクスポート",
    "copy": "コピー"
  },
  "date": {
    "today": "今日",
    "yesterday": "昨日",
    "thisMonth": "今月",
    "lastMonth": "先月"
  },
  "currency": {
    "JPY": "¥{{amount, number}}",
    "format": "{{amount, currency}}"
  },
  "validation": {
    "required": "この項目は必須です",
    "invalidAmount": "有効な金額を入力してください",
    "mismatchTotal": "合計金額が一致しません"
  }
}

// locales/en/common.json
{
  "app": {
    "name": "OurHome Finance",
    "tagline": "Simple finance tracking for two"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "add": "Add",
    "close": "Close",
    "confirm": "Confirm",
    "search": "Search",
    "filter": "Filter",
    "reset": "Reset",
    "apply": "Apply",
    "export": "Export",
    "copy": "Copy"
  },
  "date": {
    "today": "Today",
    "yesterday": "Yesterday",
    "thisMonth": "This Month",
    "lastMonth": "Last Month"
  },
  "currency": {
    "JPY": "¥{{amount, number}}",
    "format": "{{amount, currency}}"
  },
  "validation": {
    "required": "This field is required",
    "invalidAmount": "Please enter a valid amount",
    "mismatchTotal": "Total amount does not match"
  }
}
```

```json
// locales/ja/transaction.json
{
  "title": "取引",
  "addNew": "取引を追加",
  "edit": "取引を編集",
  "type": {
    "expense": "支出",
    "income": "収入"
  },
  "fields": {
    "amount": "金額",
    "date": "日付",
    "category": "カテゴリ",
    "memo": "メモ",
    "paidBy": "支払った人",
    "shared": "共有",
    "personal": "個人"
  },
  "split": {
    "title": "負担方法",
    "equal": "均等",
    "percentage": "割合",
    "amount": "金額指定"
  },
  "messages": {
    "saved": "取引を保存しました",
    "deleted": "取引を削除しました",
    "confirmDelete": "この取引を削除しますか？"
  },
  "empty": {
    "title": "取引がありません",
    "description": "最初の取引を追加してください"
  }
}
```

### 3.5 使用方法

```tsx
// コンポーネントでの使用
import { useTranslation } from 'react-i18next';

function AddTransaction() {
  const { t } = useTranslation(['transaction', 'common']);
  
  return (
    <div>
      <h1>{t('transaction:addNew')}</h1>
      
      <label>{t('transaction:fields.amount')}</label>
      <input placeholder={t('common:currency.JPY', { amount: 0 })} />
      
      <button type="submit">{t('common:actions.save')}</button>
      <button type="button">{t('common:actions.cancel')}</button>
    </div>
  );
}

// 日付フォーマット
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';

function DateDisplay({ date }: { date: Date }) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'ja' ? ja : enUS;
  
  return <span>{format(date, 'PPP', { locale })}</span>;
}

// 金額フォーマット
function AmountDisplay({ amount }: { amount: number }) {
  const { i18n } = useTranslation();
  
  return (
    <span>
      {new Intl.NumberFormat(i18n.language, {
        style: 'currency',
        currency: 'JPY',
      }).format(amount)}
    </span>
  );
}
```

### 3.6 言語切り替えUI

```tsx
// 設定画面内の言語切り替えコンポーネント
function LanguageSelector() {
  const { i18n, t } = useTranslation('settings');
  
  const languages = [
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    // ユーザー設定に保存
    localStorage.setItem('language', langCode);
  };

  return (
    <div>
      <h3>{t('language.title')}</h3>
      <div className="flex flex-col gap-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`px-4 py-3 rounded-xl ${
              i18n.language === lang.code
                ? 'bg-primary text-black'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## 4. サポート・ヘルプ機能

### 4.1 構成

```
src/
├── screens/
│   └── help/
│       ├── HelpCenter.tsx    # ヘルプセンタートップ
│       ├── GettingStarted.tsx # 使い方ガイド
│       ├── FAQ.tsx           # よくある質問
│       └── Contact.tsx       # 問い合わせフォーム
└── components/
    └── help/
        ├── HelpCard.tsx      # ヘルプカード
        ├── FAQAccordion.tsx  # FAQ アコーディオン
        └── ContactForm.tsx   # 問い合わせフォーム
```

### 4.2 使い方ガイド

#### 4.2.1 コンテンツ構成

```typescript
interface GuideSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  steps: GuideStep[];
}

interface GuideStep {
  id: string;
  title: string;
  description: string;
  image?: string;
  tip?: string;
}

const gettingStartedSections: GuideSection[] = [
  {
    id: 'first-transaction',
    title: '最初の取引を記録',
    description: '10秒で取引を記録する方法',
    icon: 'add_circle',
    steps: [
      {
        id: 'step-1',
        title: '＋ボタンをタップ',
        description: '画面下部の緑色の＋ボタンをタップします',
        tip: 'どの画面からでも＋ボタンは表示されています',
      },
      {
        id: 'step-2',
        title: '金額を入力',
        description: '電卓で金額を入力します',
      },
      {
        id: 'step-3',
        title: 'カテゴリを選択',
        description: 'よく使うカテゴリは上部に表示されます',
      },
      {
        id: 'step-4',
        title: '保存',
        description: '保存ボタンをタップして完了',
      },
    ],
  },
  {
    id: 'split-expenses',
    title: '割り勘・立替の記録',
    description: '二人の負担を正確に記録',
    icon: 'group',
    steps: [
      // ...
    ],
  },
  {
    id: 'budget-setup',
    title: '予算を設定',
    description: '月の支出をコントロール',
    icon: 'savings',
    steps: [
      // ...
    ],
  },
  {
    id: 'settlement',
    title: '精算する',
    description: '立替金を清算',
    icon: 'payments',
    steps: [
      // ...
    ],
  },
];
```

#### 4.2.2 ガイド画面コンポーネント

```tsx
function GettingStarted() {
  const { t } = useTranslation('help');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-28">
      <header>
        <h1>{t('guide.title')}</h1>
      </header>

      <main className="px-4 py-4">
        <div className="flex flex-col gap-4">
          {gettingStartedSections.map((section) => (
            <GuideCard
              key={section.id}
              section={section}
              isExpanded={activeSection === section.id}
              onToggle={() =>
                setActiveSection(
                  activeSection === section.id ? null : section.id
                )
              }
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function GuideCard({ section, isExpanded, onToggle }) {
  return (
    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">
              {section.icon}
            </span>
          </div>
          <div className="text-left">
            <h3 className="font-bold">{section.title}</h3>
            <p className="text-sm text-gray-500">{section.description}</p>
          </div>
        </div>
        <span className="material-symbols-outlined text-gray-400">
          {isExpanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {section.steps.map((step, index) => (
            <div key={step.id} className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-black text-sm font-bold flex items-center justify-center">
                {index + 1}
              </div>
              <div>
                <h4 className="font-medium">{step.title}</h4>
                <p className="text-sm text-gray-500">{step.description}</p>
                {step.tip && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                    💡 {step.tip}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4.3 FAQ

#### 4.3.1 FAQ データ構造

```typescript
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'transaction' | 'budget' | 'settlement' | 'account';
  keywords: string[];
}

const faqItems: FAQItem[] = [
  {
    id: 'faq-1',
    question: '取引を間違えて登録しました。修正できますか？',
    answer: '取引一覧から対象の取引をタップすると編集画面が開きます。金額、カテゴリ、日付などを修正して保存してください。',
    category: 'transaction',
    keywords: ['修正', '編集', '間違い', '変更'],
  },
  {
    id: 'faq-2',
    question: '精算とは何ですか？',
    answer: '精算は、立替えた金額を清算することです。例えば、あなたが払った食費をパートナーと折半した場合、パートナーがあなたに支払う必要があります。精算機能では、この残高を管理し、実際に清算を記録できます。',
    category: 'settlement',
    keywords: ['精算', '立替', '清算', '割り勘'],
  },
  {
    id: 'faq-3',
    question: '予算を超えたらどうなりますか？',
    answer: '予算を超えると、ホーム画面とレポート画面に警告が表示されます。80%で黄色、100%超で赤色の表示になります。取引の登録自体は制限されません。',
    category: 'budget',
    keywords: ['予算', '超過', '警告', 'アラート'],
  },
  {
    id: 'faq-4',
    question: 'パートナーを招待するにはどうすればよいですか？',
    answer: '設定 > メンバー招待 から招待コードまたは招待リンクを取得できます。パートナーにリンクを共有すると、同じグループに参加できます。',
    category: 'account',
    keywords: ['招待', 'パートナー', 'グループ', '参加'],
  },
  {
    id: 'faq-5',
    question: 'データをバックアップできますか？',
    answer: 'データはクラウドに自動保存されています。手動でCSVエクスポートすることも可能です。設定 > エクスポート から期間を選んでダウンロードしてください。',
    category: 'general',
    keywords: ['バックアップ', 'エクスポート', '保存', 'CSV'],
  },
];
```

#### 4.3.2 FAQ 画面コンポーネント

```tsx
function FAQ() {
  const { t } = useTranslation('help');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = [
    { id: 'general', label: t('faq.categories.general'), icon: 'help' },
    { id: 'transaction', label: t('faq.categories.transaction'), icon: 'receipt' },
    { id: 'budget', label: t('faq.categories.budget'), icon: 'savings' },
    { id: 'settlement', label: t('faq.categories.settlement'), icon: 'payments' },
    { id: 'account', label: t('faq.categories.account'), icon: 'person' },
  ];

  const filteredFAQs = faqItems.filter((item) => {
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keywords.some((k) => k.includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-28">
      <header>
        <h1>{t('faq.title')}</h1>
      </header>

      <main className="px-4 py-4">
        {/* 検索バー */}
        <div className="mb-4">
          <input
            type="text"
            placeholder={t('faq.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface-light dark:bg-surface-dark"
          />
        </div>

        {/* カテゴリフィルター */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              !selectedCategory ? 'bg-primary text-black' : 'bg-gray-100 dark:bg-gray-800'
            }`}
          >
            {t('faq.allCategories')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1 ${
                selectedCategory === cat.id ? 'bg-primary text-black' : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <span className="material-symbols-outlined text-base">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ リスト */}
        <div className="space-y-3">
          {filteredFAQs.map((item) => (
            <FAQAccordion
              key={item.id}
              item={item}
              isExpanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          ))}
        </div>

        {filteredFAQs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {t('faq.noResults')}
          </div>
        )}
      </main>
    </div>
  );
}
```

### 4.4 問い合わせフォーム

#### 4.4.1 フォームデータ構造

```typescript
interface ContactFormData {
  category: 'bug' | 'feature' | 'question' | 'other';
  subject: string;
  message: string;
  email?: string;
  attachments?: File[];
}

const contactCategories = [
  { id: 'bug', label: '不具合の報告', icon: 'bug_report' },
  { id: 'feature', label: '機能のリクエスト', icon: 'lightbulb' },
  { id: 'question', label: '質問', icon: 'help' },
  { id: 'other', label: 'その他', icon: 'more_horiz' },
];
```

#### 4.4.2 問い合わせフォームコンポーネント

```tsx
function ContactForm() {
  const { t } = useTranslation('help');
  const { user } = useAuthStore();
  const { showToast } = useAppStore();
  
  const [formData, setFormData] = useState<ContactFormData>({
    category: 'question',
    subject: '',
    message: '',
    email: user?.email || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Supabaseのedge functionまたは外部サービス（SendGrid等）に送信
      await submitContactForm(formData);
      showToast(t('contact.successMessage'), 'success');
      // フォームリセット
      setFormData({
        category: 'question',
        subject: '',
        message: '',
        email: user?.email || '',
      });
    } catch (error) {
      showToast(t('contact.errorMessage'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-28">
      <header>
        <h1>{t('contact.title')}</h1>
        <p className="text-sm text-gray-500">{t('contact.description')}</p>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {/* カテゴリ選択 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('contact.fields.category')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {contactCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFormData({ ...formData, category: cat.id as any })}
                className={`p-3 rounded-xl flex items-center gap-2 ${
                  formData.category === cat.id
                    ? 'bg-primary text-black'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <span className="material-symbols-outlined">{cat.icon}</span>
                <span className="text-sm">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 件名 */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium mb-2">
            {t('contact.fields.subject')}
          </label>
          <input
            id="subject"
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800"
            required
          />
        </div>

        {/* メッセージ */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2">
            {t('contact.fields.message')}
          </label>
          <textarea
            id="message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 h-32 resize-none"
            required
          />
        </div>

        {/* メールアドレス */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            {t('contact.fields.email')} ({t('common:optional')})
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800"
            placeholder={t('contact.emailPlaceholder')}
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('contact.emailNote')}
          </p>
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl bg-primary text-black font-medium disabled:opacity-50"
        >
          {isSubmitting ? t('contact.submitting') : t('contact.submit')}
        </button>
      </form>
    </div>
  );
}
```

### 4.5 ヘルプセンタートップ

```tsx
function HelpCenter() {
  const { t } = useTranslation('help');
  const navigate = useNavigate();

  const helpSections = [
    {
      id: 'guide',
      title: t('sections.guide.title'),
      description: t('sections.guide.description'),
      icon: 'school',
      path: '/help/guide',
    },
    {
      id: 'faq',
      title: t('sections.faq.title'),
      description: t('sections.faq.description'),
      icon: 'quiz',
      path: '/help/faq',
    },
    {
      id: 'contact',
      title: t('sections.contact.title'),
      description: t('sections.contact.description'),
      icon: 'mail',
      path: '/help/contact',
    },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-28">
      <header className="px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-gray-500 mt-1">{t('subtitle')}</p>
      </header>

      <main className="px-4">
        <div className="flex flex-col gap-4">
          {helpSections.map((section) => (
            <button
              key={section.id}
              onClick={() => navigate(section.path)}
              className="p-4 bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center gap-4 text-left hover:border-primary transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary">
                  {section.icon}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold">{section.title}</h3>
                <p className="text-sm text-gray-500">{section.description}</p>
              </div>
              <span className="material-symbols-outlined text-gray-400">
                chevron_right
              </span>
            </button>
          ))}
        </div>

        {/* クイックアクセス */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-4">{t('quickAccess.title')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickHelpCard
              icon="add_circle"
              title={t('quickAccess.addTransaction')}
              onClick={() => navigate('/help/guide#first-transaction')}
            />
            <QuickHelpCard
              icon="group"
              title={t('quickAccess.invitePartner')}
              onClick={() => navigate('/help/faq#invite')}
            />
            <QuickHelpCard
              icon="payments"
              title={t('quickAccess.settlement')}
              onClick={() => navigate('/help/guide#settlement')}
            />
            <QuickHelpCard
              icon="download"
              title={t('quickAccess.export')}
              onClick={() => navigate('/help/faq#export')}
            />
          </div>
        </div>

        {/* アプリバージョン */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>OurHome Finance v1.0.0</p>
        </div>
      </main>
    </div>
  );
}
```

---

## 5. 実装優先度

| 機能 | 優先度 | 工数目安 | 備考 |
|------|--------|----------|------|
| アクセシビリティ - ARIA属性 | 高 | 2-3日 | 基本的なARIA属性の追加 |
| アクセシビリティ - キーボード操作 | 中 | 2日 | フォーカス管理、ショートカット |
| アクセシビリティ - コントラスト | 高 | 1日 | カラー調整 |
| 多言語対応 - 基盤 | 中 | 1日 | i18next設定 |
| 多言語対応 - 翻訳ファイル | 中 | 2-3日 | 全画面の翻訳 |
| 多言語対応 - 言語切替UI | 低 | 0.5日 | 設定画面に追加 |
| ヘルプ - 使い方ガイド | 中 | 1-2日 | コンテンツ作成含む |
| ヘルプ - FAQ | 中 | 1日 | コンテンツ作成含む |
| ヘルプ - 問い合わせ | 低 | 1日 | バックエンド連携含む |

---

*最終更新: 2026年1月*
