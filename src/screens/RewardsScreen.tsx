import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Modal,
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RewardItem } from '../models/Gamification';
import { getRewardsFromDb, redeemRewardInDb } from '../services/rewardService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUserByIdFromDb } from '../services/userService';

export const RewardsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [pawBalance, setPawBalance] = useState(currentUser?.pawBalance || 0);
  const [activeTab, setActiveTab] = useState<'comercial' | 'digital'>('comercial');
  const [rewardsList, setRewardsList] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);
  const [redeemedItem, setRedeemedItem] = useState<RewardItem | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);

  useEffect(() => {
    loadRewards();
  }, [activeTab]);

  useEffect(() => {
    if (currentUser?.pawBalance !== undefined) {
      setPawBalance(currentUser.pawBalance);
    }
  }, [currentUser?.pawBalance]);

  const [refreshing, setRefreshing] = useState(false);

  const loadRewards = async () => {
    const startTime = Date.now();
    setLoading(true);
    try {
      const data = await getRewardsFromDb(activeTab);
      setRewardsList(data);
    } catch (e) {
      console.warn('Error cargando recompensas:', e);
    } finally {
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 350 - elapsed);
      if (minDelay > 0) await new Promise(r => setTimeout(r, minDelay));
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRewards();
    if (currentUser?.id) {
      const u = await getUserByIdFromDb(currentUser.id);
      if (u) setPawBalance(u.pawBalance || 0);
    }
    setRefreshing(false);
  };

  const handleRedeem = async (item: RewardItem) => {
    if (pawBalance < item.pawsCost) {
      showToast(`Necesitas ${item.pawsCost} Huellitas para este canje. Acumulas puntos asistiendo a juntas y con la Huella Sorpresa.`, 'warning');
      return;
    }

    const res = await redeemRewardInDb(currentUser.id, item, currentUser.displayName);

    if (res.success && res.redemptionCode) {
      setPawBalance(prev => Math.max(0, prev - item.pawsCost));
      setRedeemedCode(res.redemptionCode);
      setRedeemedItem(item);
      setShowCodeModal(true);
      showToast(res.message, 'success');
      loadRewards();
    } else {
      showToast(res.message, 'error');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🎁 Tienda de Huellitas</Text>
          <Text style={styles.subtitle}>Canjea tus puntos por premios y descuentos</Text>
        </View>
        <View style={styles.balanceBadge}>
          <Ionicons name="paw" size={20} color="#F59E0B" />
          <Text style={styles.balanceNumber}>{pawBalance}</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'comercial' && styles.tabButtonActive]}
          onPress={() => setActiveTab('comercial')}
        >
          <Text style={[styles.tabText, activeTab === 'comercial' && styles.tabTextActive]}>
            🛍️ Comercios & Stands
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'digital' && styles.tabButtonActive]}
          onPress={() => setActiveTab('digital')}
        >
          <Text style={[styles.tabText, activeTab === 'digital' && styles.tabTextActive]}>
            ✨ Digitales & Pasaporte
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinnerCircle}>
            <ActivityIndicator size="large" color="#0284C7" />
          </View>
          <Text style={styles.loadingTitle}>Cargando Tienda de Huellitas...</Text>
          <Text style={styles.loadingSubtitle}>Consultando catálogo, premios y comercios verificados 🐾</Text>
        </View>
      ) : (
        <FlatList
          data={rewardsList}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0284C7']} tintColor="#0284C7" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="gift-outline" size={48} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'comercial' 
                  ? 'Aún no hay productos publicados por tiendas' 
                  : 'Aún no hay recompensas digitales'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'comercial'
                  ? 'Las tiendas verificadas pueden publicar sus productos y promociones para canje por Huellitas desde su portal.'
                  : 'Pronto podrás desbloquear marcos especiales y medallas para el Pasaporte de tu perrito.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOutOfStock = item.stockAvailable !== undefined && item.stockAvailable <= 0;

            return (
              <View style={[styles.rewardCard, isOutOfStock && { opacity: 0.75 }]}>
                <Image source={{ uri: item.imageUrl }} style={styles.rewardImage} />
                <View style={styles.cardBody}>
                  {item.businessName && (
                    <Text style={styles.businessLabel}>🏪 {item.businessName}</Text>
                  )}
                  <Text style={styles.rewardTitle}>{item.title}</Text>
                  <Text style={styles.rewardDesc}>{item.description}</Text>

                  {item.originalPriceCLP ? (
                    <Text style={styles.priceClpText}>
                      Valor comercial: ${item.originalPriceCLP.toLocaleString('es-CL')} CLP
                    </Text>
                  ) : null}

                  {/* Indicador de Stock Restante */}
                  <View style={[styles.stockBadge, isOutOfStock ? styles.stockBadgeOut : styles.stockBadgeAvailable]}>
                    <Ionicons 
                      name={isOutOfStock ? "alert-circle" : "cube"} 
                      size={13} 
                      color={isOutOfStock ? "#DC2626" : "#0284C7"} 
                    />
                    <Text style={[styles.stockText, isOutOfStock ? styles.stockTextOut : styles.stockTextAvailable]}>
                      {isOutOfStock 
                        ? 'Agotado (Sin stock)' 
                        : `Stock: ${item.stockAvailable} unidad${item.stockAvailable === 1 ? '' : 'es'} disponible${item.stockAvailable === 1 ? '' : 's'}`}
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.costBadge}>
                      <Ionicons name="paw" size={16} color="#D97706" />
                      <Text style={styles.costText}>{item.pawsCost} Huellitas</Text>
                    </View>
                    <TouchableOpacity 
                      style={[
                        styles.redeemButton, 
                        (isOutOfStock || pawBalance < item.pawsCost) && styles.redeemButtonDisabled
                      ]}
                      onPress={() => handleRedeem(item)}
                      disabled={isOutOfStock}
                    >
                      <Text style={styles.redeemButtonText}>
                        {isOutOfStock ? 'Agotado' : 'Canjear'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Modal de Cupón / Código QR para Tiendas (Sección 19 Plan Maestro) */}
      <Modal visible={showCodeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.codeCard}>
            <Ionicons name="checkmark-circle" size={56} color="#10B981" />
            <Text style={styles.codeSuccessTitle}>¡Canje Realizado!</Text>
            <Text style={styles.codeItemTitle}>{redeemedItem?.title}</Text>

            <View style={styles.codeDisplayBox}>
              <Text style={styles.codeInstructions}>Muestra este código al comercio en la junta:</Text>
              <Text style={styles.uniqueCodeText}>{redeemedCode}</Text>
            </View>

            <Text style={styles.codeFooterNote}>
              El comercio validará este código alfanumérico o QR en su panel de tienda para marcarlo como utilizado.
            </Text>

            <TouchableOpacity 
              style={styles.closeCodeButton}
              onPress={() => setShowCodeModal(false)}
            >
              <Text style={styles.closeCodeButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  balanceNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#B45309',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    marginHorizontal: 20,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rewardImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E2E8F0',
  },
  cardBody: {
    padding: 16,
  },
  businessLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  rewardDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  costText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#D97706',
  },
  redeemButton: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  redeemButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  redeemButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  codeCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  codeSuccessTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  codeItemTitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  codeDisplayBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#0284C7',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  codeInstructions: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  uniqueCodeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 4,
  },
  codeFooterNote: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
  },
  closeCodeButton: {
    backgroundColor: '#0F172A',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeCodeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  priceClpText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
    marginBottom: 8,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  stockBadgeAvailable: {
    backgroundColor: '#E0F2FE',
  },
  stockBadgeOut: {
    backgroundColor: '#FEE2E2',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stockTextAvailable: {
    color: '#0369A1',
  },
  stockTextOut: {
    color: '#B91C1C',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  loadingSpinnerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  emptyContainer: {
    paddingVertical: 50,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});

