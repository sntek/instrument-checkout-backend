export interface Instrument {
  name: string
  os?: string
  group?: string
  ip?: string
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

export interface ReservationsByInstrument {
  [instrumentName: string]: {
    [slotKey: string]: {
      reserverName: string
      reserverUserId: string
      id: string
    }
  }
}

export interface DatabaseEnv {
  POSTGRES_URL: string
  POSTGRES_PRISMA_URL: string
  POSTGRES_URL_NON_POOLING: string
  POSTGRES_USER: string
  POSTGRES_HOST: string
  POSTGRES_PASSWORD: string
  POSTGRES_DATABASE: string
}
