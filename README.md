# Chat Firebase

Aplicativo de chat em React Native com TypeScript e Firebase. Tem conversas
individuais e em grupo entre usuários autenticados por e-mail e senha, mensagens
sincronizadas em tempo real e notificações push. Quem recebe cada push é definido
pela política configurada no grupo. O envio é feito por uma API própria,
publicada na internet.

## Integrantes

- RM554865 — Lucas Henzo Ide Yuki
- RM555469 — Vitor Augusto França de Oliveira

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| App | React Native 0.83, React 19.2, **Expo SDK 55** (development build, New Architecture) |
| Linguagem | TypeScript em modo estrito (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), sem `any` |
| Navegação | React Navigation 7 (native stack) |
| Backend (BaaS) | Firebase JS SDK 12: Authentication, Realtime Database, Cloud Firestore, Storage |
| Push | `expo-notifications` + Firebase Cloud Messaging (Android) e Expo Push Service/APNs (iOS) |
| Imagens | `expo-image-picker` + Firebase Storage |
| API | Node.js 22 + Express 5 + Firebase Admin SDK 13 (TypeScript), hospedada no Render |

## Serviços Firebase e responsabilidades

| Serviço | Responsabilidade |
| --- | --- |
| **Authentication** | Cadastro e login **somente** por e-mail e senha, recuperação da sessão (AsyncStorage), identificação pelo `uid` e logout. |
| **Realtime Database** | Todas as mensagens (individuais e de grupo) em `messages/{conversationId}/{messageId}`, com listeners em tempo real. Guarda também o espelho `groupMembers/{groupId}`, escrito apenas pela API, que as regras usam para autorizar mensagens de grupo. |
| **Cloud Firestore** | Perfis (`users`), cartões públicos (`publicProfiles`), conversas individuais (`directConversations`), grupos com integrantes, limite e política de notificação (`groups`), tokens de dispositivos (`users/{uid}/devices`) e controle de idempotência do push (`notificationDispatches`, só a API acessa). |
| **Cloud Messaging (FCM)** | Entrega do push no Android, disparado pela API com o Admin SDK. O payload leva `conversationId`, `conversationType` e `messageId`. |
| **Storage** | Fotos de perfil (`profilePhotos/{uid}/…`) e de grupo (`groupPhotos/{groupId}/…`). No Firestore fica só a URL final. |

Cloud Functions não é usado.

### Modelo de dados

```
Firestore
users/{uid}                     name, email, phoneNumber, birthDate, photoUrl, createdAt
users/{uid}/devices/{deviceId}  token, provider ('fcm'|'expo'), platform, enabled, updatedAt
publicProfiles/{uid}            name, nameLower, photoUrl        (listagem e busca)
directConversations/{uidA_uidB} participantIds, createdAt
groups/{groupId}                name, photoUrl, ownerId, memberIds, memberLimit,
                                notificationPolicy, notificationUpdatedBy, createdAt, updatedAt
notificationDispatches/{cid__mid}  status, recipients...          (somente API)

Realtime Database
messages/{conversationId}/{messageId}
  conversationType, senderId, text, target {type, memberId?}, mentionedUserIds {uid: true}, createdAt
groupMembers/{groupId}/{uid}: true                                (somente API escreve)
```

O id da conversa individual é formado pelos dois `uid` em ordem, unidos por `_`.
Assim nunca existem duas conversas para o mesmo par de usuários, a conversa sempre
tem exatamente dois participantes e ninguém consegue conversar consigo mesmo (as
regras recusam `uid_uid`). Os ids de grupo são ids automáticos do Firestore, que
não contêm `_`. Isso permite que as regras do RTDB saibam se uma conversa é direta
ou de grupo só olhando o id.

As menções ficam como mapa (`{uid: true}`) porque o Realtime Database não guarda
arrays vazios. No app, o tipo `ChatMessage` expõe `mentionedUserIds: string[]`.

## Instalação e execução do app

O push não funciona no Expo Go, então o app roda em um **development build**.

```bash
npm install
npx expo prebuild --clean
npx expo run:android          # ou: npx expo run:ios (exige macOS)
npm start                     # dia a dia, com o app ja instalado
```

Sem Android SDK local, gere o APK na nuvem:

```bash
npx eas-cli build --platform android --profile preview
```

Verificações:

```bash
npm run typecheck             # app, sem any
npm run test:rules            # 45 casos das regras do Firestore e do RTDB nos emuladores (exige Java)
cd server && npm test         # testes das politicas de notificacao
```

## Configuração do Firebase

1. **`firebaseConfig.json`** (raiz, versionado). Contém apenas a configuração do
   SDK cliente (Console > Configurações do projeto > Seus apps > App da Web). Não
   tem nenhuma credencial administrativa. É lido em `src/services/firebase.ts`,
   que avisa claramente se algum campo ficou sem preencher.
2. **Authentication** > Sign-in method: habilite **somente E-mail/senha**.
3. **Firestore**, **Realtime Database** e **Storage**: crie os três no mesmo projeto.
4. **Regras**: `npm run deploy:rules` publica `firestore.rules`,
   `database.rules.json` e `storage.rules`.
5. **Android (FCM)**: registre o app Android `com.fiap.cp.mobile`, baixe o
   `google-services.json` para a raiz do projeto (ele é usado no build) e verifique
   se a *Firebase Cloud Messaging API (V1)* está ativa no Google Cloud.
6. `.env` (opcional): copie `.env.example` para mudar a URL da API. Sem ele, o app
   usa a URL publicada que está em `src/config/api.ts`.

## Armazenamento de fotos: Firebase Storage

- O usuário escolhe a foto na galeria com `expo-image-picker`. Antes, o app pede a
  permissão de acesso às fotos. Se ela for negada, aparece uma mensagem explicando
  como liberar.
- O arquivo vai para o Firebase Storage (`src/services/storageService.ts`). No
  Firestore é salva **apenas a URL** retornada por `getDownloadURL`. Nenhuma
  imagem é gravada em Base64.
- O componente `Avatar` mostra uma imagem padrão (as iniciais do nome) quando
  não há foto ou quando ela não carrega.
- `storage.rules`: cada usuário só envia a própria foto de perfil. A foto do grupo
  só pode ser enviada pelo proprietário, o que é conferido no Firestore com
  `firestore.get`. Os arquivos precisam ser imagens com menos de 5 MB.
- Configuração: Console > Storage > Começar, depois `npm run deploy:rules`.

## Notificações push

### Android
- O app registra o **token nativo do FCM** (`getDevicePushTokenAsync`) em
  `users/{uid}/devices/{deviceId}` com `provider: 'fcm'`.
- A API envia com `admin.messaging().sendEachForMulticast`, usando o canal
  `messages` (prioridade alta). Isso funciona com o app em primeiro plano, em
  segundo plano ou fechado.
- É preciso ter o `google-services.json` e um development build ou APK. No
  Android 13 ou superior, o app pede a permissão `POST_NOTIFICATIONS`.

### iOS
- O token nativo do iOS é APNs, e o FCM Admin não aceita esse token sem o SDK
  nativo do Firebase. Por isso, no iOS o app registra o **Expo Push Token**
  (`provider: 'expo'`) e a API envia pelo **Expo Push Service**, que entrega via
  APNs.
- É preciso ter uma conta Apple Developer e rodar `eas credentials` para gerar a
  chave APNs. Não funciona no simulador: o teste exige um iPhone físico com
  development build.

### Toque, token e logout
- Ao tocar na notificação, o app abre a conversa indicada por `conversationId` e
  `conversationType`. Isso vale com o app em segundo plano e também com ele fechado
  (`getLastNotificationResponseAsync`).
- Quando o FCM troca o token, `addPushTokenListener` grava o novo valor.
- No logout, o dispositivo recebe `enabled: false`, e o usuário anterior deixa de
  receber push naquele aparelho.
- Permissão negada, aparelho sem suporte e falha ao obter o token aparecem como
  aviso na tela de Conversas, com opção de tentar de novo.

## Política de notificações

Cada grupo tem `notificationPolicy`, que só o proprietário altera. Quem recebe o
push é calculado **na API** (`server/src/services/recipientResolver.ts`, com
testes):

| Política | Quem recebe o push |
| --- | --- |
| `all_group_messages` | Todos os integrantes, exceto o remetente. |
| `mentioned_members` | Só quem foi mencionado (`@Nome` ou marcado no botão **@**) ou escolhido como destinatário. |
| `direct_messages_only` | Ninguém: mensagens do grupo não geram push. As conversas individuais continuam notificando. |
| `disabled` | Ninguém recebe push deste grupo. |

Conversas individuais sempre notificam o outro participante.

Regras gerais: o remetente nunca é notificado, só participantes **atuais** recebem
(menções a quem saiu do grupo são descartadas) e tokens recusados pelo FCM ou pelo
Expo (`registration-token-not-registered`, `DeviceNotRegistered`) são desativados.
O texto do push **não inclui o conteúdo da mensagem**, só quem enviou ("Fulano
enviou uma nova mensagem" ou "Fulano mencionou você").

No chat, o botão **@** abre a lista de integrantes. Sem ninguém selecionado, a
mensagem é geral. Com um integrante, ela é direcionada a ele (`target.type =
'member'`). Com vários, vira uma mensagem geral com menções. Em todos os casos a
mensagem continua no histórico do grupo.

## API de notificações

- **Tecnologia**: Node.js 22, Express 5, Firebase Admin SDK e TypeScript, na pasta
  `server/`.
- **URL pública**: https://chat-firebase-api.onrender.com
- **Health check**: `GET https://chat-firebase-api.onrender.com/health` →
  `{"status":"ok","uptimeSeconds":…}`
  - O plano gratuito do Render hiberna depois de 15 min sem uso. A primeira
    chamada pode levar cerca de 50 s, e o app espera até 60 s.

### Endpoints

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/health` | Disponibilidade (público). |
| `POST` | `/notifications/messages` | Body `{ conversationId, messageId }`. Dispara o push de uma mensagem já persistida. |
| `POST` | `/groups/:groupId/sync` | Copia os integrantes do Firestore para o espelho `groupMembers` do RTDB. |
| `GET` | `/profiles/:uid` | Perfil de um usuário com quem se compartilha um grupo. |

Todas as rotas, menos `/health`, exigem `Authorization: Bearer <Firebase ID Token>`.

### Fluxo de `POST /notifications/messages`

1. Valida o ID token com `verifyIdToken` (inclui revogação).
2. Lê a mensagem no RTDB e confirma que ela existe e que `senderId` é o usuário
   autenticado.
3. Lê no Firestore os participantes e a política. O remetente precisa ser um
   participante ativo.
4. **Idempotência**: cria `notificationDispatches/{conversationId}__{messageId}`
   com `create()`, que falha se o documento já existir. Uma requisição repetida,
   mesmo simultânea, recebe `{"status":"duplicate"}` e não gera um segundo push.
5. Calcula os destinatários no servidor. A lista **nunca** vem do app.
6. Envia pelo FCM (Android) e pelo Expo Push (iOS) e desativa os tokens inválidos.

### Configurar, executar e publicar

```bash
cd server
cp .env.example .env         # preencher localmente (nunca versionar)
npm install
npm run dev                  # http://localhost:3000/health
```

Variáveis (os valores reais ficam **só** nas variáveis secretas do Render):
`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`,
`FIREBASE_DATABASE_URL`, além de `PORT` e `NODE_VERSION`, que o Render define.

Publicação no Render:
1. Render > **New > Blueprint** > selecione este repositório. O `render.yaml`
   cria o serviço `chat-firebase-api` com `rootDir: server`, build, start e o
   health check.
2. Preencha as quatro variáveis secretas. Cole a chave privada com as quebras
   `\n`, como no JSON.
3. Conta de serviço com **permissões mínimas**: crie uma conta de serviço dedicada
   no Google Cloud IAM com os papéis *Cloud Datastore User* (Firestore), *Firebase
   Realtime Database Admin* e *Firebase Cloud Messaging API Admin*. Não use a
   conta padrão com papel de Editor.

Nenhum `serviceAccountKey.json` é versionado. O `.gitignore` bloqueia esses
arquivos.

## Limite de integrantes e concorrência

- O limite é definido na criação do grupo. Precisa ser um inteiro entre 2 e 50 e
  inclui o proprietário.
- Só o proprietário altera o limite, e ele não pode ficar abaixo da quantidade
  atual de integrantes.
- A interface mostra quantos integrantes o grupo tem e quantas vagas restam, e
  bloqueia a seleção quando o limite é atingido.
- **No banco**: `firestore.rules` exige `memberIds.size() <= memberLimit` e
  `memberLimit` inteiro em toda criação e atualização. As regras são avaliadas no
  **commit** de cada escrita, sobre o estado real do documento. Duas adições
  concorrentes (mesmo com `arrayUnion`) nunca passam juntas do limite: a segunda
  é recusada.
- **No app**: toda alteração de integrantes e de limite roda em
  `runTransaction`. O Firestore relê o documento e repete a operação se houver
  outra escrita no meio.
- O teste `adicoes concorrentes nao estouram o limite` em
  `tests/rules/rules.test.mjs` dispara duas adições simultâneas pela última vaga:
  só uma é aceita.

## Regras de segurança

Arquivos versionados: `firestore.rules`, `database.rules.json` e `storage.rules`.
Nenhuma regra fica aberta: a raiz do RTDB nega tudo.

- **Autenticação**: toda leitura e escrita exige usuário autenticado.
- **Mensagens (RTDB)**: na conversa direta, só os dois `uid` presentes no id leem
  e escrevem. No grupo, só quem está em `groupMembers/{groupId}`. O `senderId`
  precisa ser `auth.uid`, as mensagens não podem ser editadas nem apagadas, e o
  `target.memberId` e as menções precisam ser participantes.
- **Usuários removidos**: quando o proprietário remove alguém, a API atualiza
  `groupMembers`, e o removido perde leitura e escrita das mensagens. No Firestore,
  ele deixa de ler o grupo porque não está mais em `memberIds`.
- **Grupos**: só o proprietário gerencia integrantes, o limite e a política. Um
  integrante comum só pode sair do grupo.
- **Perfis**: `users/{uid}` só pode ser lido pelo próprio usuário ou por quem tem
  uma conversa individual com ele (checado com `exists()` no id determinístico).
  Nome e foto ficam em `publicProfiles`, para listar e buscar.
- **Tokens**: `users/{uid}/devices` só pode ser lido e escrito pelo dono.

### Validações que dependem dos dois bancos ficam na API

As regras do RTDB não leem o Firestore, e as do Firestore não leem o RTDB. Por
isso:

- confirmar que a mensagem (RTDB) é do usuário e que ele participa da conversa
  (Firestore) antes do push é feito em `POST /notifications/messages`;
- manter `groupMembers` (RTDB) igual a `memberIds` (Firestore, a fonte da verdade)
  é feito em `POST /groups/:groupId/sync`, que só a API escreve;
- liberar o perfil de quem compartilha um **grupo** é feito em
  `GET /profiles/:uid`, porque uma regra não sabe em qual grupo procurar.

## Estrutura do projeto

```
firebaseConfig.json          configuracao do SDK cliente (sem segredos)
firestore.rules              regras do Firestore
database.rules.json          regras do Realtime Database
storage.rules                regras do Storage
render.yaml                  deploy da API no Render
tests/rules/rules.test.mjs   45 casos das regras nos emuladores
src/
  components/   Avatar, Banner, ChatBubble, ChatInput, ConversationItem, EmptyState,
                ErrorMessage, FormField, GroupMemberItem, Loading, PhotoPicker,
                PolicySelector, PrimaryButton, UserItem
  screens/      Login, Register, Conversations, Users, GroupForm, Chat, Profile, GroupMembers
  services/     firebase, authService, userService, chatService, groupService,
                notificationService, storageService, apiClient
  hooks/        useAuth, useChat, useGroups, useConversations, usePublicProfiles, useNotifications
  contexts/     AuthContext, PushStatusContext
  navigation/   RootNavigator (gate de autenticacao + abertura por notificacao), types
  types/        user, chat, group, notification
  utils/        conversationId, groupValidation, profileValidation, errors
  config/       api (URL da API)
server/
  src/
    app.ts
    middleware/authenticate.ts
    routes/       notifications.ts, groups.ts, profiles.ts
    services/     firebaseAdmin.ts, notificationSender.ts, recipientResolver.ts (+ .test.ts),
                  conversationRepository.ts
```

## Hooks, tipagem e estado

- `useState`: formulários, listas, loading, erros e seleção de integrantes.
- `useEffect`: `onAuthStateChanged`, listeners do Firestore e do RTDB, registro de
  push e toque em notificações. Todos têm função de limpeza, removida ao desmontar
  a tela, ao trocar de conversa ou no logout.
- `useMemo`: busca de usuários, validação dos formulários, ordenação das mensagens,
  junção de conversas diretas e grupos, cálculo de vagas.
- `useCallback`: handlers passados a `FlatList` e a componentes memoizados, `send`,
  `logout`.
- Hooks próprios: `useAuth`, `useChat`, `useGroup`/`useMyGroups`,
  `useConversations`, `usePublicProfiles` e `useNotifications`.
- Sem `any`. Os dados lidos do Firebase entram como `unknown` e são convertidos por
  funções de leitura com checagem de tipo. Os parâmetros de navegação ficam em
  `RootStackParamList`.
- As atualizações de estado não alteram arrays nem objetos existentes:
  `[...previous, message]`, `previous.map(...)` e `filter`.

## Logout

A sessão é encerrada no Firebase Auth, o dispositivo é desativado para push e o
usuário sai do contexto. A pilha autenticada é desmontada junto com todos os
listeners, e a navegação volta para Login. As regras impedem que o usuário
anterior continue acessando os dados.

## Prints das telas

> Coloque as capturas em `docs/prints/` com os nomes abaixo.

| Login | Cadastro | Conversas | Usuários |
| --- | --- | --- | --- |
| ![Login](docs/prints/login.jpeg) | ![Cadastro](docs/prints/cadastro.jpeg) | ![Conversas](docs/prints/conversas.jpeg) | ![Usuários](docs/prints/usuarios.jpeg) |

| Grupo | Chat em grupo | Perfil | Notificação recebida |
| --- | --- | --- | --- |
| ![Grupo](docs/prints/grupo.jpeg) | ![Chat](docs/prints/chat-grupo.jpeg) | ![Perfil](docs/prints/perfil.jpeg) | ![Push](docs/prints/notificacao.jpeg) |

## Repositório

https://github.com/LucasYuki1/CP4_mobile
