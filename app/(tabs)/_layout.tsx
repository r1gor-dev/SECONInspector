import { Tabs } from 'expo-router';
import React from 'react';
import { DatabaseProvider } from '../../database/dbcontext';

export default function TabLayout() {
  return (
    <DatabaseProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
      />
    </DatabaseProvider>
  );
}
