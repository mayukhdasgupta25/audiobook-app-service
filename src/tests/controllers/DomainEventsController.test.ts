import { EventEmitter } from 'events';
import { Request, Response } from 'express';

const mockSubscribe = jest.fn().mockResolvedValue(undefined);
const mockUnsubscribe = jest.fn().mockResolvedValue(undefined);
const mockQuit = jest.fn().mockResolvedValue(undefined);
const mockOff = jest.fn();
const mockOn = jest.fn();

const mockSubscriber = {
   subscribe: mockSubscribe,
   unsubscribe: mockUnsubscribe,
   quit: mockQuit,
   on: mockOn,
   off: mockOff,
};

jest.mock('../../services/DomainEventPublisher', () => ({
   DomainEventPublisher: {
      getInstance: () => ({
         createSubscriber: () => mockSubscriber,
      }),
      channel: () => 'sse:app:cache-events',
   },
}));

jest.mock('../../config/logger', () => ({
   sseLogger: { info: jest.fn(), warn: jest.fn() },
}));

import { DomainEventsController } from '../../controllers/DomainEventsController';
import { CACHE_INVALIDATE_SSE_EVENT } from '../../types/domainCacheEvents';

function createMockResponse(): Response & EventEmitter {
   const res = new EventEmitter() as Response & EventEmitter;
   res.setHeader = jest.fn().mockReturnValue(res);
   res.write = jest.fn();
   res.status = jest.fn().mockReturnValue(res);
   res.json = jest.fn().mockReturnValue(res);
   (res as Response & { flushHeaders?: () => void }).flushHeaders = jest.fn();
   return res;
}

describe('DomainEventsController (app)', () => {
   beforeEach(() => {
      jest.useFakeTimers();
      mockSubscribe.mockClear();
      mockUnsubscribe.mockClear();
      mockQuit.mockClear();
      mockOn.mockClear();
      mockOff.mockClear();
   });

   afterEach(() => {
      jest.useRealTimers();
   });

   it('returns 401 when user is not authenticated', async () => {
      const controller = new DomainEventsController();
      const req = {} as Request;
      const res = createMockResponse();

      await controller.streamCacheEvents(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
   });

   it('sets SSE headers and forwards Redis messages as cache-invalidate events', async () => {
      const controller = new DomainEventsController();
      const req = { user: { id: 'user-1' } } as Request & { user: { id: string } };
      const res = createMockResponse();

      await controller.streamCacheEvents(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockSubscribe).toHaveBeenCalledWith('sse:app:cache-events');
      expect(mockOn).toHaveBeenCalledWith('message', expect.any(Function));

      const onMessage = mockOn.mock.calls[0][1] as (channel: string, message: string) => void;
      const payload = {
         version: 1,
         service: 'app',
         resource: 'audiobook',
         action: 'updated',
         id: 'ab-1',
         queryKeys: [['audiobooks']],
         timestamp: '2026-06-13T12:00:00.000Z',
      };
      onMessage('sse:app:cache-events', JSON.stringify(payload));

      expect(res.write).toHaveBeenCalledWith(`event: ${CACHE_INVALIDATE_SSE_EVENT}\n`);
      expect(res.write).toHaveBeenCalledWith(`data: ${JSON.stringify(payload)}\n\n`);
   });

   it('writes heartbeat comments every 30s and cleans up on close', async () => {
      const controller = new DomainEventsController();
      const req = { user: { id: 'user-1' } } as Request & { user: { id: string } };
      const res = createMockResponse();

      await controller.streamCacheEvents(req, res);

      jest.advanceTimersByTime(30_000);
      expect(res.write).toHaveBeenCalledWith(': heartbeat\n\n');

      res.emit('close');
      expect(mockOff).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockUnsubscribe).toHaveBeenCalledWith('sse:app:cache-events');
      expect(mockQuit).toHaveBeenCalled();
   });
});
