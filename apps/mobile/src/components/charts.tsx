import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';
import { compactWon, type TrendPointDto } from '@dongil/shared';
import { useTheme } from '@/theme/theme';
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
  const { colors } = useTheme();
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
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* 12시 방향부터 그리도록 회전. origin prop 대신 SVG transform 문자열 사용 (웹 DOM 경고 방지) */}
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.fill} strokeWidth={thickness} fill="none" />
          {arcs.map((a) => (
            <Circle
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
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

/** 최근 N개월 수입/지출 막대 차트 (마지막 달 강조) */
export function TrendBars({ data, height = 160 }: { data: TrendPointDto[]; height?: number }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const barW = 10;
  const colW = 44;
  const width = data.length * colW;
  const h = (v: number) => Math.max((v / max) * (height - 8), v > 0 ? 3 : 0);

  return (
    <View>
      <View style={styles.axisRow}>
        <AppText variant="caption" tone="textMuted">
          최대 {compactWon(max)}
        </AppText>
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          const last = i === data.length - 1;
          const x = i * colW + (colW - barW * 2 - 4) / 2;
          return (
            <G key={d.month} opacity={last ? 1 : 0.45}>
              <Rect x={x} y={height - h(d.income)} width={barW} height={h(d.income)} rx={4} fill={colors.income} />
              <Rect x={x + barW + 4} y={height - h(d.expense)} width={barW} height={h(d.expense)} rx={4} fill={colors.expense} />
            </G>
          );
        })}
      </Svg>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <AppText
            key={d.month}
            variant="caption"
            tone={i === data.length - 1 ? 'text' : 'textMuted'}
            style={{ flex: 1, textAlign: 'center' }}>
            {Number(d.month.slice(5))}월
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  axisRow: { alignItems: 'flex-end', marginBottom: 6 },
  labels: { flexDirection: 'row', marginTop: 8 },
});
