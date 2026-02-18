import { useEffect } from 'react';
import type { Card as CardType } from '@hafte-kasif/shared';
import { Card } from './Card.js';

interface VictoryTransitionProps {
  winnerName: string;
  loserName: string;
  points: number;
  reversed: boolean;
  lastCard: CardType | null;
  finishedByName: string;
  onComplete: () => void;
}

const DURATION_MS = 5000;

const PARTICLE_COLORS = [
  '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
  '#85C1E9', '#F1948A', '#82E0AA', '#F8C471', '#AED6F1',
];

export function VictoryTransition({
  winnerName,
  loserName,
  points,
  reversed,
  lastCard,
  finishedByName,
  onComplete,
}: VictoryTransitionProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, DURATION_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <style>{`
        @keyframes vt-pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        @keyframes vt-trophy-enter {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
          80% { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes vt-slide-up {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes vt-loser-in {
          0% { transform: translateY(-20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes vt-points-pop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes vt-particle {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-100vh) scale(0.3); opacity: 0; }
        }
        @keyframes vt-fade-out {
          0%, 80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* Background */}
      <div
        className="absolute inset-0 bg-gradient-radial"
        style={{
          background: 'radial-gradient(circle at center, #1a1a2e 0%, #0a0a15 100%)',
          animation: 'vt-pulse 2s ease-in-out infinite',
        }}
      />

      {/* Particles */}
      {PARTICLE_COLORS.map((color, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${6 + (i % 4) * 3}px`,
            height: `${6 + (i % 4) * 3}px`,
            backgroundColor: color,
            left: `${5 + (i * 6.3) % 90}%`,
            bottom: '-10px',
            animation: `vt-particle ${2.5 + (i % 5) * 0.6}s ease-out ${(i % 8) * 0.3}s infinite`,
            opacity: 0.8,
          }}
        />
      ))}

      {/* Main content */}
      <div
        className="relative flex flex-col items-center text-center px-6"
        style={{ animation: `vt-fade-out ${DURATION_MS / 1000}s ease-in forwards` }}
      >
        {/* Trophy */}
        <div
          className="text-7xl mb-4"
          style={{ animation: 'vt-trophy-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
        >
          {reversed ? '🔄' : '🏆'}
        </div>

        {/* Last card played */}
        {lastCard && (
          <div
            className="mb-4 flex flex-col items-center"
            style={{ animation: 'vt-slide-up 0.4s ease-out 0.15s both' }}
          >
            <p className="text-sm text-gray-400 mb-2">
              {finishedByName} played
            </p>
            <Card card={lastCard} centered width={72} />
          </div>
        )}

        {reversed ? (
          <>
            {/* Reversal — loser first */}
            <div style={{ animation: 'vt-slide-up 0.5s ease-out 0.3s both' }}>
              <div className="bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg mb-3 text-sm">
                Reversal! Tied losers became winners
              </div>
              <h1 className="text-3xl font-bold text-red-400 mb-1">{loserName}</h1>
              <p className="text-lg text-red-300/70">loses the round!</p>
            </div>

            <div
              className="mt-5 bg-red-500/20 border border-red-500/40 rounded-full px-6 py-2"
              style={{ animation: 'vt-points-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1s both' }}
            >
              <span className="text-2xl font-bold text-red-400">−{points}</span>
              <span className="text-red-200/70 ml-2 text-sm">points</span>
            </div>

            <div
              className="mt-8"
              style={{ animation: 'vt-loser-in 0.6s ease-out 2s both' }}
            >
              <span className="text-3xl">🎉</span>
              <p className="text-lg text-green-300/80 mt-1">{winnerName}</p>
              <p className="text-sm text-green-400/60">+{points} points</p>
            </div>
          </>
        ) : (
          <>
            {/* Normal — winner first */}
            <div style={{ animation: 'vt-slide-up 0.5s ease-out 0.3s both' }}>
              <h1 className="text-4xl font-bold text-yellow-300 mb-1">{winnerName}</h1>
              <p className="text-xl text-yellow-100/80">wins the round!</p>
            </div>

            <div
              className="mt-5 bg-yellow-500/20 border border-yellow-500/40 rounded-full px-6 py-2"
              style={{ animation: 'vt-points-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1s both' }}
            >
              <span className="text-2xl font-bold text-yellow-300">+{points}</span>
              <span className="text-yellow-200/70 ml-2 text-sm">points</span>
            </div>

            <div
              className="mt-8"
              style={{ animation: 'vt-loser-in 0.6s ease-out 2s both' }}
            >
              <span className="text-3xl">💀</span>
              <p className="text-lg text-red-300/80 mt-1">{loserName}</p>
              <p className="text-sm text-red-400/60">−{points} points</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
