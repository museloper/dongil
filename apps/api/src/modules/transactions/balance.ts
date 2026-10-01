import type { TxType } from '@prisma/client';

export interface BalanceEffectInput {
  type: TxType;
  amount: bigint;
  accountId: string;
  toAccountId: string | null;
}

/** 거래 1건이 계좌 잔액에 주는 변화량. sign=-1 이면 되돌리기(삭제/수정 전 원복). */
export function balanceDeltas(tx: BalanceEffectInput, sign: 1 | -1 = 1): Map<string, bigint> {
  const deltas = new Map<string, bigint>();
  const add = (id: string, v: bigint) => deltas.set(id, (deltas.get(id) ?? 0n) + v * BigInt(sign));

  switch (tx.type) {
    case 'INCOME':
      add(tx.accountId, tx.amount);
      break;
    case 'EXPENSE':
      add(tx.accountId, -tx.amount);
      break;
    case 'TRANSFER':
      add(tx.accountId, -tx.amount);
      if (tx.toAccountId) add(tx.toAccountId, tx.amount);
      break;
  }
  return deltas;
}

export function mergeDeltas(...maps: Map<string, bigint>[]): Map<string, bigint> {
  const out = new Map<string, bigint>();
  for (const m of maps) for (const [k, v] of m) out.set(k, (out.get(k) ?? 0n) + v);
  for (const [k, v] of out) if (v === 0n) out.delete(k);
  return out;
}
