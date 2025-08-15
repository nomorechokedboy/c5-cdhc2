import { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  // Auto logout timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const checkAuth = () => {
      const stored = localStorage.getItem('isAuthenticated') === 'true';
      setIsAuthenticated(stored);
    };
    checkAuth();
    window.addEventListener('storage', checkAuth);

    // Auto logout logic
    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      if (isAuthenticated) {
        timer = setTimeout(() => {
          logout();
        }, 60000);
      }
    };
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      window.removeEventListener('storage', checkAuth);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timer) clearTimeout(timer);
    };
  }, [isAuthenticated]);

  const login = () => {
    localStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
