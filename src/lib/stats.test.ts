import { describe, expect, it } from 'vitest'
import { goodsBlock, goodsBlockMessage, waitingOrders, type StockOrder } from './stats'

const o = (id: string, date: string, qty: number, status: StockOrder['status'] = 'potvrđena', issuedAt: string | null = null): StockOrder => ({
  id,
  number: `P-${id}`,
  date,
  status,
  issuedAt,
  items: [{ productId: 'sofa', qty }],
})

describe('waitingOrders', () => {
  it('zalihu dobija najstarija prodaja, novija čeka robu', () => {
    const w = waitingOrders([o('2', '2026-11-10', 1), o('1', '2026-11-01', 1)], [{ id: 'sofa', stock: 1 }])
    expect(w.has('1')).toBe(false)
    expect(w.get('2')).toEqual([{ productId: 'sofa', qty: 1, missing: 1 }])
  })
})

describe('goodsBlock — „Spremna” / „Isporučena” dok prodaja čeka robu', () => {
  const stock = [{ id: 'sofa', stock: 1 }]
  const orders = [o('1', '2026-11-01', 1), o('2', '2026-11-10', 2)]

  it('dozvoljava kad je roba u salonu', () => {
    expect(goodsBlock(orders, stock, '1', 'spremna')).toBeNull()
    expect(goodsBlock(orders, stock, '1', 'isporučena')).toBeNull()
  })

  it('zabranjuje kad prodaja čeka robu', () => {
    expect(goodsBlock(orders, stock, '2', 'spremna')).toEqual([{ productId: 'sofa', qty: 2, missing: 2 }])
    expect(goodsBlock(orders, stock, '2', 'isporučena')).not.toBeNull()
  })

  it('ostali statusi nisu ograničeni', () => {
    expect(goodsBlock(orders, stock, '2', 'u_izradi')).toBeNull()
    expect(goodsBlock(orders, stock, '2', 'otkazana')).toBeNull()
  })

  it('ponuda koja ide ravno u isporuku računa se kao nova rezervacija', () => {
    const list = [o('1', '2026-11-01', 1), o('3', '2026-11-12', 1, 'ponuda')]
    expect(goodsBlock(list, stock, '3', 'isporučena')).not.toBeNull()
    expect(goodsBlock(list, [{ id: 'sofa', stock: 2 }], '3', 'isporučena')).toBeNull()
  })

  it('roba koja je već izašla iz salona se ne provjerava ponovo', () => {
    const list = [o('1', '2026-11-01', 1), o('4', '2026-11-02', 1, 'spremna', '2026-11-03')]
    expect(goodsBlock(list, [{ id: 'sofa', stock: 0 }], '4', 'isporučena')).toBeNull()
  })

  it('poruka navodi artikal i koliko fali', () => {
    const msg = goodsBlockMessage([{ productId: 'sofa', qty: 2, missing: 2 }], 'spremna', () => 'Sofa Lena')
    expect(msg).toContain('Sofa Lena (fali 2 od 2 kom)')
    expect(msg).toContain('„Spremna”')
    expect(goodsBlockMessage([{ productId: 'sofa', qty: 1, missing: 1 }], 'isporučena', () => 'Sofa')).toContain('Isporuka i dostava')
  })
})
