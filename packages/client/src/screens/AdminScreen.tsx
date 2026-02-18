import { useState } from 'react';

interface AdminScreenProps {
  token: string;
  onBack: () => void;
}

export function AdminScreen({ token, onBack }: AdminScreenProps) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedDisplayName = displayName.trim();
      const res = await fetch(`${window.location.origin}/api/admin/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: trimmedEmail, displayName: trimmedDisplayName }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }

      setSuccess(`Created player "${displayName}" — login link sent to ${email}`);
      setEmail('');
      setDisplayName('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <h1 className="text-3xl font-bold mb-1">Admin</h1>
      <p className="text-gray-400 text-sm mb-8">Create a new player</p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Display name"
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
        />

        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
        />

        {error && (
          <div className="bg-red-900/50 text-red-300 text-sm px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/50 text-green-300 text-sm px-4 py-2 rounded-lg">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !displayName}
          className="w-full font-bold py-3 rounded-lg transition-colors disabled:bg-gray-700 text-white bg-green-600 active:bg-green-700"
        >
          {loading ? '...' : 'Create Player'}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full text-gray-400 py-2 text-sm underline"
        >
          Back
        </button>
      </form>
    </div>
  );
}
