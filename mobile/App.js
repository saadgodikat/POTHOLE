// ─────────────────────────────────────────────────────────────────────────────
// App.js — Root navigation for RoadWatch (vector icon tab bar)
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import HomeScreen            from './src/screens/HomeScreen';
import CaptureScreen         from './src/screens/CaptureScreen';
import ReportScreen          from './src/screens/ReportScreen';
import ReportsListScreen      from './src/screens/ReportsListScreen';
import SubmissionResultScreen from './src/screens/SubmissionResultScreen';
import MapPickerScreen        from './src/screens/MapPickerScreen';
import { COLORS, FONTS } from './src/theme';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const BASE_HEADER = {
  headerStyle: {
    backgroundColor: COLORS.bg,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    elevation: 0,
  },
  headerTintColor:  COLORS.text,
  headerTitleStyle: { fontWeight: '700', fontSize: FONTS.md, letterSpacing: 0.2 },
  headerBackTitleVisible: false,
};

// ── Main stack: Dashboard → Capture → Report ─────────────────────────────────
function MainStack() {
  return (
    <Stack.Navigator screenOptions={BASE_HEADER}>
      <Stack.Screen name="Dashboard" component={HomeScreen}            options={{ title: 'RoadWatch' }} />
      <Stack.Screen name="Capture"   component={CaptureScreen}         options={{ title: 'Capture Defect', headerTransparent: true, headerTitle: '' }} />
      <Stack.Screen name="Report"    component={ReportScreen}          options={{ title: 'Submit Report' }} />
      <Stack.Screen name="Result"    component={SubmissionResultScreen} options={{ title: 'Submitted', headerLeft: () => null }} />
      <Stack.Screen name="MapPicker" component={MapPickerScreen}        options={{ title: 'Pick Location' }} />
    </Stack.Navigator>
  );
}

// ── Root tabs ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            height: 62,
            paddingBottom: 10,
            paddingTop: 6,
          },
          tabBarActiveTintColor:   COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarLabelStyle: { fontSize: FONTS.xs, fontWeight: '600', marginTop: 2 },
          tabBarIcon: ({ color, size }) => {
            const icons = { Home: 'home', Reports: 'list' };
            return <Feather name={icons[route.name]} size={20} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home"    component={MainStack}        options={{ title: 'Home' }} />
        <Tab.Screen
          name="Reports"
          component={ReportsListScreen}
          options={{
            title: 'Reports',
            headerShown: true,
            ...BASE_HEADER,
            headerTitle: 'Reports',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
