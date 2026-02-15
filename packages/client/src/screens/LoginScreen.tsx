import { useState } from 'react';

interface LoginScreenProps {
  onRequestLink: (email: string) => Promise<void>;
  onSkip: () => void;
  error?: string;
}

export function LoginScreen({ onRequestLink, onSkip, error: externalError }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(externalError || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onRequestLink(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSendAgain = () => {
    setSent(false);
    setError('');
  };

  if (sent) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6">
        <h1 className="text-3xl font-bold mb-1">Hafte Kasif</h1>
        <p className="text-gray-400 text-sm mb-8">The Dirty Seven</p>

        <div className="w-full max-w-xs space-y-4 text-center">
          <div className="bg-green-900/50 text-green-300 text-sm px-4 py-3 rounded-lg">
            Check your email for a login link.
          </div>

          <p className="text-gray-400 text-sm">
            Sent to <span className="text-white">{email}</span>
          </p>

          <button
            type="button"
            onClick={handleSendAgain}
            className="text-gray-400 py-2 text-sm underline"
          >
            Send again
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="w-full text-gray-400 py-2 text-sm"
          >
            Play as Guest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <h1 className="text-3xl font-bold mb-1">Hafte Kasif</h1>
      <p className="text-gray-400 text-sm mb-8">The Dirty Seven</p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
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

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full font-bold py-3 rounded-lg transition-colors disabled:bg-gray-700 text-white bg-green-600 active:bg-green-700"
        >
          {loading ? '...' : 'Send Login Link'}
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
