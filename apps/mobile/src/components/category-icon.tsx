import Ionicons from '@expo/vector-icons/Ionicons';
import { CUSTOM_ICONS } from '@dongil/shared';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { IconName } from './ui';

/** 카테고리 아이콘 하나. Ionicons 에 없는 것은 shared 의 CUSTOM_ICONS 로 그린다 */
export function CategoryGlyph({ icon, size, color }: { icon: string; size: number; color: string }) {
  const custom = CUSTOM_ICONS[icon];
  if (!custom) return <Ionicons name={icon as IconName} size={size} color={color} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      {custom.map((part) =>
        part.w ? (
          <Path key={part.d} d={part.d} fill="none" stroke={color} strokeWidth={part.w} strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <Path key={part.d} d={part.d} fill={color} />
        ),
      )}
    </Svg>
  );
}

/** 원형 배경(카테고리 색 15% 투명도) + 아이콘 */
export function CategoryIcon({ icon, color, size = 40 }: { icon: string; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${color}26`,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <CategoryGlyph icon={icon} size={size * 0.5} color={color} />
    </View>
  );
}

/** 카테고리 편집 화면에서 고를 수 있는 아이콘 목록 */
export const ICON_CHOICES: (IconName | 'baby-crawl')[] = [
  'restaurant', 'cafe', 'beer', 'fast-food', 'bus', 'car', 'airplane', 'train',
  'bag-handle', 'cart', 'shirt', 'home', 'bulb', 'water', 'phone-portrait', 'wifi',
  'film', 'game-controller', 'musical-notes', 'book', 'school', 'barbell', 'medkit', 'heart',
  'paw', 'gift', 'repeat', 'card', 'wallet', 'trending-up', 'cash', 'business',
  'briefcase', 'add-circle', 'ellipsis-horizontal', 'happy', 'baby-crawl', 'people', 'ribbon',
];
