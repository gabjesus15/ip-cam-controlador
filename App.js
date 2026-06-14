import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import CameraGridScreen from './src/screens/CameraGridScreen';
import CameraSingleScreen from './src/screens/CameraSingleScreen';
import AddCameraScreen from './src/screens/AddCameraScreen';

const Stack = createStackNavigator();

const COLORS = {
  bg: '#0a0a0a',
  surface: '#141414',
  text: '#fff',
  accent: '#00d4ff',
};

export default function App() {
  return (
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
              borderBottomColor: '#222',
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
            options={{ title: 'Cámaras IP' }}
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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
