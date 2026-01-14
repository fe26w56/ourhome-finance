import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';

interface MonthSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * iOS標準のネイティブ月選択ピッカーを使用するコンポーネント
 * input type="month" を使用してiOSではホイールピッカーが表示される
 */
const MonthSelector: React.FC<MonthSelectorProps> = ({ isOpen, onClose }) => {
  const { selectedMonth, setSelectedMonth } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // isOpenがtrueになったらpickerを開く
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // 少し遅延させてからクリックイベントを発火
      setTimeout(() => {
        inputRef.current?.showPicker?.();
        inputRef.current?.click();
      }, 50);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setSelectedMonth(value);
    }
    onClose();
  };

  const handleBlur = () => {
    onClose();
  };

  return (
    <input
      ref={inputRef}
      type="month"
      value={selectedMonth}
      onChange={handleChange}
      onBlur={handleBlur}
      className="sr-only"
      aria-label="月を選択"
    />
  );
};

export default MonthSelector;
