import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

import App from './App';

// Silence annoying third-party deprecation warnings in developer console
LogBox.ignoreLogs([
  'shadow* style props are deprecated',
  '[expo-av]: Expo AV has been deprecated',
  'props.pointerEvents is deprecated',
  'Blocked aria-hidden on an element',
]);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

