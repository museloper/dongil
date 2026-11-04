import { Icon, type IconName } from './icon';

/** 색의 15% 투명도. hex 와 var(--token) 모두 받는다 */
export const tint = (color: string, percent = 15) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

/** 원형 배경(카테고리 색 15% 투명도) + 아이콘 */
export function CategoryIcon({ icon, color, size = 40 }: { icon: string; color: string; size?: number }) {
  return (
    <span className="circle-icon" style={{ width: size, height: size, backgroundColor: tint(color) }}>
      <Icon name={icon} size={size * 0.5} color={color} />
    </span>
  );
}

/** 카테고리 편집 화면에서 고를 수 있는 아이콘 목록 */
export const ICON_CHOICES: IconName[] = [
  'restaurant', 'cafe', 'beer', 'fast-food', 'bus', 'car', 'airplane', 'train',
  'bag-handle', 'cart', 'shirt', 'home', 'bulb', 'water', 'phone-portrait', 'wifi',
  'film', 'game-controller', 'musical-notes', 'book', 'school', 'barbell', 'medkit', 'heart',
  'paw', 'gift', 'repeat', 'card', 'wallet', 'trending-up', 'cash', 'business',
  'briefcase', 'add-circle', 'ellipsis-horizontal', 'happy', 'baby-crawl', 'people',
];
