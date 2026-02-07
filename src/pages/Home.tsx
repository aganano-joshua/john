import { useState, useEffect, useRef } from "react";
import { ChatSidebar } from "../components/ChatSidebar";
import { ChatView } from "../components/ChatView";
import { useSocketCtx, buildRoomId } from "../context/SocketContext";
import { useUser } from "../context/UserContext";
import { useToast } from "@/hooks/use-toast";

const Home = () => {
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const { onlineUsers, lastReceivedMessage } = useSocketCtx();
  const { user } = useUser();
  const { toast } = useToast();

  /**
   * Track the last notification we showed so we don't show
   * duplicate toasts for the same message.
   */
  const lastNotifiedIdRef = useRef<string | null>(null);

  // Find the selected user from the live online-users list
  const activePeer = activeChat
    ? onlineUsers.find((u) => u.id === activeChat)
    : null;

  /**
   * Toast notification for incoming messages.
   *
   * Fires whenever `lastReceivedMessage` changes.  If the message
   * is NOT in the currently active chat, a toast pops up telling
   * the user who sent the message.
   */
  useEffect(() => {
    if (!lastReceivedMessage || !user) return;

    // Don't notify for our own messages
    if (lastReceivedMessage.senderId === user.userId) return;

    // Avoid duplicate notifications for the same message
    if (lastReceivedMessage.id === lastNotifiedIdRef.current) return;
    lastNotifiedIdRef.current = lastReceivedMessage.id;

    // Build the roomId for the active chat to compare
    const activeRoomId = activeChat
      ? buildRoomId(user.userId, activeChat)
      : null;

    // Only show toast if the message is NOT for the currently open chat
    if (lastReceivedMessage.roomId === activeRoomId) return;

    const isAudio = lastReceivedMessage.type === "audio";
    toast({
      title: `New message from ${lastReceivedMessage.senderName}`,
      description: isAudio
        ? "🎤 Sent a voice message"
        : lastReceivedMessage.content.length > 80
          ? lastReceivedMessage.content.slice(0, 80) + "…"
          : lastReceivedMessage.content,
    });
  }, [lastReceivedMessage, activeChat, user, toast]);

  return (
    <div className="flex h-full">
      <ChatSidebar onChatSelect={setActiveChat} activeChat={activeChat} />
      <ChatView
        peerId={activeChat}
        peerName={activePeer?.name}
        peerAvatar={
          activePeer?.avatar ||
          (activePeer
            ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${activePeer.name}`
            : undefined)
        }
      />
    </div>
  );
};

export default Home;
