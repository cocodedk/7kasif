import { useState } from 'react';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onSkip: () => void;
}

export function LoginScreen({ onLogin, onSkip }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin(username, password);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <h1 className="text-3xl font-bold mb-1">Hafte Kasif</h1>
      <p className="text-gray-400 text-sm mb-8">The Dirty Seven</p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Username"
          maxLength={50}
          autoComplete="username"
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
        />

        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
        />

        {error && (
          <div className="bg-red-900/50 text-red-300 text-sm px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !username || !password}
          className="w-full font-bold py-3 rounded-lg transition-colors disabled:bg-gray-700 text-white bg-green-600 active:bg-green-700"
        >
          {loading ? '...' : 'Log In'}
        </button>

        <button
          type="button"
          onClick={onSkip}
          className="w-full text-gray-400 py-2 text-sm"
        >
          Play as Guest
        </button>
      </form>
    </div>
  );
}
