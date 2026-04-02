export interface Server {
  id: string;
  name: string;
  ip: string;
  players: number;
  maxPlayers: number;
  ping: number;
  map: string;
  gamemode: string;
  status: 'online' | 'offline' | 'full';
  version: string;
  image?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  date: string;
  summary: string;
  image: string;
  category: 'Update' | 'Event' | 'Maintenance';
}
