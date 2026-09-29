/**
 * Testes das regras do Firestore e do Realtime Database contra os emuladores.
 * Execucao: npm run test:rules (exige Java).
 */
import fs from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { ref, get, set } from 'firebase/database';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';

const root = new URL('../../', import.meta.url);
const env = await initializeTestEnvironment({
  projectId: 'demo-chat',
  firestore: { host: '127.0.0.1', port: 8080, rules: fs.readFileSync(new URL('firestore.rules', root), 'utf8') },
  database: { host: '127.0.0.1', port: 9000, rules: fs.readFileSync(new URL('database.rules.json', root), 'utf8') },
});

const users = ['ana', 'bia', 'caio', 'duda', 'eva'];
const directId = (a, b) => [a, b].sort().join('_');
const ctx = (uid) => env.authenticatedContext(uid, { email: `${uid}@x.com` });
const fs_ = (uid) => ctx(uid).firestore();
const db = (uid) => ctx(uid).database();

const group = (overrides = {}) => ({
  name: 'Time', photoUrl: '', ownerId: 'ana', memberIds: ['ana', 'bia'], memberLimit: 3,
  notificationPolicy: 'all_group_messages', notificationUpdatedBy: 'ana', createdAt: 1, updatedAt: 1,
  ...overrides,
});
const message = (sender, type, extra = {}) => ({
  conversationType: type, senderId: sender, text: 'oi', target: { type: 'conversation' }, createdAt: 1, ...extra,
});

await env.withSecurityRulesDisabled(async (admin) => {
  const store = admin.firestore();
  for (const uid of users) {
    await setDoc(doc(store, 'users', uid), { name: uid, email: `${uid}@x.com`, phoneNumber: '1', birthDate: '01/01/2000', photoUrl: '', createdAt: 1 });
    await setDoc(doc(store, 'publicProfiles', uid), { name: uid, nameLower: uid, photoUrl: '' });
  }
  await setDoc(doc(store, 'directConversations', directId('ana', 'bia')), { participantIds: [directId('ana', 'bia').split('_')[0], directId('ana', 'bia').split('_')[1]], createdAt: 1 });
  await setDoc(doc(store, 'groups', 'g1'), group());
  await set(ref(admin.database(), 'groupMembers/g1'), { ana: true, bia: true });
});

const results = [];
async function check(name, promise) {
  try {
    await promise;
    results.push(['ok', name]);
  } catch (error) {
    results.push(['FALHOU', name, error.message]);
  }
}

// Autenticacao
await check('anonimo nao le perfis', assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'publicProfiles', 'ana'))));
await check('anonimo nao le mensagens', assertFails(get(ref(env.unauthenticatedContext().database(), `messages/${directId('ana', 'bia')}`))));

// Perfis
await check('autenticado le cartao publico', assertSucceeds(getDoc(doc(fs_('caio'), 'publicProfiles', 'ana'))));
await check('dono le o proprio perfil', assertSucceeds(getDoc(doc(fs_('caio'), 'users', 'caio'))));
await check('perfil liberado com conversa individual', assertSucceeds(getDoc(doc(fs_('bia'), 'users', 'ana'))));
await check('perfil negado sem conversa ou grupo', assertFails(getDoc(doc(fs_('caio'), 'users', 'ana'))));
await check('ninguem le tokens de outro usuario', assertFails(getDoc(doc(fs_('bia'), 'users', 'ana', 'devices', 'd1'))));
await check('dono registra o proprio token', assertSucceeds(setDoc(doc(fs_('ana'), 'users', 'ana', 'devices', 'd1'), { token: 't', provider: 'fcm', platform: 'android', enabled: true, updatedAt: 1 })));

await check('novo usuario cria o proprio perfil', assertSucceeds(setDoc(doc(fs_('novo'), 'users', 'novo'), { name: 'Novo', email: 'novo@x.com', phoneNumber: '(11) 91234-5678', birthDate: '01/01/2000', photoUrl: '', createdAt: 1 })));
await check('nao cria perfil de outro usuario', assertFails(setDoc(doc(fs_('novo'), 'users', 'outro'), { name: 'X', email: 'novo@x.com', phoneNumber: '', birthDate: '', photoUrl: '', createdAt: 1 })));
await check('novo usuario cria cartao publico', assertSucceeds(setDoc(doc(fs_('novo'), 'publicProfiles', 'novo'), { name: 'Novo', nameLower: 'novo', photoUrl: '' })));

// Conversas diretas
const cd = directId('caio', 'duda');
await check('cria conversa direta com id deterministico', assertSucceeds(setDoc(doc(fs_('caio'), 'directConversations', cd), { participantIds: cd.split('_'), createdAt: 1 })));
await check('nao cria conversa consigo mesmo', assertFails(setDoc(doc(fs_('caio'), 'directConversations', 'caio_caio'), { participantIds: ['caio', 'caio'], createdAt: 1 })));
await check('nao cria conversa com id fora do padrao', assertFails(setDoc(doc(fs_('caio'), 'directConversations', 'x'), { participantIds: ['caio', 'eva'], createdAt: 1 })));
await check('terceiro nao cria conversa de outros', assertFails(setDoc(doc(fs_('eva'), 'directConversations', directId('ana', 'caio')), { participantIds: directId('ana', 'caio').split('_'), createdAt: 1 })));

// Grupos e limite
await check('cria grupo valido', assertSucceeds(setDoc(doc(fs_('caio'), 'groups', 'g2'), group({ ownerId: 'caio', memberIds: ['caio', 'duda'], notificationUpdatedBy: 'caio' }))));
await check('nao cria grupo acima do limite', assertFails(setDoc(doc(fs_('caio'), 'groups', 'g3'), group({ ownerId: 'caio', memberIds: ['caio', 'duda', 'eva'], memberLimit: 2, notificationUpdatedBy: 'caio' }))));
await check('nao cria grupo com um integrante', assertFails(setDoc(doc(fs_('caio'), 'groups', 'g4'), group({ ownerId: 'caio', memberIds: ['caio'], notificationUpdatedBy: 'caio' }))));
await check('nao cria grupo com limite nao inteiro', assertFails(setDoc(doc(fs_('caio'), 'groups', 'g5'), group({ ownerId: 'caio', memberIds: ['caio', 'duda'], memberLimit: 2.5, notificationUpdatedBy: 'caio' }))));
await check('nao integrante nao le grupo', assertFails(getDoc(doc(fs_('eva'), 'groups', 'g1'))));
await check('integrante lista seus grupos', assertSucceeds(getDocs(query(collection(fs_('bia'), 'groups'), where('memberIds', 'array-contains', 'bia')))));
await check('dono adiciona dentro do limite', assertSucceeds(updateDoc(doc(fs_('ana'), 'groups', 'g1'), { memberIds: arrayUnion('caio'), updatedAt: 2 })));
await check('dono nao ultrapassa o limite', assertFails(updateDoc(doc(fs_('ana'), 'groups', 'g1'), { memberIds: arrayUnion('duda'), updatedAt: 3 })));
await check('limite nao fica abaixo dos integrantes', assertFails(updateDoc(doc(fs_('ana'), 'groups', 'g1'), { memberLimit: 2, updatedAt: 3 })));
await check('integrante comum nao gerencia grupo', assertFails(updateDoc(doc(fs_('bia'), 'groups', 'g1'), { memberLimit: 10, updatedAt: 3 })));
await check('integrante comum nao muda politica', assertFails(updateDoc(doc(fs_('bia'), 'groups', 'g1'), { notificationPolicy: 'disabled', updatedAt: 3 })));
await check('integrante comum nao adiciona ninguem', assertFails(updateDoc(doc(fs_('bia'), 'groups', 'g1'), { memberIds: ['ana', 'bia', 'caio', 'eva'], updatedAt: 3 })));
await check('dono altera politica', assertSucceeds(updateDoc(doc(fs_('ana'), 'groups', 'g1'), { notificationPolicy: 'mentioned_members', notificationUpdatedBy: 'ana', updatedAt: 3 })));
await check('integrante sai do grupo', assertSucceeds(updateDoc(doc(fs_('caio'), 'groups', 'g1'), { memberIds: ['ana', 'bia'], updatedAt: 4 })));
await check('ninguem acessa controle de idempotencia', assertFails(getDoc(doc(fs_('ana'), 'notificationDispatches', 'x'))));

// Concorrencia: duas adicoes simultaneas disputando a ultima vaga.
await env.withSecurityRulesDisabled(async (admin) => {
  await setDoc(doc(admin.firestore(), 'groups', 'race'), group({ memberIds: ['ana', 'bia'], memberLimit: 3 }));
});
const race = await Promise.allSettled([
  updateDoc(doc(fs_('ana'), 'groups', 'race'), { memberIds: arrayUnion('caio'), updatedAt: 5 }),
  updateDoc(doc(ctx('ana').firestore(), 'groups', 'race'), { memberIds: arrayUnion('duda'), updatedAt: 5 }),
]);
let raceSize = 0;
await env.withSecurityRulesDisabled(async (admin) => {
  raceSize = (await getDoc(doc(admin.firestore(), 'groups', 'race'))).data().memberIds.length;
});
await check(
  `adicoes concorrentes nao estouram o limite (${race.filter((r) => r.status === 'fulfilled').length} aceita(s), ${raceSize} integrantes)`,
  raceSize <= 3 ? Promise.resolve() : Promise.reject(new Error(`grupo ficou com ${raceSize}`)),
);

// Mensagens (Realtime Database)
const ab = directId('ana', 'bia');
await check('participante envia mensagem direta', assertSucceeds(set(ref(db('ana'), `messages/${ab}/m1`), message('ana', 'direct', { target: { type: 'member', memberId: 'bia' } }))));
await check('participante le conversa direta', assertSucceeds(get(ref(db('bia'), `messages/${ab}`))));
await check('terceiro nao le conversa direta', assertFails(get(ref(db('caio'), `messages/${ab}`))));
await check('terceiro nao escreve na conversa direta', assertFails(set(ref(db('caio'), `messages/${ab}/m2`), message('caio', 'direct'))));
await check('senderId forjado e recusado', assertFails(set(ref(db('ana'), `messages/${ab}/m3`), message('bia', 'direct'))));
await check('mensagem nao pode ser editada', assertFails(set(ref(db('ana'), `messages/${ab}/m1/text`), 'editado')));
await check('conversa consigo mesmo recusada', assertFails(set(ref(db('ana'), 'messages/ana_ana/m1'), message('ana', 'direct'))));
await check('integrante envia no grupo', assertSucceeds(set(ref(db('bia'), 'messages/g1/m1'), message('bia', 'group', { target: { type: 'member', memberId: 'ana' }, mentionedUserIds: { ana: true } }))));
await check('mencao a nao integrante recusada', assertFails(set(ref(db('bia'), 'messages/g1/m2'), message('bia', 'group', { mentionedUserIds: { eva: true } }))));
await check('nao integrante nao le grupo', assertFails(get(ref(db('eva'), 'messages/g1'))));
await check('nao integrante nao escreve no grupo', assertFails(set(ref(db('eva'), 'messages/g1/m3'), message('eva', 'group'))));
await check('cliente nao escreve no espelho de integrantes', assertFails(set(ref(db('eva'), 'groupMembers/g1/eva'), true)));

await env.withSecurityRulesDisabled(async (admin) => {
  await set(ref(admin.database(), 'groupMembers/g1/bia'), null);
});
await check('removido nao le novas mensagens', assertFails(get(ref(db('bia'), 'messages/g1'))));
await check('removido nao envia mensagens', assertFails(set(ref(db('bia'), 'messages/g1/m4'), message('bia', 'group'))));

await env.cleanup();

for (const [status, name, detail] of results) {
  console.log(`${status === 'ok' ? '✓' : '✗'} ${name}${detail ? ` -> ${detail}` : ''}`);
}
const failed = results.filter(([status]) => status !== 'ok').length;
console.log(`\n${results.length - failed}/${results.length} casos passaram.`);
process.exit(failed === 0 ? 0 : 1);
