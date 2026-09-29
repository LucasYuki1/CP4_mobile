# Pendências antes da entrega

O código está pronto. Os passos abaixo dependem de contas e credenciais da equipe.
Siga a ordem e apague este arquivo quando terminar.

1. **Preencher `firebaseConfig.json`.** Troque `apiKey` e `appId` pelos valores do
   App da Web (Console > Configurações do projeto > Seus apps). Os outros campos já
   apontam para `cp1-mobile-8bb2a`.
2. **Ativar os serviços no Console.** Authentication (somente E-mail/senha),
   Firestore, Storage e Realtime Database (que já existe). Confira também que a
   *Firebase Cloud Messaging API (V1)* está ativa.
3. **Publicar as regras**: `npx firebase-tools login` e depois
   `npm run deploy:rules`.
4. **Publicar a API no Render.** Use New > Blueprint com este repositório e
   preencha `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
   e `FIREBASE_DATABASE_URL` com uma conta de serviço de permissões mínimas (veja
   o README). Confira que `https://chat-firebase-api.onrender.com/health`
   responde. Se o Render atribuir outra URL, atualize `src/config/api.ts` e o
   README.
5. **Gerar o APK**: coloque o `google-services.json` na raiz e rode
   `npx eas-cli build -p android --profile preview`. Teste o push em dois
   aparelhos físicos.
6. **Prints**: salve em `docs/prints/` as telas e a notificação recebida, com os
   nomes usados no README.
7. **Entregar no Teams** o link do repositório e a URL pública da API.
