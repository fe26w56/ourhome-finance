/**
 * i18n設定ファイル
 * 多言語対応の設定を管理
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 日本語翻訳ファイル
import jaCommon from '../locales/ja/common.json';
import jaNavigation from '../locales/ja/navigation.json';
import jaTransaction from '../locales/ja/transaction.json';
import jaBudget from '../locales/ja/budget.json';
import jaReport from '../locales/ja/report.json';
import jaSettings from '../locales/ja/settings.json';
import jaAuth from '../locales/ja/auth.json';
import jaErrors from '../locales/ja/errors.json';
import jaOnboarding from '../locales/ja/onboarding.json';

// 英語翻訳ファイル
import enCommon from '../locales/en/common.json';
import enNavigation from '../locales/en/navigation.json';
import enTransaction from '../locales/en/transaction.json';
import enBudget from '../locales/en/budget.json';
import enReport from '../locales/en/report.json';
import enSettings from '../locales/en/settings.json';
import enAuth from '../locales/en/auth.json';
import enErrors from '../locales/en/errors.json';
import enOnboarding from '../locales/en/onboarding.json';

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
    onboarding: jaOnboarding,
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
    onboarding: enOnboarding,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ja',
    defaultNS: 'common',
    ns: ['common', 'navigation', 'transaction', 'budget', 'report', 'settings', 'auth', 'errors', 'onboarding'],
    interpolation: {
      escapeValue: false, // Reactは既にXSS対策されている
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'ourhome-language',
    },
    react: {
      useSuspense: false, // SSRを使わない場合はfalseが推奨
    },
  });

export default i18n;

/**
 * サポートされている言語
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]['code'];
