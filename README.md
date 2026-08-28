# Balcao

Chat 1 para 1 em React Native + TypeScript, com Firebase Authentication e Firebase
Realtime Database. Entregue como CheckPoint 1 da disciplina de React Native.

## Integrantes

- 554865 - Lucas Henzo Ide Yuki
- 555469 - Vitor Augusto França de Oliveira

## Atendimento aos requisitos

Onde cada item do enunciado esta implementado.

| Requisito | Implementacao |
| --- | --- |
| Authentication - e-mail/senha | `signUpWithEmail` e `signInWithEmail` em `src/services/authService.ts` |
| Authentication - Google | `signInWithGoogle` em `src/services/authService.ts` (idToken -> `GoogleAuthProvider.credential`) |
| Authentication - Apple | `signInWithApple` em `src/services/authService.ts` (nonce SHA-256 + `OAuthProvider('apple.com')`) |
| Logout | `signOutUser` em `authService.ts`, `logout` no `AuthContext`, gate em `RootNavigator` |
| Usuario pelo `uid` do Firebase | `resolveProvider` + `upsertUserProfile`; nenhum usuario hardcoded |
| Regra de comunicacao entre provedores | `canNegotiate` em `src/utils/chatRules.ts` (UI) **e** `database.rules.json` (banco) |
| Chat 1 para 1 | `buildConversationId` em `src/utils/chatRules.ts`: id `[uidMenor]_[uidMaior]` nao comporta um terceiro |
| Mensagens no Realtime Database | `sendMessage` em `src/services/chatService.ts` |
| Atualizacao em tempo real | `listenToMessages` (`onChildAdded` + `onChildChanged`) consumido por `src/hooks/useChat.ts` |
| Remocao de listeners | funcao de limpeza retornada por `listenToMessages`, chamada no cleanup do `useEffect` |
| Imutabilidade | `setMessages((previous) => [...previous, message])` em `src/hooks/useChat.ts` |
| `useState` | formularios, mensagens, loading, erro |
| `useEffect` | `onAuthStateChanged`, lista de usuarios, mensagens - todos com cleanup |
| `useMemo` | filtro de contatos, ordenacao das mensagens, derivacao do papel |
| `useCallback` | `send`, `logout`, handlers de `FlatList` e do `ChatBubble` memoizado |
| Sem `any` | `tsconfig.json` estrito; `npm run typecheck` limpo; pontos instaveis do SDK passam por `unknown` |
| Componentizacao | `src/components/` |
| Services separados da UI | `src/services/` |
| Loading / erro / vazio | `Loading.tsx`, `ErrorMessage.tsx`, `EmptyState.tsx` |
| Regras de seguranca | `database.rules.json`, publicadas; leitura anonima devolve 401 |
| Diferenciacao enviada/recebida | `ChatBubble.tsx`: alinhamento por remetente e cor por papel |

## Descricao

O app e um balcao de marketplace. A forma de entrar define o papel de quem entra:

| Provedor | Papel | Com quem negocia |
| --- | --- | --- |
| E-mail e senha | Vendedor | Compradores (Google ou Apple) |
| Google | Comprador | Vendedores (e-mail e senha) |
| Apple | Comprador | Vendedores (e-mail e senha) |

Vendedor nao fala com vendedor e comprador nao fala com comprador. A regra do
enunciado deixa de ser uma restricao arbitraria e vira a regra do produto: uma
negociacao so existe entre lados opostos do balcao.

A cor carrega essa informacao em toda a interface. Vendedor e sempre jade,
comprador e sempre cobalto, na etiqueta do contato, no cabecalho da conversa e
no balao da mensagem.

## Tecnologias

- React Native 0.83 / React 19.2
- Expo SDK 55 (development build, New Architecture)
- TypeScript em modo estrito, sem `any`
- React Navigation (native stack)
- Firebase JS SDK 12: Authentication + Realtime Database
- `@react-native-google-signin/google-signin`, `expo-apple-authentication`, `expo-crypto`

## Servicos Firebase

- **Authentication**: e-mail/senha, Google e Apple.
- **Realtime Database**: perfis, conversas e mensagens, com Security Rules em
  `database.rules.json`.

Cloud Firestore nao e usado em nenhum ponto do projeto.

## Sobre o Sign in with Apple

O provedor Apple esta **habilitado no Firebase** e **implementado no codigo**,
mas nao foi testado em dispositivo. Vale registrar o porque, porque a limitacao
e de ambiente e nao de implementacao.

O que existe:

- `signInWithApple()` em `src/services/authService.ts`, com o fluxo completo:
  gera um nonce com `expo-crypto`, envia o SHA-256 dele para a Apple, e devolve
  o nonce original junto do `identityToken` para o Firebase validar;
- tratamento do caso em que a Apple so devolve o nome na primeira autorizacao,
  gravando-o naquele momento;
- `usesAppleSignIn: true` no `app.json` e o plugin `expo-apple-authentication`;
- o botao aparece so onde funciona: `isAppleSignInAvailable()` checa
  `Platform.OS === 'ios'` e a disponibilidade real da API, e fora do iOS a tela
  mostra um aviso no lugar do botao.

O que impede o teste: Sign in with Apple exige um build iOS rodando em
dispositivo ou simulador, o que precisa de macOS, ou de um build EAS para iOS
com conta paga do Apple Developer Program (99 USD/ano). O grupo desenvolveu em
Windows e nao dispoe de nenhum dos dois.

Pela regra do marketplace, Apple e Google ocupam o **mesmo papel** (comprador).
Entao o caminho comprador esta exercitado de ponta a ponta pelo Google: a
diferenca entre os dois e so qual credencial o Firebase recebe, e o
`resolveProvider()` trata os dois pelo mesmo ramo. A matriz de comunicacao
password <-> apple e validada nos testes das Security Rules, que rodam contra o
banco e nao dependem de dispositivo.

## Como executar

Este projeto **nao roda no Expo Go**: Google Sign-In nativo exige modulo nativo, e
o token que a Apple devolve dentro do Expo Go e emitido para o bundle da Expo, o
que faz o Firebase recusar a credencial. Use um development build.

```bash
npm install
cp .env.example .env      # preencha com os dados do seu projeto Firebase
npx expo prebuild --clean
npx expo run:android      # ou: npx expo run:ios
```

Sem Android SDK na maquina, o APK sai pela nuvem:

```bash
npx eas-cli build --platform android --profile preview
```

Depois do primeiro build, o dia a dia e `npm start` com o app instalado no
dispositivo.

Para testar o tempo real: abra o app em dois dispositivos, entre com e-mail/senha
em um e com Google (ou Apple) no outro. Cada um vera o outro na lista.

## Configuracao do Firebase

Passo a passo completo em [`docs/FIREBASE.md`](docs/FIREBASE.md), e o roteiro do
que ainda falta para a entrega em [`docs/ENTREGA.md`](docs/ENTREGA.md). Resumo:

1. Criar o projeto no Console do Firebase.
2. Habilitar os provedores E-mail/senha, Google e Apple em Authentication.
3. Criar o Realtime Database e publicar as regras (`npm run deploy:rules`, ou
   colar `database.rules.json` na aba Regras do console).
4. Registrar os apps Web, Android e iOS e preencher o `.env`.
5. Baixar `google-services.json` e `GoogleService-Info.plist` para a raiz do projeto.

## Estrutura do projeto

```
App.tsx
database.rules.json          regras de seguranca do Realtime Database
firebase.json                emulador local e alvo do deploy das regras
tests/rules/
  rules.test.mjs             25 casos: matriz de provedores + regras
src/
  components/
    ChatBubble.tsx           balao colorido pelo papel de quem enviou
    ChatInput.tsx            campo de mensagem e botao enviar
    UserItem.tsx             etiqueta do contato
    Loading.tsx
    ErrorMessage.tsx
    EmptyState.tsx
    PrimaryButton.tsx
  screens/
    LoginScreen.tsx
    UsersScreen.tsx
    ChatScreen.tsx
  services/
    firebase.ts              inicializacao do app, auth e database
    authService.ts           cadastro, login (3 provedores) e logout
    userService.ts           perfis em /users
    chatService.ts           conversas, envio e listeners de mensagens
  hooks/
    useAuth.ts               acesso ao contexto de sessao
    useContacts.ts           lista filtrada pela regra do marketplace
    useChat.ts               mensagens em tempo real de uma conversa
  contexts/
    AuthContext.tsx
  navigation/
    RootNavigator.tsx        gate de autenticacao
    types.ts
  types/
    user.ts                  ChatUser, AuthProvider, MarketRole
    chat.ts                  Conversation, ChatMessage e formatos do banco
  utils/
    chatRules.ts             papel, compatibilidade e id de conversa
  theme/
    index.ts
```

## Modelo de dados

```
users/$uid
  name, email, provider, createdAt

conversations/$conversationId          id = uidMenor_uidMaior
  participants/$uid: true
  createdAt

messages/$conversationId/$messageId
  senderId, receiverId, text, createdAt
```

O `conversationId` e deterministico: os dois uid ordenados e unidos por `_`.
Isso torna a criacao idempotente, garante que uma conversa nunca tenha um
terceiro participante e permite que as Security Rules validem o participante
contra o proprio id do no.

Os participantes sao gravados como mapa porque as regras do Realtime Database
consultam por chave (`participants/$uid`). O tipo de dominio `Conversation`
mantem a tupla `[string, string]`, e a conversao fica no `chatService`.

## Decisoes tecnicas

- **A regra dos provedores esta nas Security Rules, nao so na interface.** As
  regras leem `users/$uid/provider` dos dois lados e exigem que os papeis sejam
  opostos. Uma mensagem comprador para comprador e recusada pelo banco.
- **`onChildAdded` + `onChildChanged`.** O primeiro entrega a mensagem nova; o
  segundo cobre o momento em que `serverTimestamp()` e substituido pelo horario
  definitivo do servidor. Ambos sao removidos no cleanup do `useEffect`.
- **O provedor e gravado uma unica vez.** Ele define o papel, entao o
  `userService` nunca o reescreve e as regras tambem bloqueiam a alteracao.
- **Sem `any`.** Onde o SDK expoe tipos instaveis (persistencia do Firebase Auth
  em React Native, resposta do Google Sign-In), a leitura passa por `unknown`
  com um contrato explicito.
- **A leitura da conversa e validada contra o id, nao contra os participantes
  gravados.** `ensureConversation()` faz `get()` no no antes de cria-lo. Uma
  regra escrita como `data.child('participants').child(auth.uid).exists()`
  avalia um no vazio, devolve falso e o banco responde `permission_denied`:
  nenhuma conversa nova conseguiria abrir. Como o id e deterministico e a
  escrita exige que `participants` case com ele, checar
  `$conversationId.beginsWith(auth.uid + '_')` da a mesma garantia e continua
  valendo no no inexistente.

## Testes das Security Rules

A regra de comunicacao entre provedores nao vive so na interface: quem decide e
o banco. Para provar isso sem depender de dois celulares, `tests/rules/` sobe o
emulador do Realtime Database e exercita as regras reais do arquivo
`database.rules.json`:

```bash
npm run test:rules
```

Sao 25 casos. Os seis primeiros sao a matriz de provedores do enunciado,
verificada contra o banco:

| Combinacao | Esperado |
| --- | --- |
| password <-> google | permitido |
| password <-> apple | permitido |
| password <-> password | bloqueado |
| google <-> google | bloqueado |
| apple <-> apple | bloqueado |
| google <-> apple | bloqueado |

Os outros cobrem: `senderId` forjado e recusado, mensagem gravada nao pode ser
editada nem apagada, o `provider` nao pode ser trocado depois de criado, um
terceiro nao le a conversa alheia, e ninguem le nada sem autenticar.

O emulador exige Java instalado.

## Hooks

- `useState`: formularios, mensagens, loading e erro.
- `useEffect`: assinatura de `onAuthStateChanged`, da lista de usuarios e das
  mensagens, sempre com funcao de limpeza.
- `useMemo`: filtro dos contatos compativeis, ordenacao das mensagens e
  derivacao do papel a partir do provedor.
- `useCallback`: `send`, `logout` e os handlers passados para `FlatList` e para
  o `ChatBubble` memoizado.

## Prints

| Login | Contatos | Conversa |
| --- | --- | --- |
| ![Login](docs/prints/[ARQUIVO_PRINT_LOGIN].png) | ![Contatos](docs/prints/[ARQUIVO_PRINT_CONTATOS].png) | ![Conversa](docs/prints/[ARQUIVO_PRINT_CHAT].png) |

## Repositorio

https://github.com/LucasYuki1/CP4_mobile
