import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const pageTitles = {
  '/': 'Dashboard',
  '/borrowers': 'Borrowers',
  '/loans/new': 'New Loan',
  '/subsidiary': 'Subsidiary Ledger',
  '/general': 'General Ledger',
  '/accounts': 'Accounts',
  '/interest': 'Interest Ledger',
  '/vouchers': 'Cash Voucher',
  '/expenses': 'Expense Ledger',
  '/settings': 'Loan Settings',
};

export default function Layout() {
  const location = useLocation();
  const path = '/' + location.pathname.split('/')[1];
  const title = pageTitles[path] || 'MicroLend';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar — fixed, never scrolls */}
      <div className="flex-shrink-0 h-screen overflow-y-auto">
        <Sidebar />
      </div>

      {/* Right side — topbar fixed + scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        {/* TopBar stays fixed at top */}
        <div className="flex-shrink-0">
          <TopBar title={title} />
        </div>

        {/* Main content scrolls independently */}
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}