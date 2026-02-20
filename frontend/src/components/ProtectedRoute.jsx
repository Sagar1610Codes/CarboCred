import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute
 * Wraps any route that requires the user to be authenticated.
 * If not authenticated, redirects to /auth, passing the attempted
 * path in location.state so Auth can redirect back after login.
 */
export default function ProtectedRoute({ isAuthenticated, children }) {
    const location = useLocation();

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/auth"
                state={{ from: location.pathname }}
                replace
            />
        );
    }

    return children;
}
