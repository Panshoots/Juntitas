import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { validateCouponCode } from '../services/businessService';

export const BusinessPortalScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { activeProfile } = useAuth();
  const business = activeProfile.businessManaged;

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [postulationSent, setPostulationSent] = useState(false);

  const handleValidateCoupon = async () => {
    if (!couponCodeInput.trim()) {
      alert('Ingresa un código de cupón');
      return;
    }

    const res = await validateCouponCode(couponCodeInput.trim(), activeProfile.user.id);
    setValidationResult(res.message);
    setCouponCodeInput('');
  };

  const handleApplyToEvent = () => {
    setPostulationSent(true);
    alert('¡Postulación de stand enviada a los organizadores de la Gran Junta Dorada!');
  };

  if (!business) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 40, alignItems: 'center' }]}>
        <Ionicons name="storefront" size={60} color="#94A3B8" />
        <Text style={styles.noBizTitle}>No tienes un comercio asociado</Text>
        <Text style={styles.noBizSubtitle}>
          Cambia al rol "Dueño de Tienda / Comercio Pro" en la barra superior para validar este módulo.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
      {/* Tarjeta del Comercio */}
      <View style={styles.businessCard}>
        <Image source={{ uri: business.logoUrl }} style={styles.bizLogo} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <View style={styles.bizNameRow}>
            <Text style={styles.bizName}>{business.name}</Text>
            {business.isVerified && (
              <Ionicons name="checkmark-circle" size={18} color="#0284C7" />
            )}
          </View>
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>PLAN {business.plan.toUpperCase()} • $14.990/mes</Text>
          </View>
          <Text style={styles.bizCategory}>🏷️ {business.category} • 📍 {business.coverageZone}</Text>
        </View>
      </View>

      {/* Herramienta 1: Validación de Canjes de Huellitas en el Stand */}
      <View style={styles.toolSection}>
        <Text style={styles.sectionTitle}>🎟️ Validador de Cupones en Stand</Text>
        <Text style={styles.sectionDesc}>
          Cuando un tutor canjea Huellitas en la junta, ingresa aquí su código alfanumérico de 6 dígitos para validar el beneficio.
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Ej: ABC123"
            placeholderTextColor="#94A3B8"
            value={couponCodeInput}
            onChangeText={setCouponCodeInput}
            autoCapitalize="characters"
            style={styles.couponInput}
          />
          <TouchableOpacity style={styles.validateBtn} onPress={handleValidateCoupon}>
            <Ionicons name="scan" size={18} color="#FFFFFF" />
            <Text style={styles.validateBtnText}>Validar</Text>
          </TouchableOpacity>
        </View>

        {validationResult && (
          <View style={styles.resultBox}>
            <Ionicons name="checkmark-done-circle" size={20} color="#10B981" />
            <Text style={styles.resultText}>{validationResult}</Text>
          </View>
        )}
      </View>

      {/* Herramienta 2: Postulación de Stands a Juntas */}
      <View style={styles.toolSection}>
        <Text style={styles.sectionTitle}>🎪 Participación en Juntas Oficiales</Text>
        <Text style={styles.sectionDesc}>
          Juntas que aceptan comercios y stands de degustación o venta.
        </Text>

        <View style={styles.eventApplyCard}>
          <Text style={styles.eventApplyTitle}>Gran Junta Dorada de Primavera</Text>
          <Text style={styles.eventApplyMeta}>📍 Parque Inés de Suárez • 34 perritos inscritos</Text>
          <Text style={styles.eventApplyOffer}>
            Tu propuesta: Stand de degustación gratuita de galletas y 15% dcto en snacks naturales.
          </Text>

          <TouchableOpacity 
            style={[styles.applyBtn, postulationSent && styles.applyBtnSuccess]}
            onPress={handleApplyToEvent}
            disabled={postulationSent}
          >
            <Ionicons name={postulationSent ? "checkmark-circle" : "send"} size={16} color="#FFFFFF" />
            <Text style={styles.applyBtnText}>
              {postulationSent ? "Postulación Enviada" : "Postular Stand a esta Junta"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 14,
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
    backgroundColor: '#0284C7',
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
  eventApplyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  eventApplyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  eventApplyMeta: {
    fontSize: 12,
    color: '#64748B',
    marginVertical: 4,
  },
  eventApplyOffer: {
    fontSize: 12,
    color: '#334155',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7E22CE',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  applyBtnSuccess: {
    backgroundColor: '#10B981',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  noBizTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 14,
  },
  noBizSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 30,
  },
});
