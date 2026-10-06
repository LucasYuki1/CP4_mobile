import { createContext } from 'react';

import type { UseNotificationsResult } from '../hooks/useNotifications';

/** Estado do registro de push, exibido na tela de Conversas. */
export const PushStatusContext = createContext<UseNotificationsResult>({
  status: 'pending',
  message: null,
  retry: () => undefined,
});
