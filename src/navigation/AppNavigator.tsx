import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { BottomTabNavigator } from './BottomTabNavigator';
import { DogPassportScreen } from '../screens/DogPassportScreen';
import { SuperAdminPanelScreen } from '../screens/SuperAdminPanelScreen';
import { BusinessPortalScreen } from '../screens/BusinessPortalScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { AccountPendingScreen } from '../screens/AccountPendingScreen';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { sessionState, startAuthFlow, backToOnboarding, loginAsSuperAdmin } = useAuth();

  if (sessionState === 'onboarding') {
    return (
      <OnboardingScreen
        onStartRegister={() => startAuthFlow('register')}
        onStartLogin={() => startAuthFlow('login')}
        onQuickAdminAccess={loginAsSuperAdmin}
      />
    );
  }

  if (sessionState === 'auth') {
    return (
      <AuthScreen 
        onBackToOnboarding={backToOnboarding}
      />
    );
  }

  if (sessionState === 'pending_approval') {
    return <AccountPendingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="HomeTabs" 
          component={BottomTabNavigator} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="DogPassport" 
          component={DogPassportScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="SuperAdminPanel" 
          component={SuperAdminPanelScreen} 
          options={{ title: 'Panel CRM Super Administrador' }} 
        />
        <Stack.Screen 
          name="BusinessPortal" 
          component={BusinessPortalScreen} 
          options={{ title: 'Portal de Tiendas & Stands' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
