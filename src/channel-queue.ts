import { logger } from "./logger.js";

export interface QueuedInject {
  sessionKey: string;
  messageContent: string;
  authorDisplayName: string;
  roomId: string;
  eventId: string;
  queuedAt: number;
}

export interface SessionState {
  thinkingLevel: string;
  messageCount: number;
}

interface RoomQueue {
  processingChain: Promise<void>;
  currentInject: { cancelled: boolean } | null;
}

export class RoomQueueManager {
  private roomQueues = new Map<string, RoomQueue>();
  private sessionStates = new Map<string, SessionState>();

  constructor(private executeInject: (item: QueuedInject, cancelToken: { cancelled: boolean }) => Promise<void>) {}

  private getRoomQueue(roomId: string): RoomQueue {
    if (!this.roomQueues.has(roomId)) {
      this.roomQueues.set(roomId, {
        processingChain: Promise.resolve(),
        currentInject: null,
      });
    }
    return this.roomQueues.get(roomId)!;
  }

  getSessionState(sessionKey: string): SessionState {
    if (!this.sessionStates.has(sessionKey)) {
      this.sessionStates.set(sessionKey, {
        thinkingLevel: "medium",
        messageCount: 0,
      });
    }
    return this.sessionStates.get(sessionKey)!;
  }

  queueInject(roomId: string, item: QueuedInject): void {
    const queue = this.getRoomQueue(roomId);

    queue.processingChain = queue.processingChain.then(async () => {
      const cancelToken = { cancelled: false };
      queue.currentInject = cancelToken;

      try {
        await this.executeInject(item, cancelToken);
      } catch (error) {
        logger.error({ msg: "Queue inject failed", roomId, error: String(error) });
      } finally {
        if (queue.currentInject === cancelToken) {
          queue.currentInject = null;
        }
      }
    });

    logger.info({ msg: "Inject queued", roomId, from: item.authorDisplayName });
  }

  cancelRoomQueue(roomId: string): boolean {
    const queue = this.roomQueues.get(roomId);
    if (!queue) return false;

    // Cancel both the in-flight inject and reset the chain so queued-but-waiting
    // injects do not execute after cancellation.
    let hadSomething = false;
    if (queue.currentInject) {
      queue.currentInject.cancelled = true;
      hadSomething = true;
    }
    // Replace the chain with a resolved promise so queued continuations are dropped.
    queue.processingChain = Promise.resolve();
    this.roomQueues.delete(roomId);
    return hadSomething;
  }

  /** Wait for all room queues to finish processing their current chain. */
  async drain(): Promise<void> {
    const chains = Array.from(this.roomQueues.values()).map((q) => q.processingChain);
    await Promise.allSettled(chains);
  }
}
