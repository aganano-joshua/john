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

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

export interface ChatMessage {
  id: string;
  roomId: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: "text" | "audio";
  translatedText?: string;
  audioUrl?: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: User[];
  messages: ChatMessage[];
  sendMessage: (message: ChatMessage) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  setTyping: (roomId: string, isTyping: boolean) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

/** Build a deterministic room ID from two user IDs */
export function buildRoomId(userA: string, userB: string): string {
  return [userA, userB].sort().join("__");
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const currentRoomRef = useRef<string | null>(null);

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

  const joinRoom = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      // Leave previous room first
      if (currentRoomRef.current && currentRoomRef.current !== roomId) {
        socketRef.current.emit("chat:leave", currentRoomRef.current);
      }
      socketRef.current.emit("chat:join", roomId);
      currentRoomRef.current = roomId;
    }
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("chat:leave", roomId);
      if (currentRoomRef.current === roomId) currentRoomRef.current = null;
    }
  }, []);

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
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketCtx() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocketCtx must be used within SocketProvider");
  return ctx;
}
