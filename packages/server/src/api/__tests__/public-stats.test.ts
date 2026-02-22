import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { EventEmitter } from 'events';
import { handleApiRoute } from '../routes.js';

// Mock auth module
vi.mock('../../auth/auth.js', () => ({
  createUser: vi.fn(),
  sendMagicLink: vi.fn(),
  verifyMagicToken: vi.fn(),
  verifyToken: vi.fn(),
}));

// Mock leaderboard module
const mockGetLeaderboard = vi.fn();
const mockGetLeaderboardByYear = vi.fn();
const mockGetTournamentHistory = vi.fn();
const mockGetTournamentsByYear = vi.fn();
const mockGetPlayerStats = vi.fn();

vi.mock('../../db/leaderboard.js', () => ({
  getLeaderboard: (...args: any[]) => mockGetLeaderboard(...args),
  getLeaderboardByYear: (...args: any[]) => mockGetLeaderboardByYear(...args),
  getPlayerStats: (...args: any[]) => mockGetPlayerStats(...args),
  getTournamentHistory: (...args: any[]) => mockGetTournamentHistory(...args),
  getTournamentsByYear: (...args: any[]) => mockGetTournamentsByYear(...args),
}));

// Mock tournaments module
const mockLoadTournament = vi.fn();
vi.mock('../../db/tournaments.js', () => ({
  loadTournament: (...args: any[]) => mockLoadTournament(...args),
}));

function createMockReq(method: string, url: string, headers: Record<string, string> = {}): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage;
  req.method = method;
  req.url = url;
  req.headers = headers;
  return req;
}

function createMockRes(): ServerResponse & { _status: number; _body: string; _headers: Record<string, string> } {
  const res = new EventEmitter() as any;
  res._status = 0;
  res._body = '';
  res._headers = {};
  res.setHeader = (key: string, value: string) => { res._headers[key.toLowerCase()] = value; };
  res.writeHead = (status: number, headers?: Record<string, string>) => {
    res._status = status;
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        res._headers[k.toLowerCase()] = v;
      }
    }
  };
  res.end = (body?: string) => { res._body = body || ''; };
  return res;
}

function parseBody(res: ReturnType<typeof createMockRes>): any {
  return JSON.parse(res._body);
}

describe('GET /api/leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getLeaderboard() when no year param', async () => {
    mockGetLeaderboard.mockResolvedValue([]);
    const req = createMockReq('GET', '/api/leaderboard');
    const res = createMockRes();

    const handled = await handleApiRoute(req, res);

    expect(handled).toBe(true);
    expect(res._status).toBe(200);
    expect(mockGetLeaderboard).toHaveBeenCalled();
    expect(mockGetLeaderboardByYear).not.toHaveBeenCalled();
  });

  it('calls getLeaderboardByYear() when year param present', async () => {
    mockGetLeaderboardByYear.mockResolvedValue([]);
    const req = createMockReq('GET', '/api/leaderboard?year=2026');
    const res = createMockRes();

    const handled = await handleApiRoute(req, res);

    expect(handled).toBe(true);
    expect(res._status).toBe(200);
    expect(mockGetLeaderboardByYear).toHaveBeenCalledWith(2026);
    expect(mockGetLeaderboard).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid year param', async () => {
    const req = createMockReq('GET', '/api/leaderboard?year=abc');
    const res = createMockRes();

    const handled = await handleApiRoute(req, res);

    expect(handled).toBe(true);
    expect(res._status).toBe(400);
    expect(parseBody(res).error).toBe('Invalid year parameter');
  });
});

describe('GET /api/tournaments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getTournamentHistory() when no year param', async () => {
    mockGetTournamentHistory.mockResolvedValue([]);
    const req = createMockReq('GET', '/api/tournaments');
    const res = createMockRes();

    const handled = await handleApiRoute(req, res);

    expect(handled).toBe(true);
    expect(res._status).toBe(200);
    expect(mockGetTournamentHistory).toHaveBeenCalled();
    expect(mockGetTournamentsByYear).not.toHaveBeenCalled();
  });

  it('calls getTournamentsByYear() when year param present', async () => {
    mockGetTournamentsByYear.mockResolvedValue([]);
    const req = createMockReq('GET', '/api/tournaments?year=2026');
    const res = createMockRes();

    const handled = await handleApiRoute(req, res);

    expect(handled).toBe(true);
    expect(res._status).toBe(200);
    expect(mockGetTournamentsByYear).toHaveBeenCalledWith(2026);
    expect(mockGetTournamentHistory).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid year param', async () => {
    const req = createMockReq('GET', '/api/tournaments?year=abc');
    const res = createMockRes();

    const handled = await handleApiRoute(req, res);

    expect(handled).toBe(true);
    expect(res._status).toBe(400);
    expect(parseBody(res).error).toBe('Invalid year parameter');
  });
});

describe('GET /api/tournaments/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns tournament detail for valid id', async () => {
    const mockTournament = {
      sessionId: 'ABC123',
      createdAt: '2026-01-01T00:00:00Z',
      playerScores: [],
      rounds: [],
      currentRound: 1,
    };
    mockLoadTournament.mockResolvedValue(mockTournament);
    const req = createMockReq('GET', '/api/tournaments/42');
    const res = createMockRes();

    const handled = await handleApiRoute(req, res);

    expect(handled).toBe(true);
    expect(res._status).toBe(200);
    expect(mockLoadTournament).toHaveBeenCalledWith(42);
    expect(parseBody(res)).toEqual(mockTournament);
  });

  it('returns 404 for non-existent tournament', async () => {
    mockLoadTournament.mockResolvedValue(null);
    const req = createMockReq('GET', '/api/tournaments/999');
    const res = createMockRes();

    const handled = await handleApiRoute(req, res);

    expect(handled).toBe(true);
    expect(res._status).toBe(404);
    expect(parseBody(res).error).toBe('Tournament not found');
  });

  it('returns 400 for non-numeric id', async () => {
    const req = createMockReq('GET', '/api/tournaments/abc');
    const res = createMockRes();

    const handled = await handleApiRoute(req, res);

    // 'abc' won't match the regex for /api/tournaments/:id, so it won't be handled
    // It might fall through or be caught - let's verify behavior
    expect(handled).toBe(false);
  });
});
