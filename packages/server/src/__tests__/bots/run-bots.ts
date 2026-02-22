import { BotRunner } from './bot-runner.js';

const args = process.argv.slice(2);
const roundsFlag = args.find(a => a.startsWith('--rounds='));
const parsedRounds = roundsFlag ? parseInt(roundsFlag.split('=')[1], 10) : 1;
const rounds = isNaN(parsedRounds) || parsedRounds < 1 ? 1 : parsedRounds;
const cardsFlag = args.find(a => a.startsWith('--cards='));
const parsedCards = cardsFlag ? parseInt(cardsFlag.split('=')[1], 10) : 2;
const cardsPerPlayer = isNaN(parsedCards) || parsedCards < 1 ? 2 : parsedCards;
const roomCode = args.find(a => !a.startsWith('--'));

const runner = new BotRunner();

process.on('SIGINT', () => {
  runner.stop();
  process.exit(0);
});

if (roomCode) {
  // Join an existing room with 3 bots (human is the 4th player)
  console.log(`Joining room ${roomCode} with 3 bots...`);
  await runner.start(roomCode, 3);
} else {
  // Autonomous mode: 4 bots create and play a game
  console.log(`No room code — starting autonomous 4-bot game (${rounds} rounds, ${cardsPerPlayer} cards)`);
  await runner.startAutonomous(rounds, cardsPerPlayer);
}
