/**
 * SocketContext.tsx
 * =================
 * Real-time messaging layer for LinguaFlow.
 *
 * This context manages a single Socket.IO connection per logged-in
 * user.  It provides:
 *  - **Connection state** (`isConnected`)
 *  - **Presence tracking** (`onlineUsers`)
 *  - **Message store** (`messages`) for the current session
 *  - **Room management** (`joinRoom`, `leaveRoom`)
 *  - **Sending messages** (`sendMessage`) — both text and audio
 *  - **Typing indicator** (`setTyping`)
 *
 * The socket automatically connects when a user is logged in
 * and disconnects on logout or component unmount.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useUser } from "./UserContext";
import type { User } from "@/types";

/** Backend URL for the Socket.IO server (defaults to localhost:3001) */
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

/**
 * Shape of a chat message travelling over the socket.
 * Both text and audio messages use this interface.
 * - `type: "text"` — `content` holds the text body.
 * - `type: "audio"` — `audioUrl` holds a data-URL or HTTP URL
 *    to the audio file; `content` is a label like "🎤 Voice message".
 */
export interface ChatMessage {
  /** Unique message ID (timestamp + userId by convention) */
  id: string;
  /** Room (conversation) this message belongs to */
  roomId: string;
  /** Text body — or label for audio messages */
  content: string;
  /** Who sent this message */
  senderId: string;
  /** Human-readable sender name */
  senderName: string;
  /** When the message was created */
  timestamp: Date;
  /** "text" for plain text, "audio" for voice / synthesised */
  type: "text" | "audio";
  /** If the message was translated before sending, the original text */
  translatedText?: string;
  /** Audio data URL (base64) or HTTP URL for audio messages */
  audioUrl?: string;
}

/** Values exposed to consumers via useSocketCtx() */
interface SocketContextType {
  /** Raw Socket.IO client (rarely needed directly) */
  socket: Socket | null;
  /** Whether the socket is currently connected to the server */
  isConnected: boolean;
  /** List of users who are currently online */
  onlineUsers: User[];
  /** All messages received/sent during this session */
  messages: ChatMessage[];
  /** Send a ChatMessage to the server and add it to local state */
  sendMessage: (message: ChatMessage) => void;
  /** Join a chat room (1-on-1 conversation) */
  joinRoom: (roomId: string) => void;
  /** Leave a chat room */
  leaveRoom: (roomId: string) => void;
  /** Emit a typing indicator to the other participant */
  setTyping: (roomId: string, isTyping: boolean) => void;
  /** Map of roomId → number of unread messages (from others) */
  unreadCounts: Record<string, number>;
  /** Reset the unread count for a specific room to 0 */
  markRoomRead: (roomId: string) => void;
  /** The most recently received message from another user (for toast) */
  lastReceivedMessage: ChatMessage | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

/**
 * Build a deterministic room ID from two user IDs.
 * Sorts alphabetically so both users always compute the same room.
 */
export function buildRoomId(userA: string, userB: string): string {
  return [userA, userB].sort().join("__");
}

/**
 * SocketProvider
 * Wraps the app and manages a single Socket.IO connection + message state.
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const currentRoomRef = useRef<string | null>(null);

  /** Tracks unread message count per room */
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  /** The most recently received message from another user (drives toast popup) */
  const [lastReceivedMessage, setLastReceivedMessage] =
    useState<ChatMessage | null>(null);

  // ---- socket lifecycle (runs once per user login) ----
  useEffect(() => {
    if (!user) {
      // User logged out — clean up
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setOnlineUsers([]);
      setMessages([]);
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] connected:", socket.id);
      setIsConnected(true);

      socket.emit("user:join", {
        id: user.userId,
        name: user.name,
        email: user.email,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`,
      });
    });

    socket.on("disconnect", () => {
      console.log("[Socket] disconnected");
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] connection error:", err.message);
    });

    // ---- presence ----
    socket.on("users:list", (users: User[]) => {
      console.log("[Socket] users:list", users.length);
      setOnlineUsers(users);
    });

    socket.on("user:online", (data: { userId: string; isOnline: boolean; userInfo?: User }) => {
      if (data.userInfo && data.isOnline) {
        setOnlineUsers((prev) => {
          if (prev.some((u) => u.id === data.userInfo!.id)) return prev;
          return [...prev, data.userInfo!];
        });
      }
    });

    socket.on("user:offline", (data: { userId: string }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== data.userId));
    });

    // ---- messages ----
    socket.on("message:receive", (msg: ChatMessage) => {
      console.log("[Socket] message:receive", msg.id, "room:", msg.roomId);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev; // dedupe
        return [
          ...prev,
          { ...msg, timestamp: new Date(msg.timestamp) },
        ];
      });

      // Track unread: if this message is NOT in the currently opened room,
      // increment the unread counter for that room.
      const incomingRoomId = msg.roomId;
      if (incomingRoomId !== currentRoomRef.current) {
        setUnreadCounts((prev) => ({
          ...prev,
          [incomingRoomId]: (prev[incomingRoomId] || 0) + 1,
        }));
      }

      // Store the message so Home.tsx can show a toast notification
      setLastReceivedMessage({ ...msg, timestamp: new Date(msg.timestamp) });
    });

    return () => {
      console.log("[Socket] cleanup");
      socket.disconnect();
      socketRef.current = null;
    };
    // Only depend on user identity — callbacks use refs / setState updaters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  // ---- actions ----

  /** Send a message via the socket and add it to local state immediately */
  const sendMessage = useCallback((message: ChatMessage) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("message:send", message);
      // Also add to local state immediately for sender
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    } else {
      console.error("[Socket] not connected — message not sent");
    }
  }, []);

  /** Join a specific chat room (leave the previous one first) */
  const joinRoom = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      // Leave previous room first
      if (currentRoomRef.current && currentRoomRef.current !== roomId) {
        socketRef.current.emit("chat:leave", currentRoomRef.current);
      }
      socketRef.current.emit("chat:join", roomId);
      currentRoomRef.current = roomId;

      // Clear unread count for this room since the user is now viewing it
      setUnreadCounts((prev) => {
        if (!prev[roomId]) return prev;
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
    }
  }, []);

  /** Leave a chat room so we stop receiving its events */
  const leaveRoom = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("chat:leave", roomId);
      if (currentRoomRef.current === roomId) currentRoomRef.current = null;
    }
  }, []);

  /** Notify the other participant that this user is/isn't typing */
  const setTyping = useCallback(
    (roomId: string, isTyping: boolean) => {
      if (socketRef.current?.connected && user) {
        socketRef.current.emit("user:typing", {
          chatId: roomId,
          userId: user.userId,
          isTyping,
        });
      }
    },
    [user],
  );

  /** Reset the unread count for a given room (e.g. when opening the chat) */
  const markRoomRead = useCallback((roomId: string) => {
    setUnreadCounts((prev) => {
      if (!prev[roomId]) return prev;
      const next = { ...prev };
      delete next[roomId];
      return next;
    });
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        onlineUsers,
        messages,
        sendMessage,
        joinRoom,
        leaveRoom,
        setTyping,
        unreadCounts,
        markRoomRead,
        lastReceivedMessage,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Hook to consume the socket context.
 * Must be called inside a <SocketProvider>.
 */
export function useSocketCtx() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocketCtx must be used within SocketProvider");
  return ctx;
}
