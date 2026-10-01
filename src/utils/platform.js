import { Capacitor } from '@capacitor/core';

export const isNativeApp = Capacitor.isNativePlatform() || navigator.userAgent.toLowerCase().includes('electron');
