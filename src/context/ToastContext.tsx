import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {}
});

// Singleton de disparo para usar fuera de componentes si fuera necesario
let globalToastHandler: ((opts: ToastOptions) => void) | null = null;

export const showGlobalToast = (message: string, type: ToastType = 'info', title?: string, duration = 3500) => {
  if (globalToastHandler) {
    globalToastHandler({ message, type, title, duration });
  } else if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    // Fallback si aún no se monta
    console.log(`[TOAST fallback]: ${message}`);
  }
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [toastData, setToastData] = useState<ToastOptions>({ message: '', type: 'info' });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-60)).current;
  const timeoutRef = useRef<any>(null);

  const hideToast = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web'
      }),
      Animated.timing(translateYAnim, {
        toValue: -60,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web'
      })
    ]).start(() => {
      setVisible(false);
    });
  };

  const showToast = (message: string, type: ToastType = 'info', title?: string, duration = 3500) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToastData({ message, type, title, duration });
    setVisible(true);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web'
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: Platform.OS !== 'web'
      })
    ]).start();

    timeoutRef.current = setTimeout(() => {
      hideToast();
    }, duration);
  };

  useEffect(() => {
    globalToastHandler = (opts) => {
      showToast(opts.message, opts.type, opts.title, opts.duration);
    };

    // Interceptar alert nativo en Web para transformarlo en popup elegante
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const originalAlert = window.alert;
      window.alert = (msg: any) => {
        const text = String(msg || '');
        const isError = text.toLowerCase().includes('error') || text.toLowerCase().includes('falló');
        const isSuccess = text.toLowerCase().includes('éxito') || text.toLowerCase().includes('bienvenido') || text.toLowerCase().includes('guardad');
        showToast(text, isError ? 'error' : isSuccess ? 'success' : 'info');
      };
      return () => {
        window.alert = originalAlert;
      };
    }
  }, []);

  const getTheme = () => {
    switch (toastData.type) {
      case 'success':
        return {
          bg: '#ECFDF5',
          border: '#6EE7B7',
          iconColor: '#059669',
          iconName: 'checkmark-circle' as const,
          titleColor: '#065F46',
          textColor: '#047857',
          defaultTitle: '¡Operación Exitosa!'
        };
      case 'error':
        return {
          bg: '#FEF2F2',
          border: '#FCA5A5',
          iconColor: '#DC2626',
          iconName: 'alert-circle' as const,
          titleColor: '#991B1B',
          textColor: '#B91C1C',
          defaultTitle: 'Hubo un inconveniente'
        };
      case 'warning':
        return {
          bg: '#FFFBEB',
          border: '#FDE68A',
          iconColor: '#D97706',
          iconName: 'warning' as const,
          titleColor: '#92400E',
          textColor: '#B45309',
          defaultTitle: 'Aviso importante'
        };
      case 'info':
      default:
        return {
          bg: '#F0F9FF',
          border: '#BAE6FD',
          iconColor: '#0284C7',
          iconName: 'information-circle' as const,
          titleColor: '#0369A1',
          textColor: '#0284C7',
          defaultTitle: 'Notificación'
        };
    }
  };

  const theme = getTheme();
  const topInset = (Platform.OS === 'web' ? 20 : insets.top + 8);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: topInset,
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }],
              backgroundColor: theme.bg,
              borderColor: theme.border
            }
          ]}
        >
          <View style={styles.toastContent}>
            <Ionicons name={theme.iconName} size={24} color={theme.iconColor} style={styles.toastIcon} />
            <View style={styles.textWrapper}>
              <Text style={[styles.toastTitle, { color: theme.titleColor }]}>
                {toastData.title || theme.defaultTitle}
              </Text>
              <Text style={[styles.toastMessage, { color: theme.textColor }]}>
                {toastData.message}
              </Text>
            </View>
            <TouchableOpacity onPress={hideToast} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    maxWidth: 460,
    alignSelf: 'center',
    zIndex: 99999,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastIcon: {
    marginRight: 12,
  },
  textWrapper: {
    flex: 1,
    marginRight: 8,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
  }
});
