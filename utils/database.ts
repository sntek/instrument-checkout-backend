import { sql } from '@vercel/postgres'
import { DatabaseEnv } from '../types'

export async function executeQuery(query: string, params: any[] = []) {
  try {
    // Use sql template literal for queries
    if (params.length === 0) {
      return await sql`${query}`
    } else {
      // For parameterized queries, we need to use template literals
      // This is a simplified approach - replace $1, $2, etc. with actual values
      let processedQuery = query
      params.forEach((param, index) => {
        const placeholder = `$${index + 1}`
        const value = param === null ? 'NULL' : `'${param}'`
        processedQuery = processedQuery.replace(placeholder, value)
      })
      return await sql`${processedQuery}`
    }
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

export async function executeTransaction(queries: Array<{ query: string; params: any[] }>) {
  try {
    const results = []
    for (const { query, params } of queries) {
      const result = await executeQuery(query, params)
      results.push(result)
    }
    return results
  } catch (error) {
    console.error('Database transaction error:', error)
    throw error
  }
}

export async function initializeDatabase() {
  try {
    // Create reservations table
    await sql`
      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        instrumentName TEXT NOT NULL,
        slot TEXT NOT NULL,
        date TEXT NOT NULL,
        reserverName TEXT NOT NULL,
        reserverUserId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `

    // Create indexes for efficient queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_reservations_instrument_date_slot 
      ON reservations(instrumentName, date, slot)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_reservations_reserver 
      ON reservations(reserverName)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_reservations_reserver_user_id 
      ON reservations(reserverUserId)
    `

    // Create instruments table
    await sql`
      CREATE TABLE IF NOT EXISTS instruments (
        name TEXT PRIMARY KEY,
        os TEXT,
        group_name TEXT,
        ip TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `

    // Insert default instruments
    const defaultInstruments = [
      { name: 'MSO46B-Q000024', os: 'Linux', group_name: 'G8', ip: '10.233.67.6' },
      { name: 'MSO56-Q100057', os: 'Linux', group_name: 'G8', ip: '10.233.66.244' },
      { name: 'MSO58B-PQ010001', os: 'Windows', group_name: 'G8', ip: '10.233.65.193' },
      { name: 'MSO54B-PQ010002', os: 'Linux', group_name: 'G8', ip: '10.233.65.195' },
      { name: 'DPO71A-KR20007', os: null, group_name: 'G8', ip: null },
      { name: 'MSO68B-B030015', os: 'Windows', group_name: 'G8', ip: '10.233.67.178' },
      { name: 'MSO58B-C067209', os: null, group_name: 'G8', ip: null },
      { name: 'MSO44B-SGVJ010550', os: 'Linux', group_name: null, ip: '10.233.67.186' }
    ]

    for (const instrument of defaultInstruments) {
      const now = new Date().toISOString()
      
      await sql`
        INSERT INTO instruments (name, os, group_name, ip, createdAt, updatedAt) 
        VALUES (${instrument.name}, ${instrument.os}, ${instrument.group_name}, ${instrument.ip}, ${now}, ${now})
        ON CONFLICT (name) DO NOTHING
      `
    }

    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}
