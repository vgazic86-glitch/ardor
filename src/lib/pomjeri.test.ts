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
