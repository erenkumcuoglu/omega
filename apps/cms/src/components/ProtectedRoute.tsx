import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole = [] 
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#0f172a',
        color: '#e2e8f0',
        fontSize: '18px'
      }}>
        <div>🔐 Authenticating...</div>
      </div>
    );
  }

  if (!user) {
    // Login component already exists, use it
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#0f172a',
        padding: '20px'
      }}>
        <div style={{
          background: '#1e293b',
          padding: '40px',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '400px',
          border: '1px solid #334155'
        }}>
          <h2 style={{
            textAlign: 'center',
            marginBottom: '30px',
            color: '#f1f5f9',
            fontSize: '24px'
          }}>
            🔐 Omega Dijital Admin
          </h2>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;
            
            try {
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
              });

              if (response.ok) {
                const { user, token } = await response.json();
                localStorage.setItem('token', token);
                window.location.reload();
              } else {
                alert('Invalid credentials');
              }
            } catch (error) {
              alert('Login failed');
            }
          }}>
            <div style={{ marginBottom: '20px' }}>
              <input
                name="email"
                type="email"
                placeholder="Email"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <input
                name="password"
                type="password"
                placeholder="Password"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (requiredRole.length > 0 && !requiredRole.includes(user.role)) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#0f172a',
        color: '#e2e8f0'
      }}>
        <div style={{
          background: '#1e293b',
          padding: '40px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #334155'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '20px' }}>🚫 Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
