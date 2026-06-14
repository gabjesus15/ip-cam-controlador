import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import CameraGridScreen from './src/screens/CameraGridScreen';
import CameraSingleScreen from './src/screens/CameraSingleScreen';
import AddCameraScreen from './src/screens/AddCameraScreen';
import ScanScreen from './src/screens/ScanScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { COLORS } from './src/theme';

const Stack = createStackNavigator();

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor={COLORS.bg} />
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerStyle: {
                backgroundColor: COLORS.bg,
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
              },
              headerTintColor: COLORS.text,
              headerTitleStyle: {
                fontWeight: '500',
                fontSize: 16,
              },
              cardStyle: {
                backgroundColor: COLORS.bg,
              },
            }}
          >
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }} // Custom header in HomeScreen
            />
            <Stack.Screen
              name="CameraGrid"
              component={CameraGridScreen}
              options={{ title: 'Todas las Cámaras' }}
            />
            <Stack.Screen
              name="CameraSingle"
              component={CameraSingleScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddCamera"
              component={AddCameraScreen}
              options={{ title: 'Agregar Cámara' }}
            />
            <Stack.Screen
              name="Scan"
              component={ScanScreen}
              options={{ title: 'Escanear Red Local' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Preferencias' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
