import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Image,
  ActivityIndicator,
  FlatList,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Business } from '../models/Business';
import { RewardItem } from '../models/Gamification';
import { getBusinessesFromDb, validateCouponCode } from '../services/businessService';
import { 
  calculatePawsFromCLP, 
  publishBusinessReward, 
  getRewardsFromDb, 
  CLP_PER_PAW 
} from '../services/rewardService';
import { useToast } from '../context/ToastContext';

export const BusinessPortalScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { currentUser, isSuperAdmin } = useAuth();
  const { showToast } = useToast();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [loadingBiz, setLoadingBiz] = useState(true);

  // Formulario de Recompensa
  const [productTitle, setProductTitle] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productPriceCLP, setProductPriceCLP] = useState('');
  const [productStock, setProductStock] = useState('10');
  const [publishing, setPublishing] = useState(false);

  // Listado de Recompensas de la tienda
  const [storeRewards, setStoreRewards] = useState<RewardItem[]>([]);

  // Validador de cupones
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    loadStoreData();
  }, []);

  const loadStoreData = async () => {
    setLoadingBiz(true);
    const bizList = await getBusinessesFromDb();
    setBusinesses(bizList);

    // Buscar negocio correspondiente
    let found = bizList.find(b => b.ownerUserId === currentUser.id || b.staffUserIds?.includes(currentUser.id));
    if (!found && isSuperAdmin && bizList.length > 0) {
      found = bizList[0]; // Super Admin prueba con la primera tienda
    }
    setSelectedBiz(found || null);

    if (found) {
      loadStoreRewards(found.id);
    }
    setLoadingBiz(false);
  };

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStoreData();
    setRefreshing(false);
  };

  const loadStoreRewards = async (businessId: string) => {
    const allRewards = await getRewardsFromDb('comercial');
    const filtered = allRewards.filter(r => r.businessId === businessId);
    setStoreRewards(filtered);
  };

  // Cálculo en vivo según la fórmula oficial
  const rawPrice = parseInt(productPriceCLP.replace(/\D/g, ''), 10) || 0;
  const calculatedPaws = calculatePawsFromCLP(rawPrice);

  const handlePublishReward = async () => {
    if (!selectedBiz) {
      showToast('Debes tener un comercio seleccionado.', 'warning');
      return;
    }
    if (!productTitle.trim() || !productDesc.trim() || rawPrice <= 0) {
      showToast('Por favor completa el nombre del producto, descripción y precio en pesos CLP.', 'warning');
      return;
    }

    setPublishing(true);
    const res = await publishBusinessReward({
      businessId: selectedBiz.id,
      businessName: selectedBiz.name,
      title: productTitle.trim(),
      description: productDesc.trim(),
      priceCLP: rawPrice,
      stock: parseInt(productStock, 10) || 5,
      imageUrl: selectedBiz.logoUrl
    });
    setPublishing(false);

    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      setProductTitle('');
      setProductDesc('');
      setProductPriceCLP('');
      setProductStock('10');
      loadStoreRewards(selectedBiz.id);
    }
  };

  const handleValidateCoupon = async () => {
    const cleanCode = couponCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      showToast('Ingresa el código de 6 caracteres del cupón presentado por el tutor.', 'warning');
      return;
    }

    setValidating(true);
    const res = await validateCouponCode(cleanCode, currentUser.id);
    setValidating(false);
    showToast(res.message, res.success ? 'success' : 'error');
    setValidationResult(res.message);
    setCouponCodeInput('');
  };

  if (loadingBiz) {
    <View style={[styles.container, { paddingTop: insets.top + 40, alignItems: 'center' }]}>
      <ActivityIndicator size="large" color="#7E22CE" />
      <Text style={{ marginTop: 12, color: '#64748B' }}>Cargando portal de comercios...</Text>
    </View>
  }

  if (!selectedBiz) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 40, alignItems: 'center' }]}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="storefront-outline" size={56} color="#94A3B8" />
        </View>
        <Text style={styles.noBizTitle}>No hay comercios disponibles</Text>
        <Text style={styles.noBizSubtitle}>
          {isSuperAdmin 
            ? 'Para gestionar productos de tiendas, primero presiona "Poblar 10 Usuarios & 4 Tiendas" en tu Panel CRM o registra una tienda en la app.'
            : 'Tu cuenta aún no tiene una tienda canina asociada o está en revisión por la administración.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top + 10 }]} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#7E22CE']} tintColor="#7E22CE" />
      }
    >
      {/* Selector de Comercio si es Super Admin */}
      {isSuperAdmin && businesses.length > 1 && (
        <View style={styles.storeSelectorCard}>
          <Text style={styles.storeSelectorLabel}>👑 Super Admin: Seleccionar tienda para administrar:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {businesses.map(b => (
              <TouchableOpacity
                key={b.id}
                style={[styles.storePill, selectedBiz.id === b.id && styles.storePillActive]}
                onPress={() => {
                  setSelectedBiz(b);
                  loadStoreRewards(b.id);
                }}
              >
                <Text style={[styles.storePillText, selectedBiz.id === b.id && styles.storePillTextActive]}>
                  {b.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tarjeta del Comercio Seleccionado */}
      <View style={styles.businessCard}>
        <Image source={{ uri: selectedBiz.logoUrl }} style={styles.bizLogo} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <View style={styles.bizNameRow}>
            <Text style={styles.bizName}>{selectedBiz.name}</Text>
            {selectedBiz.isVerified && (
              <Ionicons name="checkmark-circle" size={18} color="#0284C7" />
            )}
          </View>
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>COMERCIO OFICIAL VERIFICADO</Text>
          </View>
          <Text style={styles.bizCategory}>🏷️ {selectedBiz.category} • 📍 {selectedBiz.coverageZone}</Text>
        </View>
      </View>

      {/* SECCIÓN 1: Publicar Producto con la Fórmula de Huellitas */}
      <View style={styles.toolSection}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="sparkles" size={20} color="#7E22CE" />
          <Text style={styles.sectionTitle}>Publicar en Tienda de Huellitas</Text>
        </View>
        <Text style={styles.sectionDesc}>
          Elige qué producto o beneficio ofrecer en la Tienda de Huellitas. La app calcula automáticamente el costo en Huellitas según el precio real para que a los tutores les requiera esfuerzo y fidelidad canjearlo.
        </Text>

        <Text style={styles.inputLabel}>Nombre del Producto o Beneficio:</Text>
        <TextInput
          placeholder="Ej: Snack Natural Deshidratado 100g / Torta Canina"
          value={productTitle}
          onChangeText={setProductTitle}
          style={styles.textInput}
        />

        <Text style={styles.inputLabel}>Descripción breve:</Text>
        <TextInput
          placeholder="Ej: Horneado 100% natural sin sal ni preservantes. Canjeable en juntas o local."
          value={productDesc}
          onChangeText={setProductDesc}
          style={styles.textInput}
        />

        <View style={styles.priceRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Precio comercial ($ CLP):</Text>
            <TextInput
              placeholder="Ej: 5000"
              keyboardType="numeric"
              value={productPriceCLP}
              onChangeText={setProductPriceCLP}
              style={styles.textInput}
            />
          </View>

          <View style={{ width: 120 }}>
            <Text style={styles.inputLabel}>Stock unidades:</Text>
            <TextInput
              placeholder="Ej: 10"
              keyboardType="numeric"
              value={productStock}
              onChangeText={setProductStock}
              style={styles.textInput}
            />
          </View>
        </View>

        {/* Tarjeta Visual de la Fórmula Oficial de Huellitas */}
        <View style={styles.formulaCard}>
          <View style={styles.formulaHeader}>
            <Ionicons name="calculator" size={16} color="#B45309" />
            <Text style={styles.formulaTitle}>Fórmula Oficial de Canje Equilibrado</Text>
          </View>
          <Text style={styles.formulaRule}>
            Regla de economía: <Text style={{ fontWeight: 'bold' }}>1 Huellita = ${CLP_PER_PAW} CLP</Text>
          </Text>
          
          <View style={styles.formulaResultBox}>
            <Text style={styles.formulaResultLabel}>Costo calculado para los tutores:</Text>
            <Text style={styles.formulaResultValue}>{calculatedPaws} 🐾 Huellitas</Text>
          </View>

          <Text style={styles.effortExplanation}>
            💡 <Text style={{ fontWeight: 'bold' }}>Nivel de esfuerzo:</Text> {
              calculatedPaws >= 800 
                ? 'Alto • Requiere 3 a 5 semanas de asistencia constante a juntas.'
                : calculatedPaws >= 300 
                  ? 'Medio • Requiere 1 a 2 semanas de participación activa.'
                  : 'Accesible • Requiere 1 semana activa o asistir a 2 juntas.'
            }
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.publishBtn, publishing && { opacity: 0.6 }]}
          onPress={handlePublishReward}
          disabled={publishing}
        >
          {publishing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="gift" size={18} color="#FFFFFF" />
              <Text style={styles.publishBtnText}>🚀 Publicar en Tienda de Huellitas</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* SECCIÓN 2: Productos Activos de esta Tienda */}
      <View style={styles.toolSection}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="pricetags" size={20} color="#0284C7" />
          <Text style={styles.sectionTitle}>Recompensas Activas en Catálogo ({storeRewards.length})</Text>
        </View>

        {storeRewards.length === 0 ? (
          <Text style={styles.emptyStoreRewards}>
            Esta tienda aún no tiene recompensas publicadas. Completa el formulario de arriba para agregar tu primer beneficio.
          </Text>
        ) : (
          storeRewards.map(rew => (
            <View key={rew.id} style={styles.rewardRowCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardRowTitle}>{rew.title}</Text>
                <Text style={styles.rewardRowSub}>
                  Valor: ${rew.originalPriceCLP?.toLocaleString('es-CL')} CLP • Stock: {rew.stockAvailable} uds.
                </Text>
              </View>
              <View style={styles.pawsTag}>
                <Text style={styles.pawsTagText}>{rew.pawsCost} 🐾</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* SECCIÓN 3: Validador de Códigos QR de Tutores */}
      <View style={styles.toolSection}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="scan" size={20} color="#15803D" />
          <Text style={styles.sectionTitle}>Validador de Cupones en Stand / Local</Text>
        </View>
        <Text style={styles.sectionDesc}>
          Cuando un tutor canjea un producto en la app, se genera un código único de 6 dígitos. Ingrésalo aquí para validar y quemar el cupón.
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Ej: 9K2M4X"
            placeholderTextColor="#94A3B8"
            value={couponCodeInput}
            onChangeText={setCouponCodeInput}
            autoCapitalize="characters"
            maxLength={8}
            style={styles.couponInput}
          />
          <TouchableOpacity 
            style={[styles.validateBtn, validating && { opacity: 0.6 }]} 
            onPress={handleValidateCoupon}
            disabled={validating}
          >
            {validating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                <Text style={styles.validateBtnText}>Validar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {validationResult && (
          <View style={[styles.resultBox, validationResult.includes('⚠️') && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <Ionicons 
              name={validationResult.includes('⚠️') ? "alert-circle" : "checkmark-done-circle"} 
              size={20} 
              color={validationResult.includes('⚠️') ? "#DC2626" : "#10B981"} 
            />
            <Text style={[styles.resultText, validationResult.includes('⚠️') && { color: '#991B1B' }]}>
              {validationResult}
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
  },
  storeSelectorCard: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  storeSelectorLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B21A8',
  },
  storePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderColor: '#D8B4FE',
    borderWidth: 1,
    marginRight: 8,
  },
  storePillActive: {
    backgroundColor: '#7E22CE',
    borderColor: '#7E22CE',
  },
  storePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B21A8',
  },
  storePillTextActive: {
    color: '#FFFFFF',
  },
  businessCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginBottom: 20,
  },
  bizLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  bizNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bizName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  planBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  planBadgeText: {
    color: '#7E22CE',
    fontSize: 10,
    fontWeight: '800',
  },
  bizCategory: {
    fontSize: 12,
    color: '#64748B',
  },
  toolSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formulaCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginVertical: 10,
  },
  formulaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  formulaTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  formulaRule: {
    fontSize: 12,
    color: '#78350F',
    marginBottom: 8,
  },
  formulaResultBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 8,
  },
  formulaResultLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  formulaResultValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#B45309',
  },
  effortExplanation: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7E22CE',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
    gap: 8,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  emptyStoreRewards: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  rewardRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  rewardRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  rewardRowSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  pawsTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pawsTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  couponInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  validateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15803D',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  validateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  resultText: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noBizTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  noBizSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 30,
    lineHeight: 18,
  },
});
