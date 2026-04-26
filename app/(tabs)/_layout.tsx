import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { RoseTheme } from '@/constants/RoseTheme';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCalories } from '../../CaloriesContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { userData, isLoaded } = useCalories();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: RoseTheme.colors.background }}>
        <ActivityIndicator size="large" color={RoseTheme.colors.primary} />
      </View>
    );
  }

  if (!userData?.profileCompleted) {
    return <Redirect href="/profile-onboarding" />;
  }

  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? Colors.dark.tint : RoseTheme.colors.primary,
        tabBarInactiveTintColor: isDark ? Colors.dark.tabIconDefault : RoseTheme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: isDark ? Colors.dark.background : RoseTheme.colors.tabBarBg,
          borderTopWidth: 2,
          borderTopColor: isDark ? '#333' : RoseTheme.colors.tabBarBorder,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        },
        tabBarLabelStyle: {
          fontFamily: 'Quicksand_600SemiBold',
          fontSize: 11,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
