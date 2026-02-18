import type { MatrixClient } from "matrix-bot-sdk";
import { logger } from "./logger.js";
import { chunkMessage, formatMessage } from "./message-formatter.js";
import type {
  ChannelCommand,
  ChannelCommandContext,
  ChannelMessageContext,
  ChannelMessageParser,
  ChannelProvider,
} from "@wopr-network/plugin-types";

let matrixClient: MatrixClient | null = null;

export function setChannelProviderClient(c: MatrixClient | null): void {
  matrixClient = c;
}

const registeredCommands: Map<string, ChannelCommand> = new Map();

export function getRegisteredCommand(name: string): ChannelCommand | undefined {
  return registeredCommands.get(name);
}

const registeredParsers: Map<string, ChannelMessageParser> = new Map();

let cachedBotUsername = "unknown";

export function setCachedBotUsername(username: string): void {
  cachedBotUsername = username;
}

export const matrixChannelProvider: ChannelProvider = {
  id: "matrix",

  registerCommand(cmd: ChannelCommand): void {
    registeredCommands.set(cmd.name, cmd);
    logger.info({ msg: "Channel command registered", name: cmd.name });
  },

  unregisterCommand(name: string): void {
    registeredCommands.delete(name);
  },

  getCommands(): ChannelCommand[] {
    return Array.from(registeredCommands.values());
  },

  addMessageParser(parser: ChannelMessageParser): void {
    registeredParsers.set(parser.id, parser);
    logger.info({ msg: "Message parser registered", id: parser.id });
  },

  removeMessageParser(id: string): void {
    registeredParsers.delete(id);
  },

  getMessageParsers(): ChannelMessageParser[] {
    return Array.from(registeredParsers.values());
  },

  async send(roomId: string, content: string): Promise<void> {
    if (!matrixClient) throw new Error("Matrix client not initialized");
    const chunks = chunkMessage(content);
    for (const chunk of chunks) {
      if (chunk.trim()) {
        const msgContent = formatMessage(chunk);
        await matrixClient.sendMessage(roomId, msgContent);
      }
    }
  },

  getBotUsername(): string {
    return cachedBotUsername;
  },
};

/**
 * Check if a message matches a registered command and handle it.
 * Matrix convention: ! prefix for bot commands.
 */
export async function handleRegisteredCommand(
  roomId: string,
  senderId: string,
  body: string,
  replyFn: (msg: string) => Promise<void>,
): Promise<boolean> {
  const content = body.trim();
  if (!content.startsWith("!")) return false;

  const parts = content.slice(1).split(/\s+/);
  const cmdName = parts[0].toLowerCase();
  const args = parts.slice(1);

  const cmd = registeredCommands.get(cmdName);
  if (!cmd) return false;

  const cmdCtx: ChannelCommandContext = {
    channel: roomId,
    channelType: "matrix",
    sender: senderId,
    args,
    reply: replyFn,
    getBotUsername: () => cachedBotUsername,
  };

  try {
    await cmd.handler(cmdCtx);
    return true;
  } catch (error) {
    logger.error({ msg: "Channel command error", cmd: cmdName, error: String(error) });
    await replyFn(`Error executing !${cmdName}: ${error}`);
    return true;
  }
}

/**
 * Check if a message matches any registered parser and handle it.
 */
export async function handleRegisteredParsers(
  roomId: string,
  senderId: string,
  body: string,
  replyFn: (msg: string) => Promise<void>,
): Promise<boolean> {
  for (const parser of registeredParsers.values()) {
    let matches = false;
    if (typeof parser.pattern === "function") {
      matches = parser.pattern(body);
    } else {
      parser.pattern.lastIndex = 0;
      matches = parser.pattern.test(body);
    }

    if (matches) {
      const msgCtx: ChannelMessageContext = {
        channel: roomId,
        channelType: "matrix",
        sender: senderId,
        content: body,
        reply: replyFn,
        getBotUsername: () => cachedBotUsername,
      };

      try {
        await parser.handler(msgCtx);
        return true;
      } catch (error) {
        logger.error({ msg: "Message parser error", id: parser.id, error: String(error) });
        return false;
      }
    }
  }
  return false;
}
