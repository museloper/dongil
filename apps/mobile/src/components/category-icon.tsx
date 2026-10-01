import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import type { IconName } from './ui';

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
      <Ionicons name={icon as IconName} size={size * 0.5} color={color} />
    </View>
  );
}

/** 카테고리 편집 화면에서 고를 수 있는 아이콘 목록 */
export const ICON_CHOICES: IconName[] = [
  'restaurant', 'cafe', 'beer', 'fast-food', 'bus', 'car', 'airplane', 'train',
  'bag-handle', 'cart', 'shirt', 'home', 'bulb', 'water', 'phone-portrait', 'wifi',
  'film', 'game-controller', 'musical-notes', 'book', 'school', 'barbell', 'medkit', 'heart',
  'paw', 'gift', 'repeat', 'card', 'wallet', 'trending-up', 'cash', 'business',
  'briefcase', 'add-circle', 'ellipsis-horizontal', 'happy',
];
