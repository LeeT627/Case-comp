import { format, parseISO } from 'date-fns'
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'

const IST_TIMEZONE = 'Asia/Kolkata'

// Get current date in IST
export const getTodayIST = () => {
  const now = new Date()
  const istDate = utcToZonedTime(now, IST_TIMEZONE)
  return format(istDate, 'yyyy-MM-dd')
}

// Convert UTC to IST
export const toIST = (date: Date | string) => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return utcToZonedTime(d, IST_TIMEZONE)
}

// Convert IST to UTC
export const fromIST = (date: Date | string) => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return zonedTimeToUtc(d, IST_TIMEZONE)
}

// Get start of day in IST (as UTC timestamp)
export const getISTDayStart = (date: Date | string) => {
  const d = typeof date === 'string' ? parseISO(date) : date
  const istDate = utcToZonedTime(d, IST_TIMEZONE)
  istDate.setHours(0, 0, 0, 0)
  return zonedTimeToUtc(istDate, IST_TIMEZONE)
}

// Get end of day in IST (as UTC timestamp)
export const getISTDayEnd = (date: Date | string) => {
  const d = typeof date === 'string' ? parseISO(date) : date
  const istDate = utcToZonedTime(d, IST_TIMEZONE)
  istDate.setHours(23, 59, 59, 999)
  return zonedTimeToUtc(istDate, IST_TIMEZONE)
}

// Format date for display
export const formatDate = (date: Date | string, formatStr = 'dd MMM yyyy') => {
  const d = typeof date === 'string' ? parseISO(date) : date
  const istDate = utcToZonedTime(d, IST_TIMEZONE)
  return format(istDate, formatStr)
}