import { Outlet, Navigate } from "react-router-dom";

// Example of a wrapper component that checks for authentication
const AuthGuard = () => {
    const isAuthenticated = true; // Mock authentication logic

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="auth-guarded-section">
            <div className="bg-yellow-100 p-2 mb-4 text-sm text-yellow-800">
                🔒 This is a protected route wrapper
            </div>
            <Outlet />
        </div>
    );
};

export default AuthGuard;
