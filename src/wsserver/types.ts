import { WebSocket } from "ws";

export interface Player {
  name: string;
  password: string;
  index: string;
  wins: number;
  ws?: WebSocket;
}

export type Players = Record<string, Player>;

export interface Room {
  roomId: string;
  roomUsers: Player[];
}

export interface Ship {
  position: { x: number; y: number };
  direction: boolean;
  length: number;
  type: "small" | "medium" | "large" | "huge";
  hits?: number;
}

export type Ships = Record<string, Ship[]>;
export type Boards = Record<string, number[][]>;

export interface Game {
  idGame: string;
  players: Players;
  ships: Ships;
  currentPlayer: string;
  board: Boards;
  finished: boolean;
}

export interface State {
  players: Players;
  rooms: Record<string, Room>;
  games: Record<string, Game>;
  winners: Record<string, number>;
}