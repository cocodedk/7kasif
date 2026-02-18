import type { PlayerView, Card as CardType, Suit } from '@hafte-kasif/shared';
import { Card } from './Card.js';
import { SuitPicker } from './SuitPicker.js';
import { CardGiver } from './CardGiver.js';
import { ChainChoicePicker } from './ChainChoicePicker.js';
import { CardPicker } from './CardPicker.js';
import { formatValue, SUIT_SYMBOLS } from '../utils/cardFormat.js';

interface GameModalsProps {
  game: PlayerView;
  // Card picker
  showCardPicker: boolean;
  setShowCardPicker: (v: boolean) => void;
  playableCards: Set<number>;
  isMyTurn: boolean;
  setSelectedIndex: (i: number) => void;
  // Suit picker
  showSuitPicker: boolean;
  setShowSuitPicker: (v: boolean) => void;
  handleSuitPicked: (suit: Suit) => void;
  pendingCard: CardType | null;
  setPendingCardNull: () => void;
  // Card giver
  showCardGiver: boolean;
  setShowCardGiver: (v: boolean) => void;
  handleCardGiven: (card: CardType) => void;
  // Chain choice
  showChainChoice: boolean;
  setShowChainChoice: (v: boolean) => void;
  handleChainChoice: (choice: 'redirect' | 'add') => void;
  // Overlays
  playedCard: { card: CardType; playerName: string } | null;
  revealCard: CardType | null;
  // Jack declare
  isJackDeclare?: boolean;
  // Fullscreen
  fullscreenBtn?: React.ReactNode;
}

export function GameModals({
  game,
  showCardPicker, setShowCardPicker, playableCards, isMyTurn, setSelectedIndex,
  showSuitPicker, setShowSuitPicker, handleSuitPicked, pendingCard, setPendingCardNull,
  showCardGiver, setShowCardGiver, handleCardGiven,
  showChainChoice, setShowChainChoice, handleChainChoice,
  playedCard, revealCard,
  isJackDeclare,
  fullscreenBtn,
}: GameModalsProps) {
  return (
    <>
      {fullscreenBtn}

      {showCardPicker && (
        <CardPicker
          cards={game.myHand}
          playableCards={playableCards}
          isMyTurn={isMyTurn}
          onSelect={setSelectedIndex}
          onClose={() => setShowCardPicker(false)}
        />
      )}
      {showSuitPicker && (
        <SuitPicker
          onPick={handleSuitPicked}
          onCancel={isJackDeclare ? undefined : () => { setShowSuitPicker(false); setPendingCardNull(); }}
        />
      )}
      {showCardGiver && pendingCard && (
        <CardGiver
          cards={game.myHand}
          playedCard={pendingCard}
          onPick={handleCardGiven}
          onCancel={() => { setShowCardGiver(false); setPendingCardNull(); }}
        />
      )}
      {showChainChoice && game.pendingEffect?.type === 'seven-chain' && (
        <ChainChoicePicker
          penalty={game.pendingEffect.penalty}
          onChoice={handleChainChoice}
          onCancel={() => { setShowChainChoice(false); setPendingCardNull(); }}
        />
      )}

      {/* Played card reveal */}
      {playedCard && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-none">
          <div className="animate-play-reveal flex flex-col items-center gap-3">
            <div className="text-white font-bold text-lg drop-shadow-lg">
              {playedCard.playerName} played
            </div>
            <div className={`w-28 h-40 bg-white rounded-xl border-4 shadow-2xl flex flex-col justify-between p-2 ${
              playedCard.playerName === 'You' ? 'border-green-400 shadow-green-400/30' : 'border-blue-400 shadow-blue-400/30'
            }`}>
              <div className={`flex flex-col items-start leading-none ${playedCard.card.suit === 'hearts' || playedCard.card.suit === 'diamonds' ? 'text-red-500' : 'text-black'}`}>
                <span className="font-bold text-lg">{formatValue(playedCard.card.value)}</span>
                <span className="text-base">{SUIT_SYMBOLS[playedCard.card.suit]}</span>
              </div>
              <div className={`flex flex-col items-end leading-none rotate-180 ${playedCard.card.suit === 'hearts' || playedCard.card.suit === 'diamonds' ? 'text-red-500' : 'text-black'}`}>
                <span className="font-bold text-lg">{formatValue(playedCard.card.value)}</span>
                <span className="text-base">{SUIT_SYMBOLS[playedCard.card.suit]}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawn card reveal */}
      {revealCard && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-none">
          <div className="animate-draw-reveal">
            <div className="w-28 h-40 bg-white rounded-xl border-4 border-yellow-400 shadow-2xl shadow-yellow-400/30 flex flex-col justify-between p-2">
              <div className={`flex flex-col items-start leading-none ${revealCard.suit === 'hearts' || revealCard.suit === 'diamonds' ? 'text-red-500' : 'text-black'}`}>
                <span className="font-bold text-lg">{formatValue(revealCard.value)}</span>
                <span className="text-base">{SUIT_SYMBOLS[revealCard.suit]}</span>
              </div>
              <div className={`flex flex-col items-end leading-none rotate-180 ${revealCard.suit === 'hearts' || revealCard.suit === 'diamonds' ? 'text-red-500' : 'text-black'}`}>
                <span className="font-bold text-lg">{formatValue(revealCard.value)}</span>
                <span className="text-base">{SUIT_SYMBOLS[revealCard.suit]}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
