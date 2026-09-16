import React, { useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { SurprisePawReward } from '../models/Gamification';

let ConfettiCannon: any = null;
if (Platform.OS !== 'web') {
  try {
    ConfettiCannon = require('react-native-confetti-cannon').default;
  } catch (e) {
    ConfettiCannon = null;
  }
}

interface Props {
  visible: boolean;
  reward: SurprisePawReward | null;
  onClose: () => void;
}

export const SurprisePawModal: React.FC<Props> = ({ visible, reward, onClose }) => {
  const confettiRef = useRef<any>(null);

  if (!reward) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        {ConfettiCannon && (reward.rarity === 'dorada' || reward.rarity === 'legendaria') && (
          <ConfettiCannon
            ref={confettiRef}
            count={80}
            origin={{ x: 200, y: 0 }}
            autoStart={true}
            fadeOut={true}
          />
        )}
        <Animatable.View 
          animation="zoomIn" 
          duration={500} 
          style={[styles.card, { borderColor: reward.colorHex }]}
        >
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

          <TouchableOpacity 
            style={[styles.claimButton, { backgroundColor: reward.colorHex }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.claimButtonText}>¡Reclamar Recompensa!</Text>
          </TouchableOpacity>
        </Animatable.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  rarityBadge: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  pawsAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#C2410C',
    marginLeft: 8,
  },
  claimButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
