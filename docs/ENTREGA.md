# Roteiro de entrega

O que ja esta feito, o que falta e em que ordem fazer. Cada passo depende do
anterior: pular o passo 1 faz o 5 sair errado de novo.

## Estado do codigo

| Item | Situacao |
| --- | --- |
| Codigo das tres telas, services, hooks e regras | pronto |
| `tsc --noEmit` | passa, sem `any` |
| `npm run test:rules` | 25/25 no emulador |
| Regras publicadas no projeto real | **pendente** |
| Firebase Authentication ativado | **pendente, bloqueia tudo** |
| APK gerado e testado em aparelho | **pendente** |
| Prints e dados dos integrantes no README | **pendente** |

## O bloqueio principal

**O Firebase Authentication nunca foi ativado no projeto `cp1-mobile-8bb2a`.**
Nao e "falta o Google": e o servico inteiro que ainda nao existe. Nenhum dos
tres provedores funciona hoje, nem e-mail/senha.

Como isso foi verificado (da para repetir a qualquer momento):

```bash
KEY=$(grep '^EXPO_PUBLIC_FIREBASE_API_KEY=' .env | cut -d= -f2)
curl -s "https://identitytoolkit.googleapis.com/v1/projects?key=$KEY"
```

Hoje a resposta e `CONFIGURATION_NOT_FOUND`, que e exatamente o erro do
Identity Toolkit quando o Authentication nunca foi inicializado. O mesmo erro
aparece com a chave do `GoogleService-Info.plist`, entao nao e problema de
chave. Quando o Authentication estiver ativo, essa chamada passa a devolver a
configuracao do projeto em vez de erro.

Os sintomas ja visiveis nos arquivos batem com isso: `google-services.json` com
`"oauth_client": []` e `GoogleService-Info.plist` sem `CLIENT_ID` nem
`REVERSED_CLIENT_ID` sao o que se ve quando nenhum provedor foi configurado.

Isso e 3,0 dos 10 pontos parados em zero. E o primeiro item a resolver.

O que **ja esta certo** no projeto:

- o Realtime Database existe e responde em
  `https://cp1-mobile-8bb2a-default-rtdb.firebaseio.com`;
- esta em modo bloqueado (leitura anonima na raiz devolve
  `401 Permission denied`), como deve ser;
- a `apiKey` do `.env` nao esta restrita: ela alcanca a API de autenticacao
  normalmente, entao o Firebase JS SDK vai conseguir usa-la.

## Passo a passo

### 1. Ativar o Authentication e habilitar os provedores

Console do Firebase > **Build > Authentication > Comecar**. Esse botao e o que
falta: e ele que cria a configuracao que hoje nao existe.

Depois, em **Sign-in method**:

- ativar **E-mail/senha**;
- ativar **Google** e definir o e-mail de suporte;
- ativar **Apple** (o provedor liga sem conta paga; so o teste real em
  dispositivo e que exige).

Ao salvar, o Firebase cria sozinho um **ID do cliente da Web**. Copie esse valor
para o `.env`:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...apps.googleusercontent.com
```

Sem esse valor o app agora mostra uma mensagem explicando a causa em vez de
falhar com `DEVELOPER_ERROR` sem explicacao.

### 2. Registrar um app Web (opcional, mas mais limpo)

**Configuracoes do projeto > Seus apps > Web**.

O `.env` hoje usa a `apiKey` e o `appId` do app **Android**, porque era o unico
registrado. Isso foi testado e funciona: a chave nao esta restrita por
package + SHA-1, entao o Firebase JS SDK a aceita. Ou seja, este passo nao
bloqueia nada - e so a configuracao correta para um cliente JS. Se fizer,
substitua no `.env`:

```
EXPO_PUBLIC_FIREBASE_API_KEY=<apiKey do app Web>
EXPO_PUBLIC_FIREBASE_APP_ID=<appId do app Web, formato 1:...:web:...>
```

Os outros cinco campos ja estao corretos.

### 3. Cadastrar o SHA-1 do keystore do EAS

O APK do `--profile preview` **nao** e assinado pelo keystore de debug da
maquina: quem assina e o EAS. O SHA-1 que precisa estar no Firebase e o dele.

```bash
npx eas-cli login
npx eas-cli credentials --platform android
```

Escolha o perfil `preview`, leia o **SHA-1 Fingerprint** e cadastre em
**Configuracoes do projeto > Seus apps > Android > Adicionar impressao digital**.

> Se voce tambem for rodar `npx expo run:android` numa maquina com Android SDK,
> cadastre o SHA-1 de debug tambem. Um app aceita varios.

### 4. Rebaixar o `google-services.json`

Depois dos passos 1 e 3, baixe o arquivo de novo e substitua o da raiz.
Confira antes de continuar:

```bash
node -e "console.log(require('./google-services.json').client[0].oauth_client)"
```

Se ainda imprimir `[]`, algo dos passos 1 ou 3 nao foi salvo. Nao adianta
seguir.

### 5. Publicar as Security Rules

```bash
npx firebase-tools login
npm run deploy:rules
```

O `.firebaserc` ja aponta para `cp1-mobile-8bb2a`. Alternativa manual: aba
**Regras** do Realtime Database, colar `database.rules.json` e publicar.

Vale rodar `npm run test:rules` antes: ele exercita exatamente o arquivo que vai
ser publicado.

### 6. Gerar o APK

```bash
npx eas-cli build --platform android --profile preview
```

A conta logada precisa ser a dona do projeto EAS
`c05ffba5-30ef-4ed0-8d11-619cb1d82b89` (`app.json > extra.eas.projectId`). Com
outra conta o build falha dizendo que o projeto nao existe.

O `.easignore` garante que `.env` e `google-services.json` subam para o build
mesmo estando no `.gitignore`. Nao remova.

### 7. Testar com dois aparelhos

Instale o APK nos dois e:

1. aparelho A: criar conta com **e-mail e senha** (vira vendedor, jade);
2. aparelho B: entrar com **Google** (vira comprador, cobalto) - use um e-mail
   **diferente** do usado em A, senao o Firebase devolve
   `auth/account-exists-with-different-credential`;
3. cada um deve ver o outro na lista, e nao ver ninguem do proprio lado;
4. abrir a conversa e trocar mensagens: a mensagem tem que aparecer no outro
   aparelho **sem recarregar a tela**.

Para evidenciar a regra: crie uma segunda conta de e-mail/senha e confirme que
um vendedor nao aparece na lista do outro vendedor.

### 8. Fechar o README

Em `README.md`, substituir:

- `[RM] - [NOME_COMPLETO_INTEGRANTE_N]` pelos integrantes reais (apagar as
  linhas que sobrarem);
- `[URL_DO_REPOSITORIO_GITHUB]` pela URL do repositorio;
- `[ARQUIVO_PRINT_LOGIN]`, `[ARQUIVO_PRINT_CONTATOS]`, `[ARQUIVO_PRINT_CHAT]`
  pelos nomes dos arquivos salvos em `docs/prints/`.

Tres prints bastam: tela de login, lista de contatos com o rotulo do papel, e a
conversa com baloes das duas cores.

## Sign in with Apple

O codigo esta escrito (`signInWithApple` em `src/services/authService.ts`, com
nonce via `expo-crypto`) e o botao se esconde fora do iOS por
`isAppleSignInAvailable()`. Testar exige macOS ou um build EAS para iOS com
conta Apple Developer paga.

Se o grupo nao tem como testar, diga isso no README de forma explicita em vez de
deixar implicito: e melhor mostrar a implementacao e declarar a limitacao do que
parecer que o provedor foi esquecido.

## Pendencia conhecida no `app.json`

`iosUrlScheme` esta como `com.googleusercontent.apps.537149263592-PREENCHER`.

O valor que estava ali antes era invalido: o `GOOGLE_APP_ID`
(`1:537149263592:ios:...`) com o prefixo `com.googleusercontent.apps.` colado na
frente, que nao e um reversed client id. Depois do passo 1 o
`GoogleService-Info.plist` passa a trazer o `REVERSED_CLIENT_ID` de verdade; e
esse valor que entra ali.

O sufixo `-PREENCHER` fica proposital: o plugin do google-signin **valida esse
campo em todas as plataformas**, inclusive no prebuild do Android. Um marcador
entre colchetes quebra o `expo prebuild` com
`iosUrlScheme must start with "com.googleusercontent.apps"`. Por isso o
placeholder precisa manter o prefixo correto.

O `ios.bundleIdentifier` foi alinhado para `com.fiap.mobile`, que e o
`BUNDLE_ID` registrado no `GoogleService-Info.plist`. Antes o `app.json` dizia
`com.fiap.cp.mobile` e os dois nao batiam.
