export type {
  AgentIdentity,
  ChannelCommand,
  ChannelCommandContext,
  ChannelMessageContext,
  ChannelMessageParser,
  ChannelProvider,
  ChannelRef,
  ConfigField,
  ConfigSchema,
  EventHandler,
  PluginCommand,
  PluginInjectOptions,
  PluginLogger,
  SessionCreateEvent,
  SessionInjectEvent,
  SessionResponseEvent,
  StreamMessage,
  UserProfile,
  WOPREvent,
  WOPREventBus,
  WOPRPlugin,
  WOPRPluginContext,
} from "@wopr-network/plugin-types";

/** Matrix room event as received from matrix-bot-sdk */
export interface MatrixRoomEvent {
  type: string;
  sender: string;
  event_id: string;
  room_id: string;
  origin_server_ts: number;
  content: {
    msgtype?: string;
    body?: string;
    formatted_body?: string;
    format?: string;
    url?: string;
    info?: {
      mimetype?: string;
      size?: number;
      w?: number;
      h?: number;
    };
    "m.relates_to"?: {
      "m.in_reply_to"?: { event_id: string };
    };
  };
}

/** Stream event from plugin context on() subscription */
export interface SessionStreamEvent {
  session: string;
  from: string;
  message: import("@wopr-network/plugin-types").StreamMessage;
}
