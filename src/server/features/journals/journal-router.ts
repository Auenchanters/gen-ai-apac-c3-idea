import { Router, type Response } from 'express';

import { buildCompass } from '../compass/compass-service.js';
import { updateMemory } from '../memory/memory-service.js';
import { idSchema, uidSchema } from './contracts.js';
import type { JournalRepository } from './journal-repository.js';
import { publicDetail, publicJournal, publicTurn } from './public-journal.js';
import type { TurnService } from './turn-service.js';

/** Private route dependencies; identity is never supplied by a request payload. */
export interface JournalRouteDependencies {
  readonly repository: JournalRepository;
  readonly turnService: TurnService;
}

function uid(response: Response): string {
  return uidSchema.parse(response.locals['uid']);
}

/** Mounts owned data operations behind the application's authentication boundary.
 * @param dependencies - Validating persistence and generation services.
 * @returns Private API router.
 */
export function createJournalRouter(dependencies: JournalRouteDependencies): Router {
  const router = Router();
  const { repository, turnService } = dependencies;
  router.get('/journals', async (req, res) => {
    const page = await repository.listJournals(uid(res), req.query);
    res.json({ ...page, journals: page.journals.map(publicJournal) });
  });
  router.post('/journals', async (req, res) => {
    res.status(201).json(publicJournal(await repository.createJournal(uid(res), req.body)));
  });
  router.get('/journals/:journalId', async (req, res) => {
    res.json(
      publicDetail(await repository.loadJournal(uid(res), idSchema.parse(req.params.journalId)))
    );
  });
  router.delete('/journals/:journalId', async (req, res) => {
    await repository.deleteJournal(uid(res), idSchema.parse(req.params.journalId));
    res.status(204).end();
  });
  router.post('/journals/:journalId/turns', async (req, res) => {
    res.json(
      publicTurn(
        await turnService.submitTurn(uid(res), idSchema.parse(req.params.journalId), req.body)
      )
    );
  });
  router.patch('/journals/:journalId/memories/:memoryId', async (req, res) => {
    res.json(
      await updateMemory(
        repository,
        uid(res),
        {
          journalId: idSchema.parse(req.params.journalId),
          memoryId: idSchema.parse(req.params.memoryId)
        },
        req.body
      )
    );
  });
  router.post('/compass', async (req, res) => {
    res.json(await buildCompass(repository, uid(res), req.body));
  });
  router.get('/export', async (_req, res) => {
    const exported = await repository.exportData(uid(res));
    res.setHeader('Content-Disposition', 'attachment; filename="daymark-export.json"');
    res.json({ ...exported, journals: exported.journals.map(publicDetail) });
  });
  router.delete('/account-data', async (_req, res) => {
    await repository.deleteAllUserData(uid(res));
    res.status(204).end();
  });
  return router;
}
