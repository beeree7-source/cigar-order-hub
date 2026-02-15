import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Authentication service with biometric support
 */

export const checkBiometricSupport = async (): Promise<boolean> => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return false;
  }
};

export const authenticateWithBiometric = async (): Promise<boolean> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access your account',
      fallbackLabel: 'Use passcode',
    });
    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
};

export const saveCredentials = async (email: string, token: string) => {
  try {
    await SecureStore.setItemAsync('userEmail', email);
    await SecureStore.setItemAsync('userToken', token);
  } catch (error) {
    console.error('Error saving credentials:', error);
  }
};

export const getStoredCredentials = async () => {
  try {
    const email = await SecureStore.getItemAsync('userEmail');
    const token = await SecureStore.getItemAsync('userToken');
    return { email, token };
  } catch (error) {
    console.error('Error getting credentials:', error);
    return { email: null, token: null };
  }
};

export const clearCredentials = async () => {
  try {
    await SecureStore.deleteItemAsync('userEmail');
    await SecureStore.deleteItemAsync('userToken');
  } catch (error) {
    console.error('Error clearing credentials:', error);
  }
};

export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await SecureStore.getItemAsync('biometricEnabled');
    return enabled === 'true';
  } catch (error) {
    return false;
  }
};

export const setBiometricEnabled = async (enabled: boolean) => {
  try {
    await SecureStore.setItemAsync('biometricEnabled', enabled ? 'true' : 'false');
  } catch (error) {
    console.error('Error setting biometric preference:', error);
  }
};
