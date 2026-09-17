export type PawActionType = 
  | 'account_created'
  | 'passport_completed'
  | 'community_joined'
  | 'event_attended'
  | 'mission_completed'
  | 'surprise_paw'
  | 'redeem_digital'
  | 'redeem_coupon'
  | 'admin_adjustment';

export interface PawTransaction {
  id: string;
  userId: string;
  action: PawActionType;
  amount: number; // Positivo para ganar, negativo para canjear
  balanceAfter: number;
  referenceId?: string; // ID de junta, medalla, tienda o canje
  description: string;
  createdAt: any;
}

export type SurprisePawRarity = 'normal' | 'especial' | 'dorada' | 'legendaria';

export interface SurprisePawReward {
  rarity: SurprisePawRarity;
  pawsAmount: number;
  title: string;
  message: string;
  colorHex: string;
  exclusiveBadgeId?: string;
}

export type BadgeCategory = 'permanente' | 'evento_exclusivo' | 'explorador' | 'comunidad';

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconName: string;
  imageUrl?: string;
  category: BadgeCategory;
  pawsReward: number;
  eventId?: string;
}

export type RewardType = 'digital' | 'comercial';

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  type: RewardType;
  pawsCost: number;
  originalPriceCLP?: number;
  imageUrl: string;
  businessId?: string;
  businessName?: string;
  stockAvailable?: number;
  expiresAt?: any;
  digitalType?: 'marco' | 'fondo' | 'titulo' | 'sticker';
  status?: 'active' | 'paused' | 'sold_out';
  createdAt?: any;
}

export interface RewardRedemption {
  id: string;
  rewardId: string;
  rewardTitle: string;
  rewardType: RewardType;
  userId: string;
  userName: string;
  businessId?: string;
  uniqueCode: string; // Código alfanumérico único de 6 caracteres
  qrPayload: string;
  status: 'active' | 'used' | 'expired';
  pawsSpent: number;
  createdAt: any;
  usedAt?: any;
  validatedByBusinessUserId?: string;
}
