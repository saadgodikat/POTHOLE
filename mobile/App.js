// ─────────────────────────────────────────────────────────────────────────────
// App.js — Root navigation for StreetIntel (light mode + About tab)
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator }     from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen            from './src/screens/HomeScreen';
import CaptureScreen         from './src/screens/CaptureScreen';
import ReportScreen          from './src/screens/ReportScreen';
import ReportsListScreen     from './src/screens/ReportsListScreen';
import SubmissionResultScreen from './src/screens/SubmissionResultScreen';
import MapPickerScreen        from './src/screens/MapPickerScreen';
import HeatmapScreen          from './src/screens/HeatmapScreen';
import AboutScreen            from './src/screens/AboutScreen';
import ReportDetailScreen     from './src/screens/ReportDetailScreen';
import { COLORS, FONTS } from './src/theme';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const BASE_HEADER = {
  headerStyle: {
    backgroundColor: COLORS.bgCard,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTintColor:      COLORS.primary,
  headerTitleStyle:     { fontWeight: '700', fontSize: FONTS.md, color: COLORS.text, letterSpacing: 0.2 },
  headerBackTitleVisible: false,
};

// ── Main stack: Dashboard → Capture → Report ─────────────────────────────────
function MainStack() {
  return (
    <Stack.Navigator screenOptions={BASE_HEADER}>
      <Stack.Screen name="Dashboard" component={HomeScreen}            options={{ title: 'StreetIntel' }} />
      <Stack.Screen name="Capture"   component={CaptureScreen}         options={{ headerShown: false }} />
      <Stack.Screen name="Report"    component={ReportScreen}          options={{ title: 'Submit Report' }} />
      <Stack.Screen name="Result"    component={SubmissionResultScreen} options={{ title: 'Submitted', headerLeft: () => null }} />
      <Stack.Screen name="MapPicker" component={MapPickerScreen}        options={{ title: 'Pick Location' }} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen}  options={{ title: 'Report Details' }} />
    </Stack.Navigator>
  );
}

// ── Root tabs ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: COLORS.bgCard,
              borderTopColor:  COLORS.border,
              borderTopWidth:  1,
              height: 64,
              paddingBottom: 10,
              paddingTop: 6,
            },
            tabBarActiveTintColor:   COLORS.primary,
            tabBarInactiveTintColor: COLORS.textMuted,
            tabBarLabelStyle: { fontSize: FONTS.xs, fontWeight: '600', marginTop: 2 },
            tabBarIcon: ({ color, focused }) => {
              if (route.name === 'Home')    return <Feather name="home" size={20} color={color} />;
              if (route.name === 'Reports') return <Feather name="list" size={20} color={color} />;
              if (route.name === 'About')   return <Feather name="info" size={20} color={color} />;
              if (route.name === 'Heatmap') return (
                <MaterialCommunityIcons
                  name={focused ? 'map-marker-radius' : 'map-marker-radius-outline'}
                  size={22}
                  color={color}
                />
              );
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
          {/* Phase 4: Heatmap tab */}
          <Tab.Screen
            name="Heatmap"
            component={HeatmapScreen}
            options={{
              title: 'Heatmap',
              headerShown: false,
              ...BASE_HEADER,
              headerTitle: 'Heatmap',
            }}
          />
          <Tab.Screen
            name="About"
            component={AboutScreen}
            options={{
              title: 'About',
              headerShown: true,
              ...BASE_HEADER,
              headerTitle: 'About & How to Use',
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
