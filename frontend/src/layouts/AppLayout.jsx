import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bookmark, BarChart3, BookOpen, Briefcase, ClipboardList, Compass, FileText, GraduationCap,
  LayoutDashboard, LogOut, Menu, Search, Sparkles, User, Users, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import { Skeleton } from '../components/ui';
import { initials } from '../utils/format';

const CANDIDATE_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/resume', label: 'Resume', icon: FileText },
  { to: '/jobs', label: 'Find Jobs', icon: Search },
  { to: '/matches', label: 'My Matches', icon: Sparkles },
  { to: '/saved', label: 'Saved Jobs', icon: Bookmark },
  { to: '/applications', label: 'Applications', icon: ClipboardList },
  { to: '/careers', label: 'Career Paths', icon: Compass },
  { to: '/learning', label: 'Skills / Learning', icon: GraduationCap },
  { to: '/profile', label: 'Profile', icon: User },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/admin/careers', label: 'Career Paths', icon: Compass },
  { to: '/admin/resources', label: 'Learning Resources', icon: BookOpen },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export function Brand({ to = '/' }) {
  return (
    <Link to={to} className="sidebar-brand" aria-label="JobSense home">
      <span className="brand-mark" aria-hidden="true">J</span>
      <span>
        <span className="brand-name">JobSense</span>
        <span className="brand-tag">Resume &amp; job intelligence</span>
      </span>
    </Link>
  );
}

export default function AppLayout({ admin = false }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const nav = admin ? ADMIN_NAV : CANDIDATE_NAV;

  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">Skip to content</a>

      <aside id="app-sidebar" className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
        <Brand to={admin ? '/admin' : '/dashboard'} />
        <nav>
          {admin && <div className="nav-section">Administration</div>}
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} aria-hidden="true" /> {label}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <>
              <div className="nav-section">Switch view</div>
              <NavLink to={admin ? '/dashboard' : '/admin'} className="nav-link">
                {admin ? <User size={18} aria-hidden="true" /> : <BarChart3 size={18} aria-hidden="true" />}
                {admin ? 'Candidate view' : 'Admin console'}
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="avatar" aria-hidden="true">{initials(user?.name)}</span>
            <span className="who"><strong>{user?.name}</strong><span>{user?.email}</span></span>
          </div>
          <button type="button" className="btn btn-sm btn-logout" onClick={handleLogout}>
            <LogOut size={15} aria-hidden="true" /> Log out
          </button>
        </div>
      </aside>
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="main">
        <header className="topbar">
          <Brand to={admin ? '/admin' : '/dashboard'} />
          <button type="button" className="btn btn-icon" onClick={() => setOpen((o) => !o)}
            aria-expanded={open} aria-controls="app-sidebar" aria-label={open ? 'Close menu' : 'Open menu'}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
        <main id="main" className="main-content" tabIndex={-1}>
          <Suspense fallback={<Skeleton count={3} />}>
            <Outlet />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}
