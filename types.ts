export interface Transaction {
  id: string;
  title: string;
  subtitle?: string;
  amount: number;
  date: string; // ISO date or "Today"
  category: string;
  type: 'expense' | 'income';
  isShared: boolean;
  memberInitials?: string; // J, S, etc.
  memberColor?: string; // Tailwind color class part e.g. "indigo"
  icon: string;
  iconColorClass?: string;
  time?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  colorClass: string;
  budget?: number;
  spent?: number;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}
