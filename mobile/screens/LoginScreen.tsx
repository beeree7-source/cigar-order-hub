import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { authService } from '../services/api';
import {
  checkBiometricSupport,
  authenticateWithBiometric,
  saveCredentials,
  setBiometricEnabled,
  isBiometricEnabled,
} from '../services/auth';

export default function LoginScreen({ navigation }: any) {
  // DEVELOPMENT ONLY: Remove these default values in production
  // These credentials are for testing purposes only
  const [email, setEmail] = useState(__DEV__ ? 'supplier@test.com' : '');
  const [password, setPassword] = useState(__DEV__ ? 'password123' : '');
  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);

  React.useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const supported = await checkBiometricSupport();
    setBiometricSupported(supported);
    const enabled = await isBiometricEnabled();
    setUseBiometric(enabled && supported);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(email, password);
      
      if (response.token) {
        await saveCredentials(email, response.token);
        
        if (useBiometric && biometricSupported) {
          await setBiometricEnabled(true);
        }
        
        // Navigation will be handled by RootNavigator
        navigation.replace('Dashboard');
      }
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.response?.data?.error || 'Invalid credentials'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    const success = await authenticateWithBiometric();
    if (success) {
      // In a real app, you'd retrieve stored token here
      navigation.replace('Dashboard');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Cigar Order Hub</Text>
        <Text style={styles.subtitle}>Mobile App</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        {biometricSupported && (
          <View style={styles.biometricContainer}>
            <Text style={styles.biometricLabel}>Enable Biometric Login</Text>
            <Switch
              value={useBiometric}
              onValueChange={setUseBiometric}
              disabled={loading}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        {biometricSupported && (
          <TouchableOpacity
            style={[styles.button, styles.biometricButton]}
            onPress={handleBiometricLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Use Biometric</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => Alert.alert('Info', 'Registration not implemented in mobile demo')}
          disabled={loading}
        >
          <Text style={styles.linkText}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e3a8a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1e3a8a',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  biometricButton: {
    backgroundColor: '#0f766e',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  biometricContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 10,
  },
  biometricLabel: {
    fontSize: 16,
    color: '#334155',
  },
  linkText: {
    color: '#1e3a8a',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});
