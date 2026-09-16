import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabParamList } from './types';
import { useAuth } from '../context/AuthContext';

// Pantallas
import { HomeScreen } from '../screens/HomeScreen';
import { CommunitiesScreen } from '../screens/CommunitiesScreen';
import { EventsScreen } from '../screens/EventsScreen';
import { RewardsScreen } from '../screens/RewardsScreen';
import { UserProfileScreen } from '../screens/UserProfileScreen';
import { SuperAdminPanelScreen } from '../screens/SuperAdminPanelScreen';
import { BusinessPortalScreen } from '../screens/BusinessPortalScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  const { activeProfile, isSuperAdmin, isBusinessOwner } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeCircle]}>
              <Ionicons name="home" size={20} color={focused ? '#fff' : '#0284C7'} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Communities"
        component={CommunitiesScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeCircle]}>
              <Ionicons name="people" size={20} color={focused ? '#fff' : '#0284C7'} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeCircle]}>
              <Ionicons name="calendar" size={20} color={focused ? '#fff' : '#0284C7'} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Rewards"
        component={RewardsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeCircle]}>
              <Ionicons name="gift" size={20} color={focused ? '#fff' : '#0284C7'} />
            </View>
          ),
        }}
      />

      {/* Pestaña dinámica según el rol para validación directa */}
      {isSuperAdmin ? (
        <Tab.Screen
          name="AdminOrStore"
          component={SuperAdminPanelScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={[styles.iconWrapper, focused && { backgroundColor: '#EF4444' }]}>
                <Ionicons name="shield-checkmark" size={20} color={focused ? '#fff' : '#EF4444'} />
              </View>
            ),
          }}
        />
      ) : isBusinessOwner ? (
        <Tab.Screen
          name="AdminOrStore"
          component={BusinessPortalScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={[styles.iconWrapper, focused && { backgroundColor: '#7E22CE' }]}>
                <Ionicons name="storefront" size={20} color={focused ? '#fff' : '#7E22CE'} />
              </View>
            ),
          }}
        />
      ) : null}

      <Tab.Screen
        name="Profile"
        component={UserProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeCircle]}>
              <Ionicons name="person" size={20} color={focused ? '#fff' : '#0284C7'} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    height: 62,
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  iconWrapper: {
    backgroundColor: '#F0F9FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircle: {
    backgroundColor: '#0284C7',
  },
});
