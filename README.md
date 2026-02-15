# 7kasif

A multiplayer card game (Hafte Kasif / Seven Explorers) built with React, Node.js, and WebSockets.

## Tech Stack

- **Client:** React, Vite, Tailwind CSS
- **Server:** Node.js, WebSocket (ws)
- **Database:** PostgreSQL
- **Deploy:** Docker, Nginx, GitHub Actions CI/CD

## Development

```bash
# Start dev environment (Docker)
docker compose -f docker-compose.dev.yml up --build

# Or run client in DevPreview mode (no server needed)
VITE_DEV_PREVIEW=true npm run dev --workspace=packages/client
```

## Project Structure

```
packages/
  shared/   # Game types and shared logic
  server/   # WebSocket game server
  client/   # React frontend
deploy/     # Deployment configs and scripts
```

## Deployment

See `deploy/setup-server.sh` for VPS provisioning. Pushes to `main` auto-deploy via GitHub Actions.

## Score Tracking

Use [D7](https://cocodedk.github.io/D7/) to track game scores.

## Game Creators

Hafte Kasif was created by:

Khosrow Davani (X-Man), Masoud Ghaemi Moghadam (ZMJ), Mehdi Morali (Fanar), Hamid, Saeed, Mohsen Zaboli (AAA), Babak Bandpey (Panik), Amir Hussein Khodabash (6), and Hussein Ferdowsipour (GaGa).

Online version implemented by Babak Bandpey / cocode.dk, 2026.

## License

All rights reserved. See [LICENSE](LICENSE).
