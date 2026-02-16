import { useMemo } from 'react';

const seaCreatures = [
  { emoji: '🦈', baseSize: 48 },
  { emoji: '🐟', baseSize: 32 },
  { emoji: '🐠', baseSize: 32 },
  { emoji: '🐡', baseSize: 30 },
  { emoji: '🐙', baseSize: 34 },
  { emoji: '🦑', baseSize: 34 },
  { emoji: '🦀', baseSize: 28 },
  { emoji: '🦞', baseSize: 28 },
  { emoji: '🐬', baseSize: 36 },
  { emoji: '🐳', baseSize: 44 },
  { emoji: '🐋', baseSize: 48 },
  { emoji: '🦭', baseSize: 32 },
  { emoji: '🐚', baseSize: 24 },
  { emoji: '🪸', baseSize: 26 },
  { emoji: '🐢', baseSize: 32 },
  { emoji: '🪼', baseSize: 28 },
];

const playingCards = [
  { emoji: '🃏', baseSize: 30 },
  { emoji: '♠️', baseSize: 26 },
  { emoji: '♥️', baseSize: 26 },
  { emoji: '♦️', baseSize: 26 },
  { emoji: '♣️', baseSize: 26 },
  { emoji: '🂡', baseSize: 30 },
  { emoji: '🂮', baseSize: 30 },
  { emoji: '🂱', baseSize: 30 },
  { emoji: '🂾', baseSize: 30 },
];

const playerNames = ['X-MAN', 'AAA', 'ZMJ', 'FANAR', '6', 'PANIC', 'GAGA', 'JEEZ'];

const nameColors = [
  'text-green-400', 'text-yellow-400', 'text-cyan-400', 'text-orange-400',
  'text-pink-400', 'text-violet-400', 'text-red-400', 'text-emerald-400',
];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

interface SwimItem {
  content: React.ReactNode;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  key: string;
}

function generateItems() {
  const items: SwimItem[] = [];

  for (const creature of seaCreatures) {
    const count = creature.baseSize >= 44 ? Math.ceil(randomBetween(1, 2)) : Math.ceil(randomBetween(2, 3));
    for (let j = 0; j < count; j++) {
      const size = creature.baseSize * randomBetween(0.7, 1.4);
      items.push({
        content: <span style={{ fontSize: size }}>{creature.emoji}</span>,
        y: randomBetween(5, 85),
        size: 0,
        duration: randomBetween(12, 30),
        delay: randomBetween(0, 20),
        opacity: randomBetween(0.25, 0.6),
        key: `sea-${creature.emoji}-${j}`,
      });
    }
  }

  for (const card of playingCards) {
    const count = Math.ceil(randomBetween(1, 2));
    for (let j = 0; j < count; j++) {
      const size = card.baseSize * randomBetween(0.8, 1.3);
      items.push({
        content: <span style={{ fontSize: size }}>{card.emoji}</span>,
        y: randomBetween(5, 90),
        size: 0,
        duration: randomBetween(14, 28),
        delay: randomBetween(0, 22),
        opacity: randomBetween(0.2, 0.45),
        key: `card-${card.emoji}-${j}`,
      });
    }
  }

  for (let i = 0; i < playerNames.length; i++) {
    const name = playerNames[i];
    const colorClass = nameColors[i % nameColors.length];
    items.push({
      content: (
        <span className={`${colorClass} font-bold whitespace-nowrap select-none`} style={{ fontSize: randomBetween(14, 24) }}>
          {name}
        </span>
      ),
      y: randomBetween(5, 90),
      size: 0,
      duration: randomBetween(16, 32),
      delay: randomBetween(0, 25),
      opacity: randomBetween(0.25, 0.5),
      key: `name-${name}`,
    });
  }

  return items;
}

export function SeaCreatures() {
  const items = useMemo(generateItems, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {items.map((c) => (
        <div
          key={c.key}
          className="absolute"
          style={{
            top: `${c.y}%`,
            left: -80,
            opacity: c.opacity,
            animation: `swim-right ${c.duration}s linear ${c.delay}s infinite`,
          }}
        >
          {c.content}
        </div>
      ))}
    </div>
  );
}
