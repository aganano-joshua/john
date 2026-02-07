import { useState } from "react";
import { ChatSidebar } from "../components/ChatSidebar";
import { ChatView } from "../components/ChatView";
import { useSocketCtx } from "../context/SocketContext";

const Home = () => {
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const { onlineUsers } = useSocketCtx();

  // Find the selected user from the live online-users list
  const activePeer = activeChat
    ? onlineUsers.find((u) => u.id === activeChat)
    : null;

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
