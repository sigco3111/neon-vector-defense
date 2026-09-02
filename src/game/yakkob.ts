// THE YAKKOB — a hand-authored "special edition" challenge, not a seeded daily.
//
// Lore: a pixelated dwarf dug too greedily and too deep beneath Lantern Seven and
// broke through into the old prism vault. He came back up carrying two instruments
// and a grin: the Prism Array and the Watchfire Beacon. That is the whole arsenal.
//
// It is UNLOCKED by clicking the digging dwarf on the main menu (see YakkobDwarf),
// after which it takes the Weekly Mutation's slot in the challenges dock. Because its
// id is a fixed word (not `daily-YYYY-MM-DD`), both the client and the Cloud Functions
// reject it for the online daily boards — THE YAKKOB is deliberately LOCAL-RANKED only
// (best wave tracked on-device via meta.bestYakkobWave). No deploy required.

import { buildTwistForId, type DailyChallenge } from './dailyChallenge';

export const YAKKOB_ID = 'yakkob';
export const YAKKOB_TOWER_IDS = ['prismarr', 'watchfire'] as const;

/** True when a challenge is THE YAKKOB (drives the squished-icon quirk + local ranking). */
export function isYakkob(challenge: { special?: string } | null | undefined): boolean {
  return challenge?.special === 'yakkob';
}

/** True for the two towers whose shop icons render squished (0.75× height) in THE YAKKOB. */
export function isYakkobSquishedTower(towerId: string): boolean {
  return towerId === 'prismarr' || towerId === 'watchfire';
}

export const THE_YAKKOB: DailyChallenge = {
  id: YAKKOB_ID,
  dateKey: 'special',
  special: 'yakkob',
  mapId: 'foundry',
  diffId: 'normal',
  title: 'THE YAKKOB',
  arsenal: {
    id: 'fixedPool',
    name: '야콥의 선반',
    short: 'YAKKOB',
    desc: '프리즘 어레이와 워치파이어 비콘만이 출정한다 — 난쟁이는 다른 것은 가져오지 않았다.',
    towerIds: [...YAKKOB_TOWER_IDS],
    // The two premium beams at 40% requisition — the vault paid for itself. Keeps the
    // opening playable when the whole arsenal costs 1600+ / 2500+ at list price.
    costMultiplier: 0.4,
  },
  twist: buildTwistForId('glassCannon'),
  boon: {
    id: 'doublePickups',
    name: '난쟁이의 행운',
    short: 'LUCK',
    desc: '전투 픽업이 두 배 더 자주 드롭됩니다.',
    pickupDropMultiplier: 2,
  },
  rules: [
    '프리즘 어레이와 워치파이어 비콘만 사용 가능하며, 이 아이콘들은 금고에서 돌아올 때 조금 눌려서 표시됩니다.',
    '두 빔 모두 정가의 40% 가격입니다. 타워가 +30% 더 강한 피해를 주지만, 원자로 코어는 60%에서 시작합니다.',
    '전투 픽업이 두 배 더 자주 드롭됩니다.',
    '특별 에디션 — 웨이브, 그 다음 격퇴한 함선 수로 이 기기에서 로컬 순위가 기록됩니다.',
  ],
};
