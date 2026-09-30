import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import { ForceUpdateModal } from './src/components/ForceUpdateModal';
import { checkAppUpdates, subscribeToAppForeground, UpdateCheckResult } from './src/services/appUpdateService';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>🐶 Juntitas: Algo salió mal</Text>
          <Text style={styles.errorMessage}>{this.state.error?.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    // 1. Comprobación inicial al arrancar la app
    const performUpdateCheck = async () => {
      try {
        const result = await checkAppUpdates();
        if (result.isAvailable) {
          setUpdateInfo(result);
          setShowUpdateModal(true);
        }
      } catch (err) {
        console.warn('Error en comprobación inicial de actualización:', err);
      }
    };

    performUpdateCheck();

    // 2. Suscribirse al evento de entrar/salir de la app (vuelve de background a foreground)
    const unsubscribe = subscribeToAppForeground(() => {
      performUpdateCheck();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider style={styles.container}>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <View style={styles.container}>
              <StatusBar style="dark" />
              <AppNavigator />
              <ForceUpdateModal
                visible={showUpdateModal}
                updateInfo={updateInfo}
                onClose={() => setShowUpdateModal(false)}
              />
            </View>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: (Platform.OS === 'web' ? '100vh' : '100%') as any,
    width: '100%',
    backgroundColor: '#F8FAFC',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
});
