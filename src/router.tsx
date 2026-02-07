import { createBrowserRouter, Navigate } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />, // Login has its own layout (no MainLayout)
  },
  {
    path: "/",
    element: <ProtectedRoute />, // Protected route wrapper
    children: [
      {
        element: <MainLayout />, // MainLayout wraps protected routes
        children: [
          {
            index: true,
            element: <Home />, // Chat area
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
