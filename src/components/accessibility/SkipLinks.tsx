/**
 * スキップリンクコンポーネント
 * キーボードユーザーがメインコンテンツに素早くアクセスできるようにする
 */

import React from 'react';

interface SkipLink {
  href: string;
  label: string;
}

const DEFAULT_SKIP_LINKS: SkipLink[] = [
  { href: '#main-content', label: 'メインコンテンツにスキップ' },
  { href: '#main-navigation', label: 'ナビゲーションにスキップ' },
];

interface SkipLinksProps {
  links?: SkipLink[];
}

export const SkipLinks: React.FC<SkipLinksProps> = ({ 
  links = DEFAULT_SKIP_LINKS 
}) => {
  return (
    <nav aria-label="スキップリンク" className="sr-only focus-within:not-sr-only">
      <ul className="list-none m-0 p-0">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="skip-link"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
