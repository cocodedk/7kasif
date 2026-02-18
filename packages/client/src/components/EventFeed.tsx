import type { FeedEntry } from '../hooks/useFeed.js';

interface EventFeedProps {
  feed: FeedEntry[];
  compact?: boolean;
}

export function EventFeed({ feed, compact }: EventFeedProps) {
  if (feed.length === 0) return null;
  return (
    <div className={`flex flex-col ${compact ? 'w-28 p-2 gap-1' : 'w-44 p-3 gap-1.5'} border-l border-gray-700 overflow-y-auto`}>
      <div className={`${compact ? 'text-[10px] mb-0.5' : 'text-xs mb-1'} text-gray-500 font-semibold uppercase tracking-wide`}>Activity</div>
      {feed.map(entry => (
        <div key={entry.id} className={`flex items-start ${compact ? 'gap-1.5' : 'gap-2'}`}>
          <span className="text-[10px] text-white font-mono shrink-0">{entry.seq}</span>
          <span className={`${compact ? 'text-[11px]' : 'text-xs'} ${entry.color} leading-tight`}>{entry.text}</span>
        </div>
      ))}
    </div>
  );
}
