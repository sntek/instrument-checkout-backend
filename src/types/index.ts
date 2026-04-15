export interface Source {
  name: string
  channel: string
}

export interface Instrument {
  name: string
  os?: string
  ip?: string
  sources?: Source[]
  team_slug?: string
}

export interface Team {
  slug: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Reservation {
  id: string
  instrumentName: string
  slot: string
  date: string
  reserverName: string
  reserverUserId: string
  createdAt: string
  updatedAt: string
}

export interface CreateReservationRequest {
  instrumentName: string
  slot: string
  date: string
  reserverName: string
  reserverUserId: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface ReservationInfo {
  reserverName: string
  reserverUserId: string
  id: string
}

export interface ReservationsByInstrument {
  [instrumentName: string]: {
    [slotKey: string]: ReservationInfo
  }
}
