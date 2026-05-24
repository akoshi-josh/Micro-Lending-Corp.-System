import { useAuth } from '../hooks/useAuth';

export default function TopBar({ title }) {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between no-print">
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      <div className="flex items-center gap-2">
        <span className="text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-semibold">
          {user?.username || 'Admin'} · Owner
        </span>
      </div>
    </header>
  );
}