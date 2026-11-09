import React from 'react';
import { UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleDateString();
};

export const ProfileView: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <section className="mx-auto max-w-3xl py-8">
        <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Sign in to view your profile.
        </p>
      </section>
    );
  }

  const fields = [
    { label: 'Name', value: user.name },
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role },
    { label: 'Account status', value: user.status },
    { label: 'Phone', value: user.phone || 'Not provided' },
    { label: 'Department', value: user.departmentName || 'Not assigned' },
    { label: 'Member since', value: formatDate(user.createdAt) },
  ];

  return (
    <section aria-labelledby="profile-title" className="mx-auto max-w-3xl space-y-5 py-6">
      <header className="flex items-center gap-3 border-b border-emerald-100 pb-4">
        <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 id="profile-title" className="text-xl font-bold text-slate-900">My Profile</h1>
          <p className="mt-1 text-sm text-slate-600">Account details returned by your authenticated session.</p>
        </div>
      </header>

      <dl className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        {fields.map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-slate-50 p-4">
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
