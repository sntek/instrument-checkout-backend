import { Instrument, Reservation, Team } from '@/types';

export const MOCK_TEAMS: Team[] = [
  { slug: 'demo-team', name: 'Demo Team', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

export const MOCK_INSTRUMENTS: Instrument[] = [];

export const MOCK_RESERVATIONS: Reservation[] = [];
