import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BorrowerList from './pages/BorrowerList';
import BorrowerProfile from './pages/BorrowerProfile';
import NewLoan from './pages/NewLoan';
import SubsidiaryLedger from './pages/SubsidiaryLedger';
import GeneralLedger from './pages/GeneralLedger';
import Accounts from './pages/Accounts';
import InterestLedger from './pages/InterestLedger';
import CashVoucher from './pages/CashVoucher';
import ExpenseLedger from './pages/ExpenseLedger';
import Settings from './pages/Settings';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="text-blue-700 font-semibold text-lg">Loading...</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="borrowers" element={<BorrowerList />} />
          <Route path="borrowers/:id" element={<BorrowerProfile />} />
          <Route path="loans/new" element={<NewLoan />} />
          <Route path="subsidiary" element={<SubsidiaryLedger />} />
          <Route path="general" element={<GeneralLedger />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="interest" element={<InterestLedger />} />
          <Route path="vouchers" element={<CashVoucher />} />
          <Route path="expenses" element={<ExpenseLedger />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}