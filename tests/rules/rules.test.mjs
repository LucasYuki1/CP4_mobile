import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { ref, get, set, update, push } from 'firebase/database';

const RULES_PATH = process.env.RULES_PATH ?? new URL('../../database.rules.json', import.meta.url);

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-cp1',
  database: { host: '127.0.0.1', port: 9000, rules: fs.readFileSync(RULES_PATH, 'utf8') },
});

const cid = (a, b) => [a, b].sort().join('_');

const PERFIS = {
  vendedor:  { name: 'Loja Alfa',  email: 'alfa@loja.com',  provider: 'password', createdAt: 1 },
  vendedor2: { name: 'Loja Beta',  email: 'beta@loja.com',  provider: 'password', createdAt: 1 },
  comprador: { name: 'Ana',        email: 'ana@gmail.com',  provider: 'google',   createdAt: 1 },
  comprador2:{ name: 'Bruno',      email: 'bruno@me.com',   provider: 'apple',    createdAt: 1 },
  intruso:   { name: 'Carla',      email: 'carla@gmail.com',provider: 'google',   createdAt: 1 },

  // Pares dedicados a matriz de provedores, para nao colidir com a conversa
  // que ja e semeada abaixo entre 'vendedor' e 'comprador'.
  mPassword1: { name: 'Loja 1',  email: 'l1@x.com', provider: 'password', createdAt: 1 },
  mPassword2: { name: 'Loja 2',  email: 'l2@x.com', provider: 'password', createdAt: 1 },
  mGoogle1:   { name: 'Goog 1',  email: 'g1@x.com', provider: 'google',   createdAt: 1 },
  mGoogle2:   { name: 'Goog 2',  email: 'g2@x.com', provider: 'google',   createdAt: 1 },
  mApple1:    { name: 'Apple 1', email: 'a1@x.com', provider: 'apple',    createdAt: 1 },
  mApple2:    { name: 'Apple 2', email: 'a2@x.com', provider: 'apple',    createdAt: 1 },
};

/**
 * A matriz exigida no enunciado, exercitada na criacao da conversa.
 * Uma negociacao so existe entre lados opostos do balcao:
 * password = vendedor, google e apple = comprador.
 */
const MATRIZ = [
  ['password <-> google', 'mPassword1', 'mGoogle1',   'permitir'],
  ['password <-> apple',  'mPassword1', 'mApple1',    'permitir'],
  ['password <-> password', 'mPassword1', 'mPassword2', 'bloquear'],
  ['google   <-> google',   'mGoogle1',   'mGoogle2',   'bloquear'],
  ['apple    <-> apple',    'mApple1',    'mApple2',    'bloquear'],
  ['google   <-> apple',    'mGoogle1',   'mApple2',    'bloquear'],
];

await testEnv.clearDatabase();
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.database();
  for (const [uid, perfil] of Object.entries(PERFIS)) {
    await set(ref(db, `users/${uid}`), perfil);
  }
  // Uma conversa e uma mensagem ja existentes, para os testes de leitura/edicao.
  await set(ref(db, `conversations/${cid('vendedor', 'comprador')}`), {
    participants: { vendedor: true, comprador: true },
    createdAt: 10,
  });
  await set(ref(db, `messages/${cid('vendedor', 'comprador')}/msg1`), {
    senderId: 'vendedor', receiverId: 'comprador', text: 'proposta inicial', createdAt: 20,
  });
});

const db = (uid) => testEnv.authenticatedContext(uid).database();

const casos = [
  // --- matriz de provedores do enunciado, no nivel da criacao da conversa ---
  ...MATRIZ.map(([nome, a, b, esperado]) => [
    `matriz: ${nome}`,
    esperado,
    () => set(ref(db(a), `conversations/${cid(a, b)}`),
      { participants: { [a]: true, [b]: true }, createdAt: Date.now() }),
  ]),

  // --- o passo exato que ensureConversation() executa antes de criar a conversa ---
  ['ensureConversation: ler conversa que AINDA NAO EXISTE', 'permitir', () =>
    get(ref(db('vendedor'), `conversations/${cid('vendedor', 'comprador2')}`))],

  ['criar conversa vendedor(password) <-> comprador(apple)', 'permitir', () =>
    set(ref(db('vendedor'), `conversations/${cid('vendedor', 'comprador2')}`),
      { participants: { vendedor: true, comprador2: true }, createdAt: Date.now() })],

  ['criar conversa vendedor <-> vendedor (mesmo lado)', 'bloquear', () =>
    set(ref(db('vendedor'), `conversations/${cid('vendedor', 'vendedor2')}`),
      { participants: { vendedor: true, vendedor2: true }, createdAt: Date.now() })],

  ['criar conversa comprador <-> comprador (mesmo lado)', 'bloquear', () =>
    set(ref(db('comprador'), `conversations/${cid('comprador', 'comprador2')}`),
      { participants: { comprador: true, comprador2: true }, createdAt: Date.now() })],

  ['criar conversa em id que nao contem o proprio uid', 'bloquear', () =>
    set(ref(db('intruso'), `conversations/${cid('vendedor', 'comprador')}_x`),
      { participants: { vendedor: true, comprador: true }, createdAt: Date.now() })],

  ['ler conversa da qual participa', 'permitir', () =>
    get(ref(db('comprador'), `conversations/${cid('vendedor', 'comprador')}`))],

  ['terceiro ler conversa alheia', 'bloquear', () =>
    get(ref(db('intruso'), `conversations/${cid('vendedor', 'comprador')}`))],

  ['ler mensagens da propria conversa', 'permitir', () =>
    get(ref(db('comprador'), `messages/${cid('vendedor', 'comprador')}`))],

  ['terceiro ler mensagens alheias', 'bloquear', () =>
    get(ref(db('intruso'), `messages/${cid('vendedor', 'comprador')}`))],

  ['enviar mensagem vendedor -> comprador', 'permitir', () => {
    const c = cid('vendedor', 'comprador');
    return set(push(ref(db('vendedor'), `messages/${c}`)),
      { senderId: 'vendedor', receiverId: 'comprador', text: 'aceito', createdAt: Date.now() });
  }],

  ['enviar mensagem comprador -> vendedor', 'permitir', () => {
    const c = cid('vendedor', 'comprador');
    return set(push(ref(db('comprador'), `messages/${c}`)),
      { senderId: 'comprador', receiverId: 'vendedor', text: 'faz por menos?', createdAt: Date.now() });
  }],

  ['forjar senderId de outra pessoa', 'bloquear', () => {
    const c = cid('vendedor', 'comprador');
    return set(push(ref(db('comprador'), `messages/${c}`)),
      { senderId: 'vendedor', receiverId: 'comprador', text: 'fui eu', createdAt: Date.now() });
  }],

  ['editar mensagem ja gravada', 'bloquear', () =>
    set(ref(db('vendedor'), `messages/${cid('vendedor', 'comprador')}/msg1`),
      { senderId: 'vendedor', receiverId: 'comprador', text: 'editado', createdAt: 20 })],

  ['apagar mensagem ja gravada', 'bloquear', () =>
    set(ref(db('vendedor'), `messages/${cid('vendedor', 'comprador')}/msg1`), null)],

  ['trocar o proprio provider (mudar de papel)', 'bloquear', () =>
    update(ref(db('comprador'), 'users/comprador'), { provider: 'password' })],

  ['atualizar o proprio nome', 'permitir', () =>
    update(ref(db('comprador'), 'users/comprador'), { name: 'Ana Souza' })],

  ['escrever no perfil de outra pessoa', 'bloquear', () =>
    update(ref(db('intruso'), 'users/vendedor'), { name: 'hackeado' })],

  ['ler a lista de usuarios autenticado', 'permitir', () =>
    get(ref(db('comprador'), 'users'))],

  ['ler a lista de usuarios sem autenticar', 'bloquear', () =>
    get(ref(testEnv.unauthenticatedContext().database(), 'users'))],
];

let ok = 0, falhas = [];
for (const [nome, esperado, exec] of casos) {
  try {
    await (esperado === 'permitir' ? assertSucceeds(exec()) : assertFails(exec()));
    console.log(`  PASSOU   [${esperado}] ${nome}`);
    ok++;
  } catch (e) {
    console.log(`  FALHOU   [${esperado}] ${nome}`);
    console.log(`           -> ${String(e.message).split('\n')[0]}`);
    falhas.push(nome);
  }
}

console.log(`\n${ok}/${casos.length} casos conforme o esperado`);
if (falhas.length) {
  console.log('\nRegras que NAO se comportam como o projeto assume:');
  falhas.forEach((f) => console.log(`  - ${f}`));
}
await testEnv.cleanup();
process.exit(falhas.length ? 1 : 0);
