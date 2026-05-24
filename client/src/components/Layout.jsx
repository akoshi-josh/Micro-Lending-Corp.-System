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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={title} />
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}