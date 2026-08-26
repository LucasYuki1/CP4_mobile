import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet } from 'react-native';

import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { ChatScreen } from '../screens/ChatScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { UsersScreen } from '../screens/UsersScreen';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, typography } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Gate de autenticacao: enquanto nao ha usuario no contexto, o stack
 * autenticado sequer e montado. Depois do logout o estado volta a null e
 * a arvore de telas do chat e desmontada junto com seus listeners.
 */
export function RootNavigator(): React.JSX.Element {
  const { user, initializing, profileError } = useAuth();

  if (initializing) {
    return <Loading label="Verificando sessao" />;
  }

  if (!user) {
    return (
      <>
        {profileError ? (
          <View style={styles.banner}>
            <ErrorMessage message={profileError} />
          </View>
        ) : null}
        <LoginScreen />
      </>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.canvas },
          headerTintColor: colors.ink,
          headerTitleStyle: typography.subtitle,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen
          name="Users"
          component={UsersScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Negociacao' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  banner: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, backgroundColor: colors.canvas },
});
