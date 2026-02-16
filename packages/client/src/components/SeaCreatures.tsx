import { useMemo } from 'react';

const creatureTemplates = [
  {
    name: 'shark',
    svg: (
      <svg viewBox="0 0 140 70" fill="none">
        {/* Body - single clean shape */}
        <path d="M18,35 C18,18 40,12 70,14 C90,14 100,20 108,28 L108,28 C100,20 90,14 70,14" fill="#64748b"/>
        <path d="M18,35 C18,52 40,54 70,52 C90,50 100,46 108,40 L108,40 C100,46 90,50 70,52" fill="#64748b"/>
        <path d="M18,35 C18,16 45,10 75,14 C100,18 108,28 108,34 C108,40 100,50 75,52 C45,56 18,52 18,35 Z" fill="#64748b"/>
        {/* Belly */}
        <path d="M30,38 C35,48 55,52 80,48 C95,45 105,40 108,37 L108,37 C105,42 90,50 70,50 C45,50 30,44 30,38 Z" fill="#94a3b8"/>
        {/* Tail - forked */}
        <polygon points="2,14 18,28 14,35" fill="#64748b"/>
        <polygon points="2,56 18,42 14,35" fill="#64748b"/>
        <polygon points="2,14 6,24 14,35" fill="#475569"/>
        {/* Dorsal fin */}
        <polygon points="50,14 60,-2 68,12" fill="#64748b"/>
        <polygon points="50,14 60,-2 58,14" fill="#475569"/>
        {/* Pectoral fin */}
        <polygon points="65,46 56,60 76,48" fill="#64748b"/>
        {/* Upper jaw */}
        <path d="M108,30 Q118,26 128,28 L132,31" fill="#64748b"/>
        {/* Lower jaw - wide open */}
        <path d="M108,38 Q118,46 128,44 L132,39" fill="#94a3b8"/>
        {/* Mouth inside */}
        <path d="M108,30 L132,31 L132,39 L108,38 Z" fill="#7f1d1d"/>
        {/* Upper teeth */}
        <polygon points="112,30 114,35 110,35" fill="#fff"/>
        <polygon points="118,29 120,34 116,34" fill="#fff"/>
        <polygon points="124,28.5 126,33 122,33" fill="#fff"/>
        <polygon points="129,29 131,33 127,33" fill="#fff"/>
        {/* Lower teeth */}
        <polygon points="112,38 114,33 110,33" fill="#fff"/>
        <polygon points="118,39 120,34 116,34" fill="#fff"/>
        <polygon points="124,40 126,35 122,35" fill="#fff"/>
        <polygon points="129,39 131,35 127,35" fill="#fff"/>
        {/* Eye */}
        <circle cx="96" cy="24" r="5" fill="#fff"/>
        <circle cx="98" cy="23" r="3" fill="#0f172a"/>
        <circle cx="99.5" cy="22" r="1.2" fill="#fff"/>
        {/* Angry brow */}
        <path d="M90,20 Q94,17 100,18" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        {/* Gills */}
        <line x1="82" y1="22" x2="82" y2="34" stroke="#475569" strokeWidth="1.2" opacity="0.4"/>
        <line x1="78" y1="23" x2="78" y2="33" stroke="#475569" strokeWidth="1.2" opacity="0.4"/>
        <line x1="74" y1="24" x2="74" y2="32" stroke="#475569" strokeWidth="1.2" opacity="0.4"/>
      </svg>
    ),
    baseSize: 130,
  },
  {
    name: 'fish-green',
    svg: (
      <svg viewBox="0 0 48 32" fill="none">
        <polygon points="2,16 10,8 10,24" fill="#16a34a"/>
        <ellipse cx="24" cy="16" rx="16" ry="10" fill="#22c55e"/>
        <circle cx="32" cy="13" r="3" fill="#fff"/>
        <circle cx="33" cy="12.5" r="1.5" fill="#1a1a2e"/>
        <polygon points="38,14 40,16 38,16" fill="#fff"/>
        <polygon points="36,14.5 38,17 36,17" fill="#fff"/>
        <polygon points="38,18 40,16 38,16" fill="#fff"/>
        <polygon points="36,17.5 38,15 36,15" fill="#fff"/>
      </svg>
    ),
    baseSize: 40,
  },
  {
    name: 'octopus',
    svg: (
      <svg viewBox="0 0 40 44" fill="none">
        <ellipse cx="20" cy="14" rx="14" ry="12" fill="#a855f7"/>
        <circle cx="14" cy="11" r="3" fill="#fff"/>
        <circle cx="14.5" cy="10.5" r="1.5" fill="#1a1a2e"/>
        <circle cx="26" cy="11" r="3" fill="#fff"/>
        <circle cx="26.5" cy="10.5" r="1.5" fill="#1a1a2e"/>
        <path d="M8,24 Q6,34 4,38" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M13,26 Q11,36 10,40" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M20,27 Q20,37 20,42" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M27,26 Q29,36 30,40" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M32,24 Q34,34 36,38" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" fill="none"/>
      </svg>
    ),
    baseSize: 32,
  },
  {
    name: 'fish-gold',
    svg: (
      <svg viewBox="0 0 36 24" fill="none">
        <polygon points="2,12 8,6 8,18" fill="#f59e0b"/>
        <ellipse cx="18" cy="12" rx="12" ry="8" fill="#fbbf24"/>
        <circle cx="24" cy="10" r="2.5" fill="#fff"/>
        <circle cx="25" cy="9.5" r="1.2" fill="#1a1a2e"/>
      </svg>
    ),
    baseSize: 28,
  },
  {
    name: 'crab',
    svg: (
      <svg viewBox="0 0 44 32" fill="none">
        <ellipse cx="22" cy="18" rx="12" ry="8" fill="#ef4444"/>
        <circle cx="17" cy="15" r="2.5" fill="#fff"/>
        <circle cx="17.5" cy="14.5" r="1.2" fill="#1a1a2e"/>
        <circle cx="27" cy="15" r="2.5" fill="#fff"/>
        <circle cx="27.5" cy="14.5" r="1.2" fill="#1a1a2e"/>
        <path d="M10,18 Q4,12 2,8" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <circle cx="2" cy="7" r="2" fill="#ef4444"/>
        <path d="M34,18 Q40,12 42,8" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <circle cx="42" cy="7" r="2" fill="#ef4444"/>
        <path d="M12,24 Q10,28 8,30" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M16,25 Q15,29 14,31" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M28,25 Q29,29 30,31" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M32,24 Q34,28 36,30" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
    baseSize: 30,
  },
  {
    name: 'fish-cyan',
    svg: (
      <svg viewBox="0 0 32 20" fill="none">
        <polygon points="2,10 7,5 7,15" fill="#06b6d4"/>
        <ellipse cx="16" cy="10" rx="10" ry="6" fill="#22d3ee"/>
        <circle cx="21" cy="8" r="2" fill="#fff"/>
        <circle cx="22" cy="7.5" r="1" fill="#1a1a2e"/>
      </svg>
    ),
    baseSize: 22,
  },
  {
    name: 'jellyfish',
    svg: (
      <svg viewBox="0 0 32 44" fill="none">
        <ellipse cx="16" cy="12" rx="12" ry="10" fill="#ec489980"/>
        <ellipse cx="16" cy="12" rx="8" ry="6" fill="#f9a8d480"/>
        <path d="M8,20 Q6,30 8,38" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7"/>
        <path d="M13,22 Q12,32 14,42" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7"/>
        <path d="M19,22 Q20,32 18,42" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7"/>
        <path d="M24,20 Q26,30 24,38" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7"/>
      </svg>
    ),
    baseSize: 26,
  },
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

  for (const tmpl of creatureTemplates) {
    const count = tmpl.name === 'shark' ? Math.ceil(randomBetween(1, 2)) : Math.ceil(randomBetween(2, 3));
    for (let j = 0; j < count; j++) {
      items.push({
        content: tmpl.svg,
        y: randomBetween(5, 85),
        size: tmpl.baseSize * randomBetween(0.7, 1.4),
        duration: randomBetween(12, 30),
        delay: randomBetween(0, 20),
        opacity: randomBetween(0.2, 0.55),
        key: `${tmpl.name}-${j}`,
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
            ...(c.size > 0 ? { width: c.size, height: c.size } : {}),
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
