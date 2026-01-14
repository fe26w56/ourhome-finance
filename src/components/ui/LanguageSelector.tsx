/**
 * 言語切り替えコンポーネント
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../lib/i18n';

interface LanguageSelectorProps {
  /** コンパクト表示モード */
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  compact = false 
}) => {
  const { i18n, t } = useTranslation('settings');

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    // localStorageへの保存はi18nextが自動で行う
  };

  if (compact) {
    // コンパクト表示（ドロップダウン風）
    return (
      <div className="flex gap-2">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              i18n.language === lang.code
                ? 'bg-primary text-black'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            aria-pressed={i18n.language === lang.code}
            aria-label={`${lang.name}に切り替え`}
          >
            {lang.flag} {lang.code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  // フル表示（設定画面用）
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{t('language.title')}</h3>
      <div className="flex flex-col gap-2">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`w-full px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${
              i18n.language === lang.code
                ? 'bg-primary text-black'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            aria-pressed={i18n.language === lang.code}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
            </div>
            {i18n.language === lang.code && (
              <span className="material-symbols-outlined text-xl">check</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * ヘッダー用の言語切り替えボタン（シンプル版）
 */
export const LanguageToggle: React.FC = () => {
  const { i18n } = useTranslation();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'ja' ? 'en' : 'ja';
    i18n.changeLanguage(newLang);
  };

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language);

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="言語を切り替え"
    >
      <span className="text-sm">{currentLang?.flag}</span>
      <span className="text-xs font-medium">{currentLang?.code.toUpperCase()}</span>
    </button>
  );
};
