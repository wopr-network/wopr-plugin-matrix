import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRegisteredCommand,
  handleRegisteredCommand,
  handleRegisteredParsers,
  matrixChannelProvider,
  setCachedBotUsername,
  setChannelProviderClient,
} from "../../src/channel-provider.js";
import { createMockMatrixClient } from "../mocks/matrix-client.js";

describe("matrixChannelProvider", () => {
  beforeEach(() => {
    // Clear state between tests
    for (const cmd of matrixChannelProvider.getCommands()) {
      matrixChannelProvider.unregisterCommand(cmd.name);
    }
    for (const parser of matrixChannelProvider.getMessageParsers()) {
      matrixChannelProvider.removeMessageParser(parser.id);
    }
  });

  it("registers and retrieves commands", () => {
    const handler = vi.fn();
    matrixChannelProvider.registerCommand({ name: "test", description: "Test command", handler });
    expect(matrixChannelProvider.getCommands()).toHaveLength(1);
    expect(getRegisteredCommand("test")).toBeDefined();
  });

  it("unregisters commands", () => {
    const handler = vi.fn();
    matrixChannelProvider.registerCommand({ name: "test", description: "Test command", handler });
    matrixChannelProvider.unregisterCommand("test");
    expect(matrixChannelProvider.getCommands()).toHaveLength(0);
  });

  it("registers and retrieves message parsers", () => {
    matrixChannelProvider.addMessageParser({
      id: "test-parser",
      pattern: /hello/,
      handler: vi.fn(),
    });
    expect(matrixChannelProvider.getMessageParsers()).toHaveLength(1);
  });

  it("removes message parsers", () => {
    matrixChannelProvider.addMessageParser({
      id: "test-parser",
      pattern: /hello/,
      handler: vi.fn(),
    });
    matrixChannelProvider.removeMessageParser("test-parser");
    expect(matrixChannelProvider.getMessageParsers()).toHaveLength(0);
  });

  it("returns cached bot username", () => {
    setCachedBotUsername("TestBot");
    expect(matrixChannelProvider.getBotUsername()).toBe("TestBot");
  });

  it("send() calls sendMessage for each chunk", async () => {
    const mockClient = createMockMatrixClient();
    setChannelProviderClient(mockClient as unknown as import("matrix-bot-sdk").MatrixClient);

    await matrixChannelProvider.send("!room:example.org", "Hello");
    expect(mockClient.sendMessage).toHaveBeenCalledTimes(1);
    expect(mockClient.sendMessage).toHaveBeenCalledWith("!room:example.org", expect.objectContaining({ msgtype: "m.text" }));

    setChannelProviderClient(null);
  });

  it("send() throws when client not initialized", async () => {
    setChannelProviderClient(null);
    await expect(matrixChannelProvider.send("!room:example.org", "Hello")).rejects.toThrow("Matrix client not initialized");
  });
});

describe("handleRegisteredCommand", () => {
  const replyFn = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    for (const cmd of matrixChannelProvider.getCommands()) {
      matrixChannelProvider.unregisterCommand(cmd.name);
    }
    vi.clearAllMocks();
  });

  it("handles ! commands", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    matrixChannelProvider.registerCommand({ name: "help", description: "help", handler });

    const handled = await handleRegisteredCommand("!room:example.org", "@user:example.org", "!help", replyFn);
    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it("ignores non-! messages", async () => {
    const handled = await handleRegisteredCommand("!room:example.org", "@user:example.org", "hello", replyFn);
    expect(handled).toBe(false);
  });

  it("returns false for unregistered commands", async () => {
    const handled = await handleRegisteredCommand("!room:example.org", "@user:example.org", "!unknown", replyFn);
    expect(handled).toBe(false);
  });

  it("calls replyFn with error message on handler failure", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("oops"));
    matrixChannelProvider.registerCommand({ name: "broken", description: "broken", handler });

    const handled = await handleRegisteredCommand("!room:example.org", "@user:example.org", "!broken", replyFn);
    expect(handled).toBe(true);
    expect(replyFn).toHaveBeenCalledWith(expect.stringContaining("Error"));
  });
});

describe("handleRegisteredParsers", () => {
  const replyFn = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    for (const parser of matrixChannelProvider.getMessageParsers()) {
      matrixChannelProvider.removeMessageParser(parser.id);
    }
    vi.clearAllMocks();
  });

  it("matches regex patterns", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    matrixChannelProvider.addMessageParser({ id: "greet", pattern: /^hello/i, handler });

    const handled = await handleRegisteredParsers("!room:example.org", "@user:example.org", "hello world", replyFn);
    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it("matches function patterns", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    matrixChannelProvider.addMessageParser({ id: "func-parser", pattern: (msg) => msg.startsWith("!"), handler });

    const handled = await handleRegisteredParsers("!room:example.org", "@user:example.org", "!test", replyFn);
    expect(handled).toBe(true);
  });

  it("returns false when no patterns match", async () => {
    matrixChannelProvider.addMessageParser({ id: "greet", pattern: /^hello/i, handler: vi.fn() });

    const handled = await handleRegisteredParsers("!room:example.org", "@user:example.org", "goodbye", replyFn);
    expect(handled).toBe(false);
  });
});
