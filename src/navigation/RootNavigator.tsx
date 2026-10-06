import React, { useCallback, useEffect, useState } from 'react';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Loading } from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { GroupFormScreen } from '../screens/GroupFormScreen';
import { GroupMembersScreen } from '../screens/GroupMembersScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { UsersScreen } from '../screens/UsersScreen';
import { PushStatusContext } from '../contexts/PushStatusContext';
import { colors, typography } from '../theme';
import type { NotificationPayload } from '../types/notification';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Gate de autenticacao: sem usuario, so as telas de Login e Cadastro existem.
 * No logout o usuario volta a null e a pilha autenticada e desmontada junto
 * com todos os seus listeners do Firestore e do Realtime Database.
 */
export function RootNavigator(): React.JSX.Element {
  const { user, initializing } = useAuth();
  const [pendingOpen, setPendingOpen] = useState<NotificationPayload | null>(null);
  const [navigationReady, setNavigationReady] = useState<boolean>(false);

  // Toque na notificacao: guarda o destino ate haver usuario e navegacao prontos.
  const handleOpen = useCallback((payload: NotificationPayload) => setPendingOpen(payload), []);
  const push = useNotifications(user?.uid ?? null, handleOpen);

  useEffect(() => {
    if (!pendingOpen || !user || !navigationReady || !navigationRef.isReady()) return;
    navigationRef.navigate('Chat', {
      conversationId: pendingOpen.conversationId,
      conversationType: pendingOpen.conversationType,
    });
    setPendingOpen(null);
  }, [pendingOpen, user, navigationReady]);

  const handleReady = useCallback(() => setNavigationReady(true), []);

  if (initializing) {
    return <Loading label="Verificando sessao" />;
  }

  return (
    <PushStatusContext.Provider value={push}>
      <NavigationContainer ref={navigationRef} onReady={handleReady}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.canvas },
            headerTintColor: colors.ink,
            headerTitleStyle: typography.subtitle,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.canvas },
          }}
        >
          {user ? (
            <>
              <Stack.Screen
                name="Conversations"
                component={ConversationsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen name="Users" component={UsersScreen} options={{ title: 'Usuarios' }} />
              <Stack.Screen name="GroupForm" component={GroupFormScreen} options={{ title: 'Grupo' }} />
              <Stack.Screen name="Chat" component={ChatScreen} options={{ title: '' }} />
              <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
              <Stack.Screen
                name="GroupMembers"
                component={GroupMembersScreen}
                options={{ title: 'Integrantes' }}
              />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Criar conta' }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PushStatusContext.Provider>
  );
}
