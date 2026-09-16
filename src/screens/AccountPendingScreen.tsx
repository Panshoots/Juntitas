import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export const AccountPendingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { currentUser, logout, loginAsSuperAdmin } = useAuth();

  const isSuspended = currentUser.status === 'SUSPENDIDO' || currentUser.status === 'suspended' || currentUser.status === 'banned';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, isSuspended ? styles.suspendedCircle : styles.pendingCircle]}>
          <Ionicons 
            name={isSuspended ? "close-circle" : "time"} 
            size={56} 
            color={isSuspended ? "#EF4444" : "#F59E0B"} 
          />
        </View>

        <Text style={styles.title}>
          {isSuspended ? 'Cuenta Suspendida' : 'Cuenta en Revisión Oficial'}
        </Text>

        <Text style={styles.userBadge}>
          {currentUser.displayName} ({currentUser.email})
        </Text>

        <Text style={styles.description}>
          {isSuspended
            ? `Tu cuenta ha sido suspendida por la administración de Juntitas. Motivo: ${currentUser.suspendedReason || 'Incumplimiento de las normas comunitarias.'}`
            : `Has solicitado un perfil de ${currentUser.filterProfileType === 'community_admin' ? 'Líder Comunitario' : currentUser.filterProfileType === 'business' ? 'Tienda / Comercio' : 'Usuario con filtro'}. Para proteger a la comunidad, un Super Administrador debe revisar tus antecedentes y habilitar tu cuenta en el CRM.`}
        </Text>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={20} color="#0284C7" />
          <Text style={styles.infoBoxText}>
            Regla R-0601 / R-1401: La moderación activa asegura que las comunidades y comercios participantes sean reales y confiables para los tutores.
          </Text>
        </View>

        {/* Botón para Testing: Entrar como Super Admin para auto-aprobar */}
        <TouchableOpacity style={styles.quickAdminBtn} onPress={loginAsSuperAdmin}>
          <Ionicons name="key" size={16} color="#FFFFFF" />
          <Text style={styles.quickAdminText}>⚡ Ir al CRM como Super Admin para Habilitar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Cerrar Sesión / Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pendingCircle: {
    backgroundColor: '#FEF3C7',
  },
  suspendedCircle: {
    backgroundColor: '#FEE2E2',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  userBadge: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 14,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 10,
    marginBottom: 24,
  },
  infoBoxText: {
    fontSize: 12,
    color: '#0369A1',
    flex: 1,
    lineHeight: 16,
  },
  quickAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    width: '100%',
    gap: 8,
    marginBottom: 10,
  },
  quickAdminText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  logoutBtn: {
    paddingVertical: 12,
  },
  logoutBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
});
