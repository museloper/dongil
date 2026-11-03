import type { ReactNode } from 'react';
import { compactWon, type TrendPointDto } from '@/shared';
import { AppText } from './ui';

/** 카테고리 비중 도넛 차트. children 은 가운데에 표시 */
export function DonutChart({
  data,
  size = 200,
  thickness = 24,
  children,
}: {
  data: { key: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  children?: ReactNode;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = data.reduce((a, d) => a + d.value, 0);
  const gap = data.length > 1 ? 3 : 0;

  let offset = 0;
  const arcs = total
    ? data.map((d) => {
        const len = (d.value / total) * c;
        const arc = { key: d.key, color: d.color, dash: Math.max(len - gap, 0.5), offset };
        offset += len;
        return arc;
      })
    : [];

  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label="카테고리별 지출 비중">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--fill)" strokeWidth={thickness} fill="none" />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={a.color}
              strokeWidth={thickness}
              strokeDasharray={`${a.dash} ${c}`}
              strokeDashoffset={-a.offset}
              fill="none"
            />
          ))}
        </g>
      </svg>
      <div className="donut-center">{children}</div>
    </div>
  );
}

/** 최근 N개월 수입/지출 막대 차트 (마지막 달 강조) */
export function TrendBars({ data, height = 160 }: { data: TrendPointDto[]; height?: number }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const barW = 10;
  const colW = 44;
  const width = data.length * colW;
  const h = (v: number) => Math.max((v / max) * (height - 8), v > 0 ? 3 : 0);

  return (
    <div>
      <div style={{ textAlign: 'right', marginBottom: 6 }}>
        <AppText variant="caption" tone="textMuted">최대 {compactWon(max)}</AppText>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="월별 수입·지출">
        {data.map((d, i) => {
          const last = i === data.length - 1;
          const x = i * colW + (colW - barW * 2 - 4) / 2;
          return (
            <g key={d.month} opacity={last ? 1 : 0.45}>
              <title>{`${Number(d.month.slice(5))}월 수입 ${d.income.toLocaleString('ko-KR')}원 · 지출 ${d.expense.toLocaleString('ko-KR')}원`}</title>
              <rect x={x} y={height - h(d.income)} width={barW} height={h(d.income)} rx={4} fill="var(--income)" />
              <rect x={x + barW + 4} y={height - h(d.expense)} width={barW} height={h(d.expense)} rx={4} fill="var(--expense)" />
            </g>
          );
        })}
      </svg>
      <div className="row" style={{ marginTop: 8 }}>
        {data.map((d, i) => (
          <AppText key={d.month} variant="caption" tone={i === data.length - 1 ? 'text' : 'textMuted'} style={{ flex: 1, textAlign: 'center' }}>
            {Number(d.month.slice(5))}월
          </AppText>
        ))}
      </div>
    </div>
  );
}
