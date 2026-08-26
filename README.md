# [NOME_DO_APP]

Chat 1 para 1 em React Native + TypeScript, com Firebase Authentication e Firebase
Realtime Database. Entregue como CheckPoint 1 da disciplina de React Native.

## Integrantes

- [RM] - [NOME_COMPLETO_INTEGRANTE_1]
- [RM] - [NOME_COMPLETO_INTEGRANTE_2]
- [RM] - [NOME_COMPLETO_INTEGRANTE_3]
- [RM] - [NOME_COMPLETO_INTEGRANTE_4]
- [RM] - [NOME_COMPLETO_INTEGRANTE_5]

> Remova as linhas que sobrarem. Maximo de 5 integrantes.

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

Depois do primeiro build, o dia a dia e `npm start` com o app instalado no
dispositivo.

Para testar o tempo real: abra o app em dois dispositivos, entre com e-mail/senha
em um e com Google (ou Apple) no outro. Cada um vera o outro na lista.

## Configuracao do Firebase

Passo a passo completo em [`docs/FIREBASE.md`](docs/FIREBASE.md). Resumo:

1. Criar o projeto no Console do Firebase.
2. Habilitar os provedores E-mail/senha, Google e Apple em Authentication.
3. Criar o Realtime Database e publicar o conteudo de `database.rules.json`.
4. Registrar os apps Web, Android e iOS e preencher o `.env`.
5. Baixar `google-services.json` e `GoogleService-Info.plist` para a raiz do projeto.

## Estrutura do projeto

```
App.tsx
database.rules.json          regras de seguranca do Realtime Database
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

[URL_DO_REPOSITORIO_GITHUB]
