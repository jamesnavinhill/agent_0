import { describe, it, expect } from 'vitest'
import { parseCron, matchesCron, getNextRunTime, describeCron } from '@/lib/scheduler/cron'

describe('parseCron', () => {
    it('should parse a valid cron expression', () => {
        const result = parseCron('0 9 * * *')
        expect(result).not.toBeNull()
        expect(result?.minute).toEqual([0])
        expect(result?.hour).toEqual([9])
        expect(result?.dayOfMonth).toHaveLength(31)
        expect(result?.month).toHaveLength(12)
        expect(result?.dayOfWeek).toHaveLength(7)
    })

    it('should return null for invalid expressions', () => {
        expect(parseCron('invalid')).toBeNull()
        expect(parseCron('0 9 *')).toBeNull()
        expect(parseCron('')).toBeNull()
    })

    it('should parse step values', () => {
        const result = parseCron('*/15 * * * *')
        expect(result?.minute).toEqual([0, 15, 30, 45])
    })

    it('should parse range values', () => {
        const result = parseCron('0 9-12 * * *')
        expect(result?.hour).toEqual([9, 10, 11, 12])
    })

    it('should parse comma-separated values', () => {
        const result = parseCron('0 9,12,18 * * *')
        expect(result?.hour).toEqual([9, 12, 18])
    })

    it('should parse specific days of week', () => {
        const result = parseCron('0 9 * * 1,3,5')
        expect(result?.dayOfWeek).toEqual([1, 3, 5])
    })
})

describe('matchesCron', () => {
    it('should match when date matches cron', () => {
        const cron = parseCron('0 9 * * *')!
        const date = new Date('2026-01-19T09:00:00')
        expect(matchesCron(cron, date)).toBe(true)
    })

    it('should not match when minute is different', () => {
        const cron = parseCron('0 9 * * *')!
        const date = new Date('2026-01-19T09:30:00')
        expect(matchesCron(cron, date)).toBe(false)
    })

    it('should not match when hour is different', () => {
        const cron = parseCron('0 9 * * *')!
        const date = new Date('2026-01-19T10:00:00')
        expect(matchesCron(cron, date)).toBe(false)
    })
})

describe('getNextRunTime', () => {
    it('should return the next run time', () => {
        const from = new Date('2026-01-19T08:30:00')
        const next = getNextRunTime('0 9 * * *', from)
        expect(next).not.toBeNull()
        expect(next?.getHours()).toBe(9)
        expect(next?.getMinutes()).toBe(0)
    })

    it('should return null for invalid expression', () => {
        const next = getNextRunTime('invalid')
        expect(next).toBeNull()
    })

    it('should find next run for step schedule', () => {
        const from = new Date('2026-01-19T08:30:00')
        const next = getNextRunTime('*/30 * * * *', from)
        expect(next).not.toBeNull()
        // Next 30-minute mark after 08:30 is 09:00
        expect(next?.getMinutes()).toBe(0)
    })
})

describe('describeCron', () => {
    it('should describe common presets', () => {
        expect(describeCron('0 9 * * *')).toBe('Daily at 9:00 AM')
        expect(describeCron('0 */4 * * *')).toBe('Every 4 hours')
        expect(describeCron('*/30 * * * *')).toBe('Every 30 minutes')
    })

    it('should describe time for custom expressions', () => {
        const result = describeCron('30 14 * * *')
        expect(result).toContain('14:30')
    })

    it('should return raw expression for complex cases', () => {
        expect(describeCron('invalid')).toBe('invalid')
    })
})
