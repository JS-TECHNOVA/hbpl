'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  type FormEvent,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  Image,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Settings,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { adminLogin, adminMe, type AdminUser } from '@/lib/api';

export type AdminSection =
  | 'dashboard'
  | 'students'
  | 'examPortal'
  | 'volunteers'
  | 'gallery'
  | 'management'
  | 'teams'
  | 'matches';

export const ADMIN_NAV: {
  id: AdminSection;
  label: string;
  href: string;
  icon: LucideIcon;
}[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/staff', icon: BarChart3 },
  { id: 'students', label: 'Exam Students', href: '/staff/exam-students', icon: BookOpen },
  { id: 'examPortal', label: 'Exam Portal', href: '/staff/exam-portal', icon: Settings },
  { id: 'volunteers', label: 'Volunteers', href: '/staff/volunteers', icon: Users },
  { id: 'gallery', label: 'Gallery', href: '/staff/gallery', icon: Image },
  { id: 'management', label: 'Management', href: '/staff/management', icon: Settings },
  { id: 'teams', label: 'Teams', href: '/staff/teams', icon: Trophy },
  { id: 'matches', label: 'Matches', href: '/staff/matches', icon: ChevronRight },
];

type AdminContextValue = {
  token: string;
  user: AdminUser;
  logout: () => void;
  can: (perm: string) => boolean;
};

const AdminContext = createContext<AdminContextValue | null>(null);

function saveToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hbpl_admin_token', token);
  }
}

function loadToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('hbpl_admin_token');
  }

  return null;
}

function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('hbpl_admin_token');
  }
}

function getActiveSection(pathname: string): AdminSection {
  if (pathname.startsWith('/staff/exam-students')) return 'students';
  if (pathname.startsWith('/staff/exam-portal')) return 'examPortal';
  if (pathname.startsWith('/staff/volunteers')) return 'volunteers';
  if (pathname.startsWith('/staff/gallery')) return 'gallery';
  if (pathname.startsWith('/staff/management')) return 'management';
  if (pathname.startsWith('/staff/teams')) return 'teams';
  if (pathname.startsWith('/staff/matches')) return 'matches';
  return 'dashboard';
}

function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    try {
      const result = await adminLogin(username.trim(), password);
      saveToken(result.token);
      onLogin(result.token);
      toast({ title: `Welcome, ${result.username}` });
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'Invalid credentials.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border dark:border-gray-800">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <LogIn className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">HBPL Admin</h1>
            <p className="text-xs text-gray-500">Website Management</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Django admin username"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used inside AdminAppShell');
  }
  return context;
}

export function AdminAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setToken(loadToken());
    setHydrated(true);
  }, []);

  const userQuery = useQuery({
    queryKey: ['admin-me', token],
    queryFn: () => adminMe(token!),
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (!token || !userQuery.isError) return;

    clearToken();
    setToken(null);
    toast({ title: 'Session expired', variant: 'destructive' });
  }, [token, userQuery.isError, toast]);

  const handleLogout = () => {
    clearToken();
    setToken(null);
    toast({ title: 'Logged out' });
  };

  if (!hydrated || (token && userQuery.isLoading)) {
    return <FullScreenSpinner />;
  }

  if (!token) {
    return <LoginForm onLogin={setToken} />;
  }

  if (!userQuery.data) {
    return <FullScreenSpinner />;
  }

  const section = getActiveSection(pathname);
  const can = (perm: string) =>
    userQuery.data.is_superuser || userQuery.data.user_permissions.includes(perm);
  const contextValue = { token, user: userQuery.data, logout: handleLogout, can };

  return (
    <AdminContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
        <aside className="hidden md:flex w-56 flex-shrink-0 flex-col bg-white dark:bg-gray-900 border-r dark:border-gray-800 min-h-screen">
          <div className="p-4 border-b dark:border-gray-800">
            <h1 className="text-base font-bold text-gray-900 dark:text-white">HBPL Admin</h1>
            <p className="text-xs text-gray-500 mt-0.5">{userQuery.data.username}</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    section === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t dark:border-gray-800">
            <Button variant="ghost" size="sm" className="w-full justify-start text-gray-500" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </aside>

        {sidebarOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-56 bg-white dark:bg-gray-900 flex flex-col">
              <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
                <h1 className="text-base font-bold">HBPL Admin</h1>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {ADMIN_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        section === item.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        ) : null}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden bg-white dark:bg-gray-900 border-b dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-sm">{ADMIN_NAV.find((item) => item.id === section)?.label}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}