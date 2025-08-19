import { describe, it, expect } from 'vitest'
import { byDate, getUID, getNextWeekdayFromDate, getNextWeekdaysFromToday, datesSameWeek } from '/scripts/utils.js'

describe('utils', () => {
  it('byDate sorts ascending by wakeUpDate', () => {
    const items = [
      { wakeUpDate: '2023-01-03' },
      { wakeUpDate: '2023-01-01' },
      { wakeUpDate: '2023-01-02' },
    ]
    const sorted = items.slice().sort(byDate)
    expect(sorted.map(i => i.wakeUpDate)).toEqual(['2023-01-01', '2023-01-02', '2023-01-03'])
  })

  it('getUID returns likely unique values without dots', () => {
    const values = new Set(Array.from({ length: 1000 }, () => getUID()))
    expect(values.size).toBe(1000)
    for (const v of values) expect(v).not.toMatch(/\./)
  })

  it('getNextWeekdayFromDate returns a Date object', () => {
    const someDate = new Date()
    const result = getNextWeekdayFromDate(someDate, 3, { additionalWeek: false })
    expect(result instanceof Date).toBe(true)
  })

  it('getNextWeekdaysFromToday returns 7 dates', () => {
    const dates = getNextWeekdaysFromToday({ additionalWeek: false })
    expect(Array.isArray(dates)).toBe(true)
    expect(dates.length).toBe(7)
  })

  it('datesSameWeek detects same-ISO-week dates', () => {
    const d1 = new Date('2023-01-02T00:00:00Z') // Monday
    const d2 = new Date('2023-01-06T00:00:00Z') // Friday
    const d3 = new Date('2023-01-09T00:00:00Z') // Next Monday
    expect(datesSameWeek(d1, d2)).toBe(true)
    expect(datesSameWeek(d1, d3)).toBe(false)
  })
})

