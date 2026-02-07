import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { UserProvider } from "./context/UserContext";
import { SocketProvider } from "./context/SocketContext";
import { SettingsProvider } from "./context/SettingsContext";
import { Toaster } from "./components/ui/toaster";

/**
 * App — Root component of LinguaFlow.
 *
 * Wraps the entire application in the required context providers:
 * - UserProvider   → authentication state (login/logout)
 * - SettingsProvider → user preferences (default language, models)
 * - SocketProvider → real-time WebSocket connection & messaging
 */
function App() {
  return (
    <UserProvider>
      <SettingsProvider>
        <SocketProvider>
          <RouterProvider router={router} />
          <Toaster />
        </SocketProvider>
      </SettingsProvider>
    </UserProvider>
  );
}

export default App

