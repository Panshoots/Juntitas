import { 
  PawTransaction, 
  PawActionType, 
  SurprisePawReward, 
  RewardItem,
  RewardRedemption
} from '../models/Gamification';
import { mockCurrentUser, mockRewards } from '../mock/mockData';

const DAILY_PAW_LIMIT = 150;

export const PAW_ACTION_AMOUNTS: Record<PawActionType, number> = {
  account_created: 50,
  passport_completed: 30,
  community_joined: 10,
  event_attended: 100,
  mission_completed: 40,
  surprise_paw: 0,
  redeem_digital: 0,
  redeem_coupon: 0,
  admin_adjustment: 0,
};

// Historial en memoria de transacciones
const inMemoryTransactions: PawTransaction[] = [];

export const getPawBalance = (): number => {
  return mockCurrentUser.pawBalance;
};

export const awardPaws = async (
  userId: string, 
  action: PawActionType, 
  referenceId?: string, 
  customAmount?: number,
  descriptionText?: string
): Promise<{ success: boolean; amountAwarded: number; newBalance: number; message: string }> => {
  const amountToAward = customAmount !== undefined ? customAmount : PAW_ACTION_AMOUNTS[action];

  if (amountToAward <= 0) {
    return { 
      success: false, 
      amountAwarded: 0, 
      newBalance: mockCurrentUser.pawBalance, 
      message: 'La cantidad debe ser mayor a 0' 
    };
  }

  mockCurrentUser.pawBalance += amountToAward;

  const tx: PawTransaction = {
    id: 'tx-' + Date.now(),
    userId,
    action,
    amount: amountToAward,
    balanceAfter: mockCurrentUser.pawBalance,
    referenceId,
    description: descriptionText || ('Huellitas obtenidas por ' + action),
    createdAt: new Date()
  };
  inMemoryTransactions.push(tx);

  return { 
    success: true, 
    amountAwarded: amountToAward, 
    newBalance: mockCurrentUser.pawBalance, 
    message: '¡Ganaste +' + amountToAward + ' Huellitas!' 
  };
};

export const rollSurprisePaw = (): SurprisePawReward => {
  const rand = Math.random() * 100;

  if (rand < 2) {
    const paws = Math.floor(Math.random() * 51) + 100;
    return {
      rarity: 'legendaria',
      pawsAmount: paws,
      title: '¡HUELLA LEGENDARIA!',
      message: '¡Increíble hallazgo! Has encontrado una mítica huella dorada brillante.',
      colorHex: '#9B51E0'
    };
  } else if (rand < 10) {
    const paws = Math.floor(Math.random() * 21) + 40;
    return {
      rarity: 'dorada',
      pawsAmount: paws,
      title: '¡Huella Dorada!',
      message: '¡Qué gran suerte! Tu perrito descubrió una huella de oro.',
      colorHex: '#F2C94C'
    };
  } else if (rand < 30) {
    const paws = Math.floor(Math.random() * 11) + 15;
    return {
      rarity: 'especial',
      pawsAmount: paws,
      title: '¡Huella Plateada!',
      message: '¡Excelente! Una huella brillante ha aparecido en tu camino.',
      colorHex: '#4A90E2'
    };
  } else {
    const paws = Math.floor(Math.random() * 6) + 5;
    return {
      rarity: 'normal',
      pawsAmount: paws,
      title: '¡Huella Sorpresa!',
      message: 'Has recogido una linda huellita explorando la app.',
      colorHex: '#27AE60'
    };
  }
};

export const redeemReward = async (
  userId: string,
  reward: RewardItem,
  userName: string
): Promise<{ success: boolean; redemptionCode?: string; message: string }> => {
  if (mockCurrentUser.pawBalance < reward.pawsCost) {
    return { 
      success: false, 
      message: 'No tienes suficientes Huellitas (necesitas ' + reward.pawsCost + ', tienes ' + mockCurrentUser.pawBalance + ').' 
    };
  }

  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  mockCurrentUser.pawBalance -= reward.pawsCost;

  const redemption: RewardRedemption = {
    id: 'red-' + Date.now(),
    rewardId: reward.id,
    rewardTitle: reward.title,
    rewardType: reward.type,
    userId,
    userName,
    businessId: reward.businessId,
    uniqueCode: code,
    qrPayload: 'JUNTITAS:REDEEM:' + code + ':' + userId,
    status: 'active',
    pawsSpent: reward.pawsCost,
    createdAt: new Date()
  };

  return { 
    success: true, 
    redemptionCode: code, 
    message: '¡Canje exitoso! Presenta tu código al comercio.' 
  };
};
