import { describe, expect, it } from 'vitest'
import { isLate, itemName, needsWorkOrder, workBlockMessage } from './pomjeri'

describe('po mjeri', () => {
  it('nalog nastaje tek kad je prodaja potvrđena', () => {
    expect(needsWorkOrder('ponuda')).toBe(false)
    expect(needsWorkOrder('otkazana')).toBe(false)
    expect(needsWorkOrder('potvrđena')).toBe(true)
    expect(needsWorkOrder('isporučena')).toBe(true)
  })
  it('Spremna tek kad su svi nalozi gotovi', () => {
    expect(workBlockMessage([])).toBeNull()
    expect(workBlockMessage([{ number: 'RN-2026-0001', status: 'gotovo', name: 'Kuhinja' }])).toBeNull()
    const msg = workBlockMessage([
      { number: 'RN-2026-0001', status: 'gotovo', name: 'Kuhinja' },
      { number: 'RN-2026-0002', status: 'sklapanje', name: 'Plakar' },
    ])
    expect(msg).toContain('RN-2026-0002 Plakar (sklapanje u radionici)')
    expect(msg).not.toContain('RN-2026-0001')
  })
  it('kašnjenje i naziv stavke', () => {
    expect(isLate({ status: 'krojenje', dueDate: '2026-11-19' }, '2026-11-20')).toBe(true)
    expect(isLate({ status: 'gotovo', dueDate: '2026-11-19' }, '2026-11-20')).toBe(false)
    expect(isLate({ status: 'novi', dueDate: null }, '2026-11-20')).toBe(false)
    expect(itemName({ customName: '  Kuhinja Petrović ' }, 'Kuhinja po mjeri')).toBe('Kuhinja Petrović')
    expect(itemName({ customName: '' }, 'Kuhinja po mjeri')).toBe('Kuhinja po mjeri')
    expect(itemName({}, 'Stol')).toBe('Stol')
  })
})

describe('troškovi naloga', () => {
  it('zbir vanjskih troškova i rada', async () => {
    const { costTotals, costAmount, workMargin } = await import('./pomjeri')
    expect(costAmount(7.5, 15)).toBe(112.5)
    expect(costAmount(3, 10.005)).toBe(30.03)
    expect(costAmount(20, 12.525)).toBe(250.6)
    const t = costTotals([
      { kind: 'partner', amount: 1200 },
      { kind: 'materijal', amount: 450.5 },
      { kind: 'rad', amount: 300 },
      { kind: 'ostalo', amount: 49.5 },
    ])
    expect(t).toEqual({ external: 1700, labor: 300, total: 2000 })
    const m = workMargin(5850, t)
    expect(m.net).toBe(5000)
    expect(m.profit).toBe(3000)
    expect(m.pct).toBeCloseTo(0.6)
    expect(workMargin(0, t).pct).toBe(0)
  })
})
