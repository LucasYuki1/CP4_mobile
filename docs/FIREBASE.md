# Configuracao do Firebase

Todos os campos entre colchetes sao preenchidos por voce.

## 1. Projeto

1. Console do Firebase > **Adicionar projeto** > nome `[NOME_DO_PROJETO_FIREBASE]`.
2. Google Analytics e opcional; pode desativar.

## 2. Authentication

**Build > Authentication > Comecar**, e habilite os tres provedores:

### E-mail/senha
Ativar apenas "E-mail/senha" (link por e-mail nao e necessario).

### Google
1. Ativar o provedor e definir o e-mail de suporte.
2. Ao salvar, o Firebase cria automaticamente um **ID do cliente da Web**.
   Copie esse valor para `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` no `.env`.
   Ele e o `webClientId` usado pelo Google Sign-In para devolver o `idToken`
   que o Firebase aceita, inclusive no Android.

### Apple
1. Ativar o provedor Apple.
2. No [Apple Developer](https://developer.apple.com) (conta paga, 99 USD/ano):
   - **Identifiers > App IDs**: criar o App ID `[BUNDLE_IDENTIFIER_IOS]` com a
     capability **Sign In with Apple** marcada.
   - **Identifiers > Services IDs**: criar `[APPLE_SERVICES_ID]` e apontar o
     Return URL para `https://[FIREBASE_AUTH_DOMAIN]/__/auth/handler`.
   - **Keys**: criar uma chave com Sign In with Apple, anotar o `[APPLE_KEY_ID]`
     e baixar o arquivo `.p8`.
   - Anotar o `[APPLE_TEAM_ID]` no canto superior direito do portal.
3. Voltar ao Firebase e preencher Services ID, Apple Team ID, Key ID e o
   conteudo do `.p8`.

> Sem conta paga da Apple nao ha como concluir o Sign in with Apple contra o
> Firebase. Documente isso no README se for o caso do grupo.

### Contas com o mesmo e-mail

Em **Authentication > Settings > User actions** existe a opcao de vincular
contas que usam o mesmo e-mail. Como o provedor define o papel no marketplace,
mantenha a protecao padrao (uma conta por e-mail) e **use e-mails diferentes**
para testar vendedor e comprador. Caso contrario o login com Google sobre um
e-mail ja cadastrado dispara `auth/account-exists-with-different-credential`,
erro que o app trata com mensagem propria.

## 3. Realtime Database

1. **Build > Realtime Database > Criar banco de dados**.
2. Escolher a regiao e iniciar em **modo bloqueado**.
3. Copiar a URL (`https://[PROJECT_ID]-default-rtdb.[REGIAO].firebasedatabase.app`)
   para `EXPO_PUBLIC_FIREBASE_DATABASE_URL`.
4. Aba **Regras**: colar o conteudo de `database.rules.json` e publicar.

O que as regras garantem:

- ninguem le ou escreve sem estar autenticado;
- cada pessoa so escreve o proprio perfil, e o campo `provider` nao pode ser
  alterado depois de criado;
- so participantes leem a conversa e as mensagens dela;
- `senderId` e obrigatoriamente `auth.uid`;
- `receiverId` precisa ser o outro participante **e** estar no lado oposto do
  balcao: a regra compara `users/$uid/provider` dos dois lados e exige que
  apenas um deles seja `password`;
- mensagem gravada nao pode ser editada nem apagada;
- os participantes precisam aparecer no proprio `conversationId`, o que impede
  uma terceira pessoa de entrar na conversa.

## 4. Registrar os apps

### Web (usado pelo Firebase JS SDK)
**Configuracoes do projeto > Seus apps > Web**. Copie os valores para o `.env`:
`apiKey`, `authDomain`, `databaseURL`, `projectId`, `storageBucket`,
`messagingSenderId`, `appId`.

### Android
1. **Seus apps > Android**, package `[PACKAGE_NAME_ANDROID]` (o mesmo do `app.json`).
2. Informe a impressao digital **SHA-1** do certificado de debug:
   ```bash
   keytool -list -v -alias androiddebugkey \
     -keystore ~/.android/debug.keystore -storepass android -keypass android
   ```
   Sem o SHA-1 o Google Sign-In falha com `DEVELOPER_ERROR`.
3. Baixe `google-services.json` para a raiz do projeto.

### iOS
1. **Seus apps > iOS**, bundle `[BUNDLE_IDENTIFIER_IOS]`.
2. Baixe `GoogleService-Info.plist` para a raiz do projeto.
3. Abra o arquivo, copie o valor de `REVERSED_CLIENT_ID` e cole em
   `[IOS_URL_SCHEME_REVERSED_CLIENT_ID]` no `app.json`.
4. Copie tambem `CLIENT_ID` para `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` no `.env`.

## 5. Regenerar o projeto nativo

Depois de posicionar os dois arquivos de credenciais:

```bash
npx expo prebuild --clean
npx expo run:android
```

## Checklist de verificacao

- [ ] Tres provedores habilitados no Authentication
- [ ] Regras publicadas e banco fora do modo aberto
- [ ] `.env` preenchido (o arquivo esta no `.gitignore`)
- [ ] `google-services.json` e `GoogleService-Info.plist` na raiz
- [ ] SHA-1 de debug cadastrado no app Android
- [ ] `usesAppleSignIn: true` no `app.json`
