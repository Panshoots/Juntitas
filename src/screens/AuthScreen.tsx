import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Modal 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UserRole, UserStatus } from '../models/User';

interface AuthScreenProps {
  initialMode?: 'login' | 'register';
  onBackToOnboarding: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'register',
  onBackToOnboarding
}) => {
  const insets = useSafeAreaInsets();
  const { registerUser, loginUser, loginAsSuperAdmin, loginWithGoogle, sendPasswordReset } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);

  // Estados para recordar credenciales y recuperar clave
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const saved = await AsyncStorage.getItem('@juntitas_remember_creds');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.savedEmail) setEmail(parsed.savedEmail);
          if (parsed.savedPassword) setPassword(parsed.savedPassword);
          setRememberMe(true);
        }
      } catch (e) {
        console.warn('Error cargando credenciales:', e);
      }
    };
    loadSavedCredentials();
  }, []);

  // Campos comunes
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [comuna, setComuna] = useState('');

  // Filtro de perfil para registro
  const [profileType, setProfileType] = useState<'tutor' | 'community_admin' | 'business'>('tutor');

  // Campos específicos de Tutor (Perrito)
  const [dogName, setDogName] = useState('');
  const [dogBreed, setDogBreed] = useState('');
  const [dogSize, setDogSize] = useState<'pequeño' | 'mediano' | 'grande'>('mediano');

  // Campos específicos de Líder Comunitario
  const [communityName, setCommunityName] = useState('');
  const [communityInstagram, setCommunityInstagram] = useState('');

  // Campos específicos de Tienda
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');

  const handleAuthSubmit = async () => {
    if (!email || !password) {
      showToast('Por favor completa tu correo y contraseña.', 'warning');
      return;
    }

    setLoading(true);

    if (mode === 'login') {
      const res = await loginUser(email, password);
      setLoading(false);
      showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) {
        if (rememberMe) {
          try {
            await AsyncStorage.setItem(
              '@juntitas_remember_creds', 
              JSON.stringify({ savedEmail: email, savedPassword: password })
            );
          } catch (e) {
            // Silencioso
          }
        } else {
          try {
            await AsyncStorage.removeItem('@juntitas_remember_creds');
          } catch (e) {
            // Silencioso
          }
        }
      }
      return;
    }

    // Validación de Registro según Filtro
    if (!displayName || !comuna) {
      setLoading(false);
      showToast('Por favor ingresa tu nombre y comuna.', 'warning');
      return;
    }

    let role: UserRole = 'member';
    let status: UserStatus = 'ACTIVO';
    let extraDogData: any = undefined;

    if (profileType === 'tutor') {
      role = 'member';
      status = 'ACTIVO';
      extraDogData = undefined;
    } else if (profileType === 'community_admin') {
      if (!communityName || !communityInstagram) {
        setLoading(false);
        showToast('Por favor ingresa el nombre de la comunidad e Instagram.', 'warning');
        return;
      }
      role = 'primary_admin';
      status = 'PENDIENTE_APROBACION';
    } else if (profileType === 'business') {
      if (!businessName || !businessPhone) {
        setLoading(false);
        showToast('Por favor ingresa el nombre del negocio y teléfono.', 'warning');
        return;
      }
      role = 'business_owner';
      status = 'PENDIENTE_APROBACION';
    }

    const res = await registerUser({
      email,
      password,
      displayName,
      comuna,
      roleType: role,
      status,
      filterProfileType: profileType,
      requestedCommunityName: communityName || undefined,
      requestedBusinessName: businessName || undefined,
      dog: extraDogData
    });

    setLoading(false);
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const res = await loginWithGoogle();
    setLoading(false);
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const handleSendResetEmail = async () => {
    if (!forgotEmail) {
      showToast('Por favor ingresa tu correo electrónico.', 'warning');
      return;
    }
    setSendingReset(true);
    const res = await sendPasswordReset(forgotEmail);
    setSendingReset(false);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      setShowForgotModal(false);
      setForgotEmail('');
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top }]} 
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Botón Volver */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBackToOnboarding}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
          <Text style={styles.backButtonText}>Inicio</Text>
        </TouchableOpacity>
      </View>

      {/* Título de la pantalla */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>
          {mode === 'register' ? 'Crear Cuenta en Juntitas' : 'Bienvenido de Vuelta'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'register' 
            ? 'Regístrate con tus datos reales para conectar con la comunidad canina.' 
            : 'Ingresa con tu correo y contraseña registrados.'}
        </Text>
      </View>

      {/* Selector de Modo Login / Registro */}
      <View style={styles.tabSelector}>
        <TouchableOpacity 
          style={[styles.tabBtn, mode === 'register' && styles.tabBtnActive]}
          onPress={() => setMode('register')}
        >
          <Text style={[styles.tabBtnText, mode === 'register' && styles.tabBtnTextActive]}>
            Nuevo Registro (con Filtro)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, mode === 'login' && styles.tabBtnActive]}
          onPress={() => setMode('login')}
        >
          <Text style={[styles.tabBtnText, mode === 'login' && styles.tabBtnTextActive]}>
            Iniciar Sesión
          </Text>
        </TouchableOpacity>
      </View>

      {/* Formulario de Registro */}
      {mode === 'register' && (
        <View style={styles.formCard}>
          {/* Selector de Filtro de Perfil */}
          <Text style={styles.filterSectionTitle}>1. Selecciona tu tipo de perfil:</Text>
          <View style={styles.profileTypeRow}>
            <TouchableOpacity 
              style={[styles.profileTypeOption, profileType === 'tutor' && styles.profileTypeOptionActive]}
              onPress={() => setProfileType('tutor')}
            >
              <Text style={{ fontSize: 24 }}>🐶</Text>
              <Text style={[styles.profileTypeTitle, profileType === 'tutor' && styles.profileTypeTitleActive]}>
                Tutor Canino
              </Text>
              <Text style={styles.profileTypeSub}>Tengo perrito</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.profileTypeOption, profileType === 'community_admin' && styles.profileTypeOptionActive]}
              onPress={() => setProfileType('community_admin')}
            >
              <Text style={{ fontSize: 24 }}>👑</Text>
              <Text style={[styles.profileTypeTitle, profileType === 'community_admin' && styles.profileTypeTitleActive]}>
                Líder Grupo
              </Text>
              <Text style={styles.profileTypeSub}>Admin Comunidad</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.profileTypeOption, profileType === 'business' && styles.profileTypeOptionActive]}
              onPress={() => setProfileType('business')}
            >
              <Text style={{ fontSize: 24 }}>🏪</Text>
              <Text style={[styles.profileTypeTitle, profileType === 'business' && styles.profileTypeTitleActive]}>
                Comercio
              </Text>
              <Text style={styles.profileTypeSub}>Tienda / Stands</Text>
            </TouchableOpacity>
          </View>

          {/* Datos Personales */}
          <Text style={styles.filterSectionTitle}>2. Tus datos personales:</Text>
          <TextInput
            placeholder="Nombre completo (ej: Valentina Silva)"
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
          />

          <TextInput
            placeholder="Correo electrónico (ej: vale@gmail.com)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            placeholder="Contraseña secreta (mínimo 6 caracteres)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          <TextInput
            placeholder="Comuna o sector (ej: Providencia, Las Condes)"
            value={comuna}
            onChangeText={setComuna}
            style={styles.input}
          />

          {/* Mensaje amigable para tutor */}
          {profileType === 'tutor' && (
            <View style={[styles.subCard, { borderColor: '#BAE6FD', backgroundColor: '#F0F9FF' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="paw" size={16} color="#0284C7" />
                <Text style={[styles.subCardTitle, { color: '#0369A1' }]}>Registro como Tutor:</Text>
              </View>
              <Text style={[styles.filterNote, { color: '#0C4A6E', marginBottom: 0 }]}>
                Una vez creada tu cuenta podrás registrar a tus perritos desde tu perfil con el catálogo oficial de razas y activar su Pasaporte Perruno Oficial con Huellitas (+50 🐾).
              </Text>
            </View>
          )}

          {profileType === 'community_admin' && (
            <View style={[styles.subCard, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
              <Text style={[styles.subCardTitle, { color: '#B45309' }]}>
                👑 Solicitud de Administración Comunitaria:
              </Text>
              <Text style={styles.filterNote}>
                Filtro de seguridad: Tu cuenta será creada y quedará en estado "En revisión". El Super Admin validará los datos de la comunidad en el CRM antes de activar tus permisos.
              </Text>
              <TextInput
                placeholder="Nombre de la comunidad canina (ej: Beagles Santiago)"
                value={communityName}
                onChangeText={setCommunityName}
                style={styles.input}
              />
              <TextInput
                placeholder="Instagram oficial (ej: @beaglessantiago)"
                value={communityInstagram}
                onChangeText={setCommunityInstagram}
                autoCapitalize="none"
                style={styles.input}
              />
            </View>
          )}

          {profileType === 'business' && (
            <View style={[styles.subCard, { borderColor: '#E9D5FF', backgroundColor: '#FAF5FF' }]}>
              <Text style={[styles.subCardTitle, { color: '#7E22CE' }]}>
                🏪 Solicitud de Comercio Canino:
              </Text>
              <Text style={styles.filterNote}>
                Filtro de seguridad: Tu cuenta requerirá verificación del Super Admin en el CRM para validar que el negocio sea real y ofrecer beneficios en juntas.
              </Text>
              <TextInput
                placeholder="Nombre de la tienda (ej: Guau Gourmet Pastelería)"
                value={businessName}
                onChangeText={setBusinessName}
                style={styles.input}
              />
              <TextInput
                placeholder="Rubro o categoría (ej: Pastelería, Accesorios)"
                value={businessCategory}
                onChangeText={setBusinessCategory}
                style={styles.input}
              />
              <TextInput
                placeholder="WhatsApp comercial (ej: +56 9 1234 5678)"
                value={businessPhone}
                onChangeText={setBusinessPhone}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>
          )}
        </View>
      )}

      {/* Formulario de Login */}
      {mode === 'login' && (
        <View style={styles.formCard}>
          {/* Tarjeta de Asistencia para el Administrador */}
          <View style={styles.adminHelpCard}>
            <View style={styles.adminHelpHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#DC2626" />
              <Text style={styles.adminHelpTitle}>Credenciales de Super Administrador</Text>
            </View>
            <Text style={styles.adminHelpText}>
              Usuario: <Text style={styles.codeText}>admin</Text> (o <Text style={styles.codeText}>admin@juntitas.app</Text>){'\n'}
              Contraseña: <Text style={styles.codeText}>admin</Text>
            </Text>
            
            <View style={styles.adminQuickRow}>
              <TouchableOpacity 
                style={styles.autofillBtn}
                onPress={() => {
                  setEmail('admin');
                  setPassword('admin');
                }}
              >
                <Ionicons name="flash" size={14} color="#0284C7" />
                <Text style={styles.autofillBtnText}>⚡ Autocompletar datos</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.directAdminBtn}
                onPress={async () => {
                  setLoading(true);
                  const res = await loginAsSuperAdmin();
                  setLoading(false);
                  showToast(res.message, res.success ? 'success' : 'error');
                }}
              >
                <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                <Text style={styles.directAdminBtnText}>Entrar como Francisco</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Correo o Usuario:</Text>
          <TextInput
            placeholder="admin (o tu correo)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Contraseña:</Text>
          <TextInput
            placeholder="admin (o tu clave)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          {/* Opciones de Recordar datos y Recuperar Contraseña */}
          <View style={styles.loginExtraRow}>
            <TouchableOpacity 
              style={styles.rememberRow} 
              onPress={() => setRememberMe(!rememberMe)}
            >
              <Ionicons 
                name={rememberMe ? "checkbox" : "square-outline"} 
                size={20} 
                color={rememberMe ? "#0284C7" : "#94A3B8"} 
              />
              <Text style={styles.rememberText}>Recordar contraseña</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                setForgotEmail(email);
                setShowForgotModal(true);
              }}
            >
              <Text style={styles.forgotText}>¿Olvidaste tu clave?</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Botón Enviar */}
      <TouchableOpacity 
        style={[styles.submitButton, loading && { opacity: 0.6 }]}
        onPress={handleAuthSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading 
            ? 'Procesando...' 
            : mode === 'register' 
              ? 'Enviar Registro con Filtro' 
              : 'Iniciar Sesión'}
        </Text>
      </TouchableOpacity>

      {/* Separador */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>o ingresa fácilmente con</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Botón de Google (Gmail) */}
      <TouchableOpacity 
        style={styles.googleButton}
        onPress={handleGoogleLogin}
        disabled={loading}
      >
        <Ionicons name="logo-google" size={20} color="#EA4335" />
        <Text style={styles.googleButtonText}>Continuar con Google (Gmail)</Text>
      </TouchableOpacity>

      {/* Modal para Recuperar Contraseña */}
      <Modal visible={showForgotModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔑 Recuperar Contraseña</Text>
              <TouchableOpacity onPress={() => setShowForgotModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Ingresa tu correo electrónico registrado y te enviaremos un enlace oficial de Firebase para restablecer tu clave de forma segura.
            </Text>

            <TextInput
              placeholder="tu.correo@ejemplo.cl"
              value={forgotEmail}
              onChangeText={setForgotEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.modalInput}
            />

            <TouchableOpacity 
              style={[styles.modalSubmitBtn, sendingReset && { opacity: 0.6 }]}
              onPress={handleSendResetEmail}
              disabled={sendingReset}
            >
              <Text style={styles.modalSubmitBtnText}>
                {sendingReset ? 'Enviando enlace...' : 'Enviar Correo de Recuperación'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  adminQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  adminQuickText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  titleSection: {
    marginVertical: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    marginTop: 6,
  },
  profileTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  profileTypeOption: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
  },
  profileTypeOptionActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  profileTypeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 6,
    textAlign: 'center',
  },
  profileTypeTitleActive: {
    color: '#0284C7',
  },
  profileTypeSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 10,
  },
  subCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    marginBottom: 4,
  },
  subCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 8,
  },
  filterNote: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 10,
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  sizeOption: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  sizeOptionActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  sizeOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  sizeOptionTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adminHelpCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  adminHelpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  adminHelpTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  adminHelpText: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 18,
    marginBottom: 10,
  },
  codeText: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  adminQuickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  autofillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  autofillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  directAdminBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  directAdminBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 4,
  },
  loginExtraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rememberText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  dividerText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
  },
  modalSubmitBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

