import { BotRunner } from './bot-runner.js';

const roomCode = process.argv[2];

const runner = new BotRunner();

if (roomCode) {
  // Join an existing room with 3 bots (human is the 4th player)
  console.log(`Joining room ${roomCode} with 3 bots...`);
  await runner.start(roomCode, 3);
} else {
  // Autonomous mode: 4 bots create and play a game
  console.log('No room code — starting autonomous 4-bot game');
  await runner.startAutonomous();
}

process.on('SIGINT', () => {
  runner.stop();
  process.exit(0);
});
