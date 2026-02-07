import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { UserProvider } from "./context/UserContext";
import { SocketProvider } from "./context/SocketContext";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <UserProvider>
      <SocketProvider>
        <RouterProvider router={router} />
        <Toaster />
      </SocketProvider>
    </UserProvider>
  );
}

export default App

