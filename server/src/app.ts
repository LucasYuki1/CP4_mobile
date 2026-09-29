import express, { type NextFunction, type Request, type Response } from 'express';

import { groupsRouter } from './routes/groups';
import { notificationsRouter } from './routes/notifications';
import { profilesRouter } from './routes/profiles';

const app = express();
const startedAt = Date.now();

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

/** Health check publico, usado pela hospedagem e para verificar a disponibilidade. */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', uptimeSeconds: Math.round((Date.now() - startedAt) / 1000) });
});

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'chat-firebase-api',
    endpoints: ['GET /health', 'POST /notifications/messages', 'POST /groups/:groupId/sync', 'GET /profiles/:uid'],
  });
});

app.use('/notifications', notificationsRouter);
app.use('/groups', groupsRouter);
app.use('/profiles', profilesRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Rota nao encontrada.' });
});

// Express 5 encaminha para ca as rejeicoes dos handlers async. Detalhes internos
// ficam apenas no log do servidor, nunca na resposta.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api] erro nao tratado', error);
  res.status(500).json({ error: 'Erro interno. Tente novamente.' });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`[api] ouvindo na porta ${port}`);
});
