import type { CSSProperties } from 'react';
import { CUSTOM_ICONS } from '@dongil/shared';
import * as io from 'ionicons/icons';

/** shared 의 직접 그린 아이콘을 Ionicons 와 같은 data URL 로 만든다 */
function customIcon(name: string) {
  const parts = CUSTOM_ICONS[name].map((p) =>
    p.w
      ? `<path d='${p.d}' fill='none' stroke='black' stroke-width='${p.w}' stroke-linecap='round' stroke-linejoin='round'/>`
      : `<path d='${p.d}' fill='black'/>`,
  );
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'>${parts.join('')}</svg>`;
}

/**
 * 이름("restaurant", "chevron-back" …)으로 고르는 Ionicons.
 * 카테고리 아이콘은 서버에 문자열로 저장되므로, 모바일 앱과 같은 Ionicons 이름 체계를 그대로 쓴다.
 * 쓰는 아이콘만 골라 담아 번들에 전체 아이콘이 들어가지 않게 한다.
 */
const ICONS = {
  // UI
  add: io.add,
  'add-circle': io.addCircle,
  'arrow-down': io.arrowDown,
  'arrow-up': io.arrowUp,
  'backspace-outline': io.backspaceOutline,
  'book-outline': io.bookOutline,
  'business-outline': io.businessOutline,
  'calendar-outline': io.calendarOutline,
  'card-outline': io.cardOutline,
  star: io.star,
  'star-outline': io.starOutline,
  'document-text-outline': io.documentTextOutline,
  'time-outline': io.timeOutline,
  'cash-outline': io.cashOutline,
  checkmark: io.checkmark,
  'checkmark-circle': io.checkmarkCircle,
  'chevron-back': io.chevronBack,
  'chevron-down': io.chevronDown,
  'chevron-forward': io.chevronForward,
  'chevron-up': io.chevronUp,
  close: io.close,
  'close-circle': io.closeCircle,
  'cloud-offline-outline': io.cloudOfflineOutline,
  'copy-outline': io.copyOutline,
  'create-outline': io.createOutline,
  'download-outline': io.downloadOutline,
  'enter-outline': io.enterOutline,
  'exit-outline': io.exitOutline,
  'flag-outline': io.flagOutline,
  help: io.help,
  'home-outline': io.homeOutline,
  'log-out-outline': io.logOutOutline,
  people: io.people,
  'people-outline': io.peopleOutline,
  person: io.person,
  'person-add-outline': io.personAddOutline,
  'phone-portrait-outline': io.phonePortraitOutline,
  'pie-chart': io.pieChart,
  'pie-chart-outline': io.pieChartOutline,
  'pricetag-outline': io.pricetagOutline,
  'pricetags-outline': io.pricetagsOutline,
  receipt: io.receipt,
  'receipt-outline': io.receiptOutline,
  'refresh-outline': io.refreshOutline,
  search: io.search,
  settings: io.settings,
  'settings-outline': io.settingsOutline,
  'share-outline': io.shareOutline,
  'sparkles-outline': io.sparklesOutline,
  'swap-horizontal': io.swapHorizontal,
  'swap-horizontal-outline': io.swapHorizontalOutline,
  'trash-outline': io.trashOutline,
  'trending-down': io.trendingDown,
  'wallet-outline': io.walletOutline,
  // 카테고리 선택지 (ICON_CHOICES)
  restaurant: io.restaurant,
  cafe: io.cafe,
  beer: io.beer,
  'fast-food': io.fastFood,
  bus: io.bus,
  car: io.car,
  airplane: io.airplane,
  train: io.train,
  'bag-handle': io.bagHandle,
  cart: io.cart,
  shirt: io.shirt,
  home: io.home,
  bulb: io.bulb,
  water: io.water,
  'phone-portrait': io.phonePortrait,
  wifi: io.wifi,
  film: io.film,
  'game-controller': io.gameController,
  'musical-notes': io.musicalNotes,
  book: io.book,
  school: io.school,
  barbell: io.barbell,
  medkit: io.medkit,
  heart: io.heart,
  paw: io.paw,
  gift: io.gift,
  repeat: io.repeat,
  card: io.card,
  wallet: io.wallet,
  'trending-up': io.trendingUp,
  cash: io.cash,
  business: io.business,
  briefcase: io.briefcase,
  'ellipsis-horizontal': io.ellipsisHorizontal,
  'ellipsis-vertical': io.ellipsisVertical,
  happy: io.happy,
  ribbon: io.ribbon,
  'baby-crawl': customIcon('baby-crawl'),
} as const;

export type IconName = keyof typeof ICONS;

export function isIconName(name: string): name is IconName {
  return name in ICONS;
}

/**
 * 아웃라인 아이콘은 Ionic 의 CSS 클래스(ionicon-fill-none 등)로 선을 그리는데,
 * 이미지(마스크)로 쓰면 바깥 CSS 가 닿지 않으므로 같은 규칙을 SVG 안에 넣어 둔다.
 */
const STYLE = "<style>.ionicon{fill:black;stroke:black}.ionicon-fill-none{fill:none}.ionicon-stroke-width{stroke-width:32px}</style>";
const masks = new Map<string, string>();
function maskOf(name: IconName) {
  let m = masks.get(name);
  if (!m) {
    const src = ICONS[name].replace(/(<svg[^>]*>)/, `$1${STYLE}`);
    m = `url("${src}") center / contain no-repeat`;
    masks.set(name, m);
  }
  return m;
}

/** SVG 를 마스크로 써서 color 로 칠한다 (currentColor 대신 토큰 색을 바로 받기 위해) */
export function Icon({ name, size = 22, color = 'currentColor', style }: {
  name: string;
  size?: number;
  color?: string;
  style?: CSSProperties;
}) {
  const mask = maskOf(isIconName(name) ? name : 'help');
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        flexShrink: 0,
        width: size,
        height: size,
        backgroundColor: color,
        mask,
        WebkitMask: mask,
        ...style,
      }}
    />
  );
}
