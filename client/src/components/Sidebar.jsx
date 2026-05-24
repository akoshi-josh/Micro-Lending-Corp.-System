import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navSections = [
  {
    label: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: '📊' },
    ]
  },
  {
    label: 'Clients',
    items: [
      { path: '/borrowers', label: 'Borrowers', icon: '👥' },
      { path: '/loans/new', label: 'New Loan',  icon: '➕' },
    ]
  },
  {
    label: 'Ledgers',
    items: [
      { path: '/subsidiary', label: 'Subsidiary Ledger', icon: '📒' },
      { path: '/general',    label: 'General Ledger',    icon: '📗' },
      { path: '/accounts',   label: 'Accounts',          icon: '🏦' },
      { path: '/interest',   label: 'Interest Ledger',   icon: '💹' },
    ]
  },
  {
    label: 'Finance',
    items: [
      { path: '/vouchers', label: 'Cash Voucher', icon: '🧾' },
      { path: '/expenses', label: 'Expenses',     icon: '📉' },
    ]
  },
  {
    label: 'Settings',
    items: [
      { path: '/settings', label: 'Loan Settings', icon: '⚙️' },
    ]
  },
];

const roboto = { fontFamily: "'Roboto', sans-serif" };

export default function Sidebar() {
  const { logout, user } = useAuth();

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap"
        rel="stylesheet"
      />

      <aside
        className="w-64 min-h-screen bg-blue-900 flex flex-col no-print relative overflow-hidden"
        style={roboto}
      >
        {/* Decorative rings — same as Login left panel */}
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full border border-white/[0.04] pointer-events-none" />

        {/* ── LOGO ── */}
        <div className="px-5 py-5 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-base flex-shrink-0 border border-yellow-400/50">
              💰
            </div>
            <span className="text-white font-black text-[1rem] tracking-tight leading-none" style={roboto}>
              MicroLend
            </span>
          </div>
          <p className="text-white/40 text-[0.68rem] font-medium uppercase tracking-widest mt-1 pl-0.5">
            Admin Portal
          </p>
        </div>

        {/* ── NAV ── */}
        <nav className="flex-1 py-3 overflow-y-auto relative z-10">
          {navSections.map((section) => (
            <div key={section.label} className="mb-1">

              {/* Section label */}
              <div className="px-5 pt-3 pb-1 flex items-center gap-2">
                <span className="text-[0.62rem] font-bold text-white/35 uppercase tracking-[0.12em]" style={roboto}>
                  {section.label}
                </span>
                <span className="flex-1 h-px bg-white/10" />
              </div>

              {/* Nav items */}
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  style={roboto}
                  className={({ isActive }) =>
                    `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-[0.84rem] font-medium transition-all duration-150 relative ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Gold pill on active */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-yellow-400 rounded-r-full" />
                      )}
                      <span className="text-[0.9rem] flex-shrink-0 pl-1">{item.icon}</span>
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* ── USER FOOTER ── */}
        <div className="px-4 py-4 border-t border-white/10 relative z-10">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/10 border border-white/10 mb-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-[0.72rem] font-black flex-shrink-0 border border-yellow-400/50">
              {(user?.username || 'A').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[0.82rem] font-bold text-white truncate leading-tight" style={roboto}>
                {user?.username || 'admin'}
              </div>
              <div className="text-[0.65rem] text-white/40 font-medium uppercase tracking-wider" style={roboto}>
                Administrator
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[0.82rem] font-medium text-white/50 hover:bg-white/10 hover:text-red-300 transition-colors duration-150"
            style={roboto}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>

      </aside>
    </>
  );
}