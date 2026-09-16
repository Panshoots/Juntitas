import { 
  PawTransaction, 
  PawActionType, 
  SurprisePawReward, 
  RewardItem,
  RewardRedemption
} from '../models/Gamification';
import { logAuditAction } from './auditService';

export const COOLDOWN_HOURS = 5;
export const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000; // 5 horas en ms (18,000,000 ms)

// Registro de última tirada en memoria / LocalStorage por usuario
const lastRollTimestamps: Record<string, number> = {};

export const getRemainingCooldown = (userId: string): number => {
  const lastRoll = lastRollTimestamps[userId] || 0;
  const now = Date.now();
  const elapsed = now - lastRoll;
  if (elapsed >= COOLDOWN_MS) {
    return 0;
  }
  return COOLDOWN_MS - elapsed;
};

export const formatCooldown = (ms: number): string => {
  if (ms <= 0) return '¡Disponible ahora!';
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
};

export const canRollSurprisePaw = (userId: string): boolean => {
  return getRemainingCooldown(userId) === 0;
};

export const PAW_ACTION_AMOUNTS: Record<PawActionType, number> = {
  account_created: 100,
  passport_completed: 30,
  community_joined: 10,
  event_attended: 100,
  mission_completed: 40,
  surprise_paw: 0,
  redeem_digital: 0,
  redeem_coupon: 0,
  admin_adjustment: 0,
};

export const rollSurprisePawWithCooldown = (
  userId: string
): { success: boolean; reward?: SurprisePawReward; remainingMs?: number; message: string } => {
  const remaining = getRemainingCooldown(userId);
  if (remaining > 0) {
    return {
      success: false,
      remainingMs: remaining,
      message: `La Huella Sorpresa está recargando. Podrás volver a girar en: ${formatCooldown(remaining)}`
    };
  }

  // Registrar timestamp de uso
  lastRollTimestamps[userId] = Date.now();

  // Probabilidades escasas y balanceadas (Regla R-1903 / R-1904):
  // 1% Legendaria, 6% Dorada, 18% Especial, 75% Normal
  const rand = Math.random() * 100;

  let reward: SurprisePawReward;

  if (rand < 1.0) {
    // 1% - Legendaria
    const paws = Math.floor(Math.random() * 501) + 500; // 500 a 1000 Huellitas
    reward = {
      rarity: 'legendaria',
      pawsAmount: paws,
      title: '🌟 ¡HUELLA LEGENDARIA!',
      message: '¡Increíble e irrepetible hallazgo! Has encontrado la mítica Huella Legendaria de Juntitas.',
      colorHex: '#9333EA' // Morado brillante
    };
  } else if (rand < 7.0) {
    // 6% - Dorada (1.0% a 7.0%)
    const paws = Math.floor(Math.random() * 101) + 150; // 150 a 250 Huellitas
    reward = {
      rarity: 'dorada',
      pawsAmount: paws,
      title: '🏆 ¡HUELLA DORADA!',
      message: '¡Qué gran fortuna! Tu perrito descubrió una brillante huella de oro puro.',
      colorHex: '#F59E0B' // Oro
    };
  } else if (rand < 25.0) {
    // 18% - Especial (7.0% a 25.0%)
    const paws = Math.floor(Math.random() * 31) + 40; // 40 a 70 Huellitas
    reward = {
      rarity: 'especial',
      pawsAmount: paws,
      title: '✨ ¡Huella Especial Plateada!',
      message: '¡Excelente! Una huella reluciente ha aparecido en el camino de tu manada.',
      colorHex: '#0284C7' // Azul cielo
    };
  } else {
    // 75% - Normal (25.0% a 100%)
    const paws = Math.floor(Math.random() * 16) + 10; // 10 a 25 Huellitas
    reward = {
      rarity: 'normal',
      pawsAmount: paws,
      title: '🐾 Huella Sorpresa Común',
      message: 'Has recogido una linda huellita paseando y explorando la comunidad.',
      colorHex: '#10B981' // Verde esmeralda
    };
  }

  logAuditAction(
    userId,
    'SURPRISE_PAW_ROLL',
    'gamification',
    userId,
    `Tirada de Huella Sorpresa: ${reward.rarity} (+${reward.pawsAmount} Huellitas)`
  );

  return {
    success: true,
    reward,
    message: `¡Ganaste +${reward.pawsAmount} Huellitas!`
  };
};

export const rollSurprisePaw = (): SurprisePawReward => {
  const res = rollSurprisePawWithCooldown('current-user');
  return res.reward || {
    rarity: 'normal',
    pawsAmount: 15,
    title: '🐾 Huella Sorpresa',
    message: 'Has recogido una huellita explorando.',
    colorHex: '#10B981'
  };
};
