import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { SurprisePawReward } from '../models/Gamification';
import { formatCooldown } from '../services/gamificationService';

interface Props {
  visible: boolean;
  reward: SurprisePawReward | null;
  cooldownMs?: number;
  onClose: () => void;
}

const CONFETTI_ITEMS = ['🎉', '✨', '🎊', '⭐', '🎈', '🐾', '🌟', '🥇', '🎁', '🐶', '💖', '🎇'];

export const SurprisePawModal: React.FC<Props> = ({ 
  visible, 
  reward, 
  cooldownMs = 0, 
  onClose 
}) => {
  const [countdown, setCountdown] = useState(cooldownMs);

  useEffect(() => {
    setCountdown(cooldownMs);
    if (cooldownMs <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1000) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownMs]);

  if (!visible) return null;

  const isCooldown = countdown > 0 && !reward;
  const isRareCelebration = reward && (reward.rarity === 'dorada' || reward.rarity === 'legendaria');

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        {/* Serpentinas / Confetti festivo para versiones raras (Dorada y Legendaria) */}
        {isRareCelebration && (
          <View style={styles.confettiContainer} pointerEvents="none">
            {CONFETTI_ITEMS.map((emoji, index) => {
              const leftPos = (index * 8) + '%';
              const delay = (index * 80);
              return (
                <Animatable.Text
                  key={index}
                  animation={{
                    from: { translateY: -40, opacity: 1 },
                    to: { translateY: Dimensions.get('window').height * 0.8, opacity: 0 }
                  } as any}
                  iterationCount="infinite"
                  duration={2200}
                  delay={delay}
                  style={[styles.streamerEmoji, { left: leftPos as any }]}
                >
                  {emoji}
                </Animatable.Text>
              );
            })}
          </View>
        )}

        {/* Modal si está en ENFRIAMIENTO (5 Horas) */}
        {isCooldown ? (
          <Animatable.View animation="zoomIn" duration={400} style={[styles.card, styles.cooldownCard]}>
            <View style={styles.timerCircle}>
              <Ionicons name="hourglass" size={54} color="#F59E0B" />
            </View>

            <Text style={styles.cooldownBadge}>RECARGANDO HUELLA</Text>
            <Text style={styles.title}>Tiempo de Espera</Text>
            <Text style={styles.cooldownDesc}>
              Para cuidar el balance de Huellitas de la plataforma, la Huella Sorpresa solo se puede abrir una vez cada 5 horas.
            </Text>

            {/* Contador de tiempo restante */}
            <View style={styles.timerBox}>
              <Ionicons name="time" size={20} color="#B45309" />
              <Text style={styles.timerText}>{formatCooldown(countdown)}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.claimButton, { backgroundColor: '#475569' }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.claimButtonText}>Entendido, volveré más tarde</Text>
            </TouchableOpacity>
          </Animatable.View>
        ) : reward ? (
          /* Modal cuando GANA una Huella Sorpresa */
          <Animatable.View 
            animation="zoomIn" 
            duration={500} 
            style={[styles.card, { borderColor: reward.colorHex }]}
          >
            {isRareCelebration && (
              <Animatable.Text 
                animation="flash" 
                iterationCount="infinite" 
                duration={1000}
                style={styles.rareNotice}
              >
                🎉 ¡PREMIO DE EDICIÓN RARA! 🎉
              </Animatable.Text>
            )}

            <Animatable.View 
              animation="pulse" 
              iterationCount="infinite" 
              duration={1200}
              style={[styles.iconCircle, { backgroundColor: reward.colorHex }]}
            >
              <Ionicons name="paw" size={60} color="#FFFFFF" />
            </Animatable.View>

            <Text style={[styles.rarityBadge, { backgroundColor: reward.colorHex }]}>
              {reward.rarity.toUpperCase()}
            </Text>

            <Text style={styles.title}>{reward.title}</Text>
            <Text style={styles.message}>{reward.message}</Text>

            <View style={styles.rewardContainer}>
              <Ionicons name="gift" size={24} color="#FF9800" />
              <Text style={styles.pawsAmount}>+{reward.pawsAmount} Huellitas</Text>
            </View>

            <Text style={styles.cooldownNote}>
              ⏳ Próxima Huella Sorpresa disponible en 5 horas.
            </Text>

            <TouchableOpacity 
              style={[styles.claimButton, { backgroundColor: reward.colorHex }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.claimButtonText}>¡Reclamar Recompensa!</Text>
            </TouchableOpacity>
          </Animatable.View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  streamerEmoji: {
    position: 'absolute',
    fontSize: 30,
    top: -20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 100,
  },
  cooldownCard: {
    borderColor: '#F59E0B',
  },
  timerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cooldownBadge: {
    fontSize: 11,
    fontWeight: '900',
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  cooldownDesc: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
    marginBottom: 20,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: 1,
  },
  rareNotice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F59E0B',
    marginBottom: 8,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  rarityBadge: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
    marginBottom: 10,
  },
  pawsAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E65100',
    marginLeft: 8,
  },
  cooldownNote: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  claimButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
