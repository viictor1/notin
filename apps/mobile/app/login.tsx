import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../constants/theme';
import {
  authService,
  setAccessToken,
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
} from '../services/api';

export default function Login() {
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const t = useTheme();

  const handleBiometric = async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Acesse o notin',
      fallbackLabel: 'Usar senha',
    });

    if (!result.success) return;

    try {
      const { data } = await authService.refresh(refreshToken);
      setAccessToken(data.accessToken);
      await saveRefreshToken(data.refreshToken);
      router.replace('/notes');
    } catch {
      await deleteRefreshToken();
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.bg }]}
      behavior="height"
    >
      <View style={styles.inner}>
        <Text style={[styles.logo, { color: t.text }]}>notin</Text>
        <Text style={[styles.subtitle, { color: t.textMuted }]}>
          cofre pessoal
        </Text>

        <View style={styles.form}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Senha"
            placeholderTextColor={t.textMuted}
            secureTextEntry
            autoFocus
            onSubmitEditing={() => login(password)}
            returnKeyType="go"
            style={[
              styles.input,
              {
                backgroundColor: t.surface,
                borderColor: t.border,
                color: t.text,
              },
            ]}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            onPress={() => login(password)}
            disabled={loading || !password}
            style={[
              styles.button,
              {
                backgroundColor: t.primary,
                opacity: loading || !password ? 0.4 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#F3F4F4" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </Pressable>

          <Pressable onPress={handleBiometric} style={styles.biometricButton}>
            <Text style={[styles.biometricText, { color: t.textMuted }]}>
              Usar biometria
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 40,
  },
  form: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
  },
  error: {
    color: '#e53e3e',
    fontSize: 13,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#F3F4F4',
    fontWeight: '600',
    fontSize: 15,
  },
  biometricButton: {
    alignItems: 'center',
    padding: 12,
  },
  biometricText: {
    fontSize: 14,
  },
});
