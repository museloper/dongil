import { balanceDeltas, mergeDeltas } from './balance';

describe('balanceDeltas', () => {
  it('수입은 계좌 잔액을 늘린다', () => {
    expect(balanceDeltas({ type: 'INCOME', amount: 1000n, accountId: 'a', toAccountId: null })).toEqual(
      new Map([['a', 1000n]]),
    );
  });

  it('지출은 계좌 잔액을 줄인다', () => {
    expect(balanceDeltas({ type: 'EXPENSE', amount: 500n, accountId: 'a', toAccountId: null })).toEqual(
      new Map([['a', -500n]]),
    );
  });

  it('이체는 출금 계좌에서 빼고 입금 계좌에 더한다', () => {
    expect(balanceDeltas({ type: 'TRANSFER', amount: 300n, accountId: 'a', toAccountId: 'b' })).toEqual(
      new Map([
        ['a', -300n],
        ['b', 300n],
      ]),
    );
  });

  it('수정 시 원복과 신규 적용이 합쳐지고 0 변화는 제거된다', () => {
    const before = { type: 'EXPENSE' as const, amount: 500n, accountId: 'a', toAccountId: null };
    const after = { type: 'EXPENSE' as const, amount: 700n, accountId: 'a', toAccountId: null };
    expect(mergeDeltas(balanceDeltas(before, -1), balanceDeltas(after))).toEqual(new Map([['a', -200n]]));
    expect(mergeDeltas(balanceDeltas(before, -1), balanceDeltas(before))).toEqual(new Map());
  });
});
