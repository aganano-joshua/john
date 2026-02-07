import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from '../context/UserContext';
import type { Message, User } from '@/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface UseSocketReturn {
  socket: Socket | null;
  sendMessage: (message: Message) => void;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  setTyping: (chatId: string, isTyping: boolean) => void;
}

export function useSocket(
  onMessageReceive?: (message: Message) => void,
  onUserOnline?: (data: { userId: string; isOnline: boolean; userInfo?: User }) => void,
  onUserOffline?: (data: { userId: string; isOnline: boolean; userInfo?: User }) => void,
  onUsersList?: (users: User[]) => void,
): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    // Create socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      
      // Join with user info
      socket.emit('user:join', {
        id: user.userId,
        name: user.name,
        email: user.email,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`,
      });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Message events
    socket.on('message:receive', (message: Message) => {
      console.log('Message received:', message);
      onMessageReceive?.(message);
    });

    // User presence events
    socket.on('user:online', (data) => {
      console.log('User online:', data);
      onUserOnline?.(data);
    });

    socket.on('user:offline', (data) => {
      console.log('User offline:', data);
      onUserOffline?.(data);
    });

    socket.on('users:list', (users) => {
      console.log('Users list received:', users);
      onUsersList?.(users);
    });

    // Cleanup
    return () => {
      console.log('Cleaning up socket connection');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, onMessageReceive, onUserOnline, onUserOffline, onUsersList]);

  const sendMessage = useCallback((message: Message) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message:send', message);
    } else {
      console.error('Socket not connected');
    }
  }, []);

  const joinChat = useCallback((chatId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:join', chatId);
    }
  }, []);

  const leaveChat = useCallback((chatId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:leave', chatId);
    }
  }, []);

  const setTyping = useCallback((chatId: string, isTyping: boolean) => {
    if (socketRef.current?.connected && user) {
      socketRef.current.emit('user:typing', {
        chatId,
        userId: user.userId,
        isTyping,
      });
    }
  }, [user]);

  return {
    socket: socketRef.current,
    sendMessage,
    joinChat,
    leaveChat,
    setTyping,
  };
}
