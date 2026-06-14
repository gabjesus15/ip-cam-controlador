import { useRef, useCallback } from 'react';
import { Animated, Easing, Platform } from 'react-native';

/**
 * Hook for micro-interactions and animations
 * @returns {Object} Animation utilities and presets
 */
export const useMicroInteractions = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const translateAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const pulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start();
  }, [scaleAnim]);

  const pressIn = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [scaleAnim]);

  const pressOut = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [scaleAnim]);

  const fadeIn = useCallback((duration = 300) => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [opacityAnim]);

  const fadeOut = useCallback((duration = 300) => {
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration,
      useNativeDriver: true,
      easing: Easing.in(Easing.ease),
    }).start();
  }, [opacityAnim]);

  const slideIn = useCallback((direction = 'right', duration = 300) => {
    const toValue = direction === 'right' ? 0 : direction === 'left' ? 0 : 0;
    const fromValue = direction === 'right' ? 100 : direction === 'left' ? -100 : 0;
    
    translateAnim.setValue(fromValue);
    Animated.timing(translateAnim, {
      toValue,
      duration,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [translateAnim]);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(translateAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(translateAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(translateAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(translateAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(translateAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [translateAnim]);

  const rotate = useCallback(() => {
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
      easing: Easing.linear,
    }).start(() => {
      rotateAnim.setValue(0);
    });
  }, [rotateAnim]);

  const getScaleStyle = useCallback(() => ({
    transform: [{ scale: scaleAnim }],
  }), [scaleAnim]);

  const getOpacityStyle = useCallback(() => ({
    opacity: opacityAnim,
  }), [opacityAnim]);

  const getTranslateStyle = useCallback(() => ({
    transform: [{ translateX: translateAnim }],
  }), [translateAnim]);

  const getRotateStyle = useCallback(() => ({
    transform: [
      {
        rotate: rotateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  }), [rotateAnim]);

  const vibrate = useCallback(() => {
    if (Platform.OS === 'web') {
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } else {
      // React Native vibration
      const { Vibration } = require('react-native');
      Vibration.vibrate(50);
    }
  }, []);

  const spring = useCallback((toValue, callback) => {
    Animated.spring(scaleAnim, {
      toValue,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start(callback);
  }, [scaleAnim]);

  return {
    pulse,
    pressIn,
    pressOut,
    fadeIn,
    fadeOut,
    slideIn,
    shake,
    rotate,
    vibrate,
    spring,
    getScaleStyle,
    getOpacityStyle,
    getTranslateStyle,
    getRotateStyle,
    scaleAnim,
    opacityAnim,
    translateAnim,
    rotateAnim,
  };
};

export default useMicroInteractions;
