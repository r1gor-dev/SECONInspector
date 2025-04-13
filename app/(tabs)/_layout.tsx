import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons'; // или другой набор иконок
import { DatabaseProvider } from '../../database/dbcontext';

export default function TabLayout() {
  return (
    <DatabaseProvider>
      <Tabs
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string;

            if (route.name === 'index') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'explore') {
              iconName = focused ? 'search' : 'search-outline';
            } else {
              iconName = 'ellipse';
            }

            return <Ionicons name={iconName as any} size={size} color={color} />;
          },
          tabBarActiveTintColor: 'tomato',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Главная',
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Объекты',
          }}
        />
      </Tabs>
    </DatabaseProvider>
  );
}
