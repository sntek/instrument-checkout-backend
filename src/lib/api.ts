import { ApiResponse, CreateReservationRequest, Instrument, Reservation, ReservationsByInstrument, Team } from '../types'

const API_BASE_URL = ''

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMessage = data.error || `HTTP error! status: ${response.status}`
      throw new Error(errorMessage)
    }

    return data
  }

  // Teams
  async getTeams(): Promise<Team[]> {
    const response = await this.request<Team[]>('/api/teams')
    if (!response.success) throw new Error(response.error || 'Failed to fetch teams')
    return response.data || []
  }

  async createTeam(name: string, slug: string, adminCredentials: string): Promise<Team> {
    const response = await this.request<Team>('/api/teams', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${btoa(adminCredentials)}` },
      body: JSON.stringify({ name, slug }),
    })
    if (!response.success) throw new Error(response.error || 'Failed to create team')
    return response.data!
  }

  async updateTeam(oldSlug: string, name: string, slug: string, adminCredentials: string): Promise<Team> {
    const response = await this.request<Team>('/api/teams', {
      method: 'PATCH',
      headers: { 'Authorization': `Basic ${btoa(adminCredentials)}` },
      body: JSON.stringify({ oldSlug, name, slug }),
    })
    if (!response.success) throw new Error(response.error || 'Failed to update team')
    return response.data!
  }

  async deleteTeam(slug: string, adminCredentials: string): Promise<void> {
    const response = await this.request('/api/teams', {
      method: 'DELETE',
      headers: { 'Authorization': `Basic ${btoa(adminCredentials)}` },
      body: JSON.stringify({ slug }),
    })
    if (!response.success) throw new Error(response.error || 'Failed to delete team')
  }

  // Instruments
  async getInstruments(teamSlug?: string): Promise<Instrument[]> {
    const endpoint = teamSlug
      ? `/api/instruments?team=${encodeURIComponent(teamSlug)}`
      : '/api/instruments'
    const response = await this.request<Instrument[]>(endpoint)
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch instruments')
    }

    const instruments = (response.data || []).map(instrument => ({
      name: instrument.name,
      os: instrument.os,
      group: instrument.group || instrument.group_name,
      ip: instrument.ip,
      team_slug: instrument.team_slug
    }))

    return instruments
  }

  // Reservations
  async getReservations(teamSlug?: string, instrumentName?: string): Promise<ReservationsByInstrument> {
    const params = new URLSearchParams()
    if (teamSlug) params.set('team', teamSlug)
    if (instrumentName) params.set('instrumentName', instrumentName)
    const qs = params.toString()
    const endpoint = qs ? `/api/reservations?${qs}` : '/api/reservations'

    const response = await this.request<ReservationsByInstrument>(endpoint)
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch reservations')
    }

    const cleanedData: ReservationsByInstrument = {}
    const rawData = response.data || {}

    for (const [instrument, slots] of Object.entries(rawData)) {
      if (instrument === 'undefined') continue

      cleanedData[instrument] = {}
      for (const [slotKey, reservationInfo] of Object.entries(slots)) {
        cleanedData[instrument][slotKey] = {
          reserverName: reservationInfo.reserverName || 'Unknown',
          reserverUserId: reservationInfo.reserverUserId || 'unknown',
          id: reservationInfo.id
        }
      }
    }

    return cleanedData
  }

  async createReservation(reservation: CreateReservationRequest): Promise<Reservation> {
    const response = await this.request<Reservation>('/api/reservations', {
      method: 'POST',
      body: JSON.stringify(reservation),
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to create reservation')
    }
    return response.data!
  }

  async deleteReservation(id: string, reserverUserId: string): Promise<void> {
    const response = await this.request(`/api/reservations/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reserverUserId }),
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete reservation')
    }
  }

  async updateInstrument(oldName: string, instrument: Partial<Instrument>): Promise<Instrument> {
    const response = await this.request<Instrument>('/api/instruments', {
      method: 'PATCH',
      body: JSON.stringify({ oldName, ...instrument }),
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to update instrument')
    }
    return response.data!
  }

  async createInstrument(instrument: Instrument): Promise<Instrument> {
    const response = await this.request<Instrument>('/api/instruments', {
      method: 'POST',
      body: JSON.stringify(instrument),
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to create instrument')
    }
    return response.data!
  }

  async deleteInstrument(name: string): Promise<void> {
    const response = await this.request(`/api/instruments?name=${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete instrument')
    }
  }
}

export const apiClient = new ApiClient()
