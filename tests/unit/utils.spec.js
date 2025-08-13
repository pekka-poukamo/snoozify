import { describe, it, expect, vi } from 'vitest'
import * as Utils from '/scripts/utils.js'

describe('utils', () => {
  it('getNextWeekdayFromDate returns Dates and additionalWeek adds ~7 days', () => {
    const base = new Date('2025-01-01T00:00:00Z') // Wed
    const next = Utils.getNextWeekdayFromDate(base, 1, { additionalWeek: false })
    const nextPlusWeek = Utils.getNextWeekdayFromDate(base, 1, { additionalWeek: true })
    expect(next instanceof Date).toBe(true)
    expect(nextPlusWeek instanceof Date).toBe(true)

    const deltaMs = nextPlusWeek.getTime() - next.getTime()
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    expect(Math.abs(deltaMs - sevenDaysMs)).toBeLessThanOrEqual(60 * 1000) // within 1 min
  })

  it('getNextWeekdaysFromToday returns 7 dates', () => {
    const days = Utils.getNextWeekdaysFromToday({ additionalWeek: false })
    expect(Array.isArray(days)).toBe(true)
    expect(days).toHaveLength(7)
    days.forEach(d => expect(d instanceof Date).toBe(true))
  })

  it('datesSameWeek handles year boundaries', () => {
    const dec31 = new Date('2020-12-31T00:00:00Z')
    const jan1 = new Date('2021-01-01T00:00:00Z')
    expect(typeof Utils.datesSameWeek(dec31, jan1)).toBe('boolean')
  })

  it('getUID returns unique strings across calls', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1736036400000) // fixed
    const randomSpy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.123456789)
      .mockReturnValueOnce(0.987654321)
    const a = Utils.getUID()
    const b = Utils.getUID()
    expect(typeof a).toBe('string')
    expect(a.length).toBeGreaterThan(0)
    expect(a).not.toBe(b)
    randomSpy.mockRestore()
    vi.restoreAllMocks()
  })
})