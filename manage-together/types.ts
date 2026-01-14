export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP'
}

export enum GroupType {
  NEW = 'NEW',
  EXISTING = 'EXISTING'
}

export enum ProfileView {
  SHARED = 'SHARED',
  PERSONAL = 'PERSONAL'
}

export interface UserProfile {
  name: string;
  avatarUrl?: string;
  defaultView: ProfileView;
}

export interface GroupSettings {
  name: string;
  currency: Currency;
  type: GroupType;
}
