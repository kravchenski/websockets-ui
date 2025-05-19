import { WebSocket } from "ws";

export interface Player {
  name: string;
  password: string;
  index: string;
  wins: number;
  ws: WebSocket | null;
  attacks: string[];
}

export interface Room {
  roomId: string;
  roomUsers: Array<{
    ws: any; name: string; index: string 
}>;
}

export interface Game {
  [key: string]: any;
}

export interface State {
  players: Record<string, Player>;
  rooms: Record<string, Room>;
  games: Record<string, Game>;
  winners: Record<string, number>;
}


export const state: State = {
  players: {},
  rooms: {},
  games: {},
  winners: {},
};

export function addPlayer(name: string, password: string, ws: WebSocket): Player {
  if (state.players[name]) {
    throw new Error(`Player with name "${name}" already exists`);
  }

  const index = Math.random().toString(36).substring(7);

  const newPlayer: Player = {
    name,
    password,
    index,
    wins: 0,
    ws,
    attacks: [],
  };

  state.players[name] = newPlayer;

  return newPlayer;
}