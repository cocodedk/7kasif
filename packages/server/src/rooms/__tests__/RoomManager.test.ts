import { describe, it, expect } from 'vitest';
import { RoomManager } from '../RoomManager.js';

describe('RoomManager.getAllRooms', () => {
  it('returns empty array when no rooms exist', () => {
    const rm = new RoomManager();
    expect(rm.getAllRooms()).toEqual([]);
  });

  it('returns all created rooms', () => {
    const rm = new RoomManager();
    const room1 = rm.createRoom('host1', 'Alice', 'standard');
    const room2 = rm.createRoom('host2', 'Bob', 'standard');

    const all = rm.getAllRooms();
    expect(all).toHaveLength(2);

    const codes = all.map(r => r.code);
    expect(codes).toContain(room1.code);
    expect(codes).toContain(room2.code);
  });

  it('does not include removed rooms', () => {
    const rm = new RoomManager();
    const room1 = rm.createRoom('host1', 'Alice', 'standard');
    const room2 = rm.createRoom('host2', 'Bob', 'standard');

    rm.removeRoom(room1.code);

    const all = rm.getAllRooms();
    expect(all).toHaveLength(1);
    expect(all[0].code).toBe(room2.code);
  });
});
