/**
 * ライブリージョンコンポーネント
 * スクリーンリーダーに動的な変更を通知する
 */

import React from 'react';
import { useAppStore } from '../../stores/useAppStore';

interface LiveRegionProps {
  /** アナウンスの優先度 */
  priority?: 'polite' | 'assertive';
}

/**
 * トースト通知をスクリーンリーダーに通知するコンポーネント
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({ 
  priority = 'polite' 
}) => {
  const { toast } = useAppStore();

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="live-region sr-only"
    >
      {toast?.message}
    </div>
  );
};

/**
 * カスタムアナウンス用のライブリージョン
 */
interface AnnouncerProps {
  message: string;
  priority?: 'polite' | 'assertive';
}

export const Announcer: React.FC<AnnouncerProps> = ({ 
  message, 
  priority = 'polite' 
}) => {
  return (
    <div
      role={priority === 'assertive' ? 'alert' : 'status'}
      aria-live={priority}
      aria-atomic="true"
      className="live-region sr-only"
    >
      {message}
    </div>
  );
};

/**
 * ロード状態をアナウンスするコンポーネント
 */
interface LoadingAnnouncerProps {
  isLoading: boolean;
  loadingMessage?: string;
  loadedMessage?: string;
}

export const LoadingAnnouncer: React.FC<LoadingAnnouncerProps> = ({
  isLoading,
  loadingMessage = '読み込み中...',
  loadedMessage = '読み込み完了',
}) => {
  const [announced, setAnnounced] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && announced) {
      // ロード完了時のアナウンス
      const timer = setTimeout(() => setAnnounced(false), 100);
      return () => clearTimeout(timer);
    }
    if (isLoading) {
      setAnnounced(true);
    }
  }, [isLoading, announced]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="live-region sr-only"
    >
      {isLoading ? loadingMessage : announced ? loadedMessage : ''}
    </div>
  );
};
