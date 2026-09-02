import { dailyChallengeForDate, type DailyChallenge } from './dailyChallenge';

export type ProtocolDrillType = 'slows-only' | 'no-abilities' | 'fixed-loadout';

export interface ProtocolDrill extends DailyChallenge {
  drillType: ProtocolDrillType;
  maxWaves: number;
  noAbilities: boolean;
}

export const PROTOCOL_DRILL_TYPES: ProtocolDrillType[] = ['slows-only', 'no-abilities', 'fixed-loadout'];
const DRILL_RE = /^drill-(\d{4}-\d{2}-\d{2})-(slows-only|no-abilities|fixed-loadout)$/;

/** Date and drill type are the complete canonical input. No client rule payload is trusted. */
export function protocolDrillForDate(dateKey: string, drillType: ProtocolDrillType): ProtocolDrill {
  const daily = dailyChallengeForDate(dateKey);
  const definitions = {
    'slows-only': {
      title: '저온 정지 훈련',
      towerIds: ['cryo', 'tesla', 'emp'],
      description: '슬로우 효과를 적용하는 타워만 사용이 허가됩니다.',
      noAbilities: false,
    },
    'no-abilities': {
      title: '침묵 사령부 훈련',
      towerIds: ['pulse', 'cryo', 'rail', 'emp'],
      description: '시뮬레이션에서 사령관 능력이 비활성화됩니다.',
      noAbilities: true,
    },
    'fixed-loadout': {
      title: '스탠다드 배치 훈련',
      towerIds: ['pulse', 'missile', 'emp'],
      description: '고정된 Pulse / Missile / EMP 배치로 출격합니다.',
      noAbilities: false,
    },
  } as const;
  const def = definitions[drillType];
  const maxWaves = 10;
  return {
    ...daily,
    id: `drill-${daily.dateKey}-${drillType}`,
    title: `${def.title} ${daily.dateKey.slice(5)}: ${daily.title.split(': ').slice(1).join(': ')}`,
    drillType,
    maxWaves,
    noAbilities: def.noAbilities,
    arsenal: {
      id: 'fixedPool',
      name: def.title,
      short: 'DRILL',
      desc: def.description,
      towerIds: [...def.towerIds],
    },
    rules: [def.description, `${maxWaves} 웨이브 돌파. 웨이브, 그 다음 격퇴한 함선 수로 순위가 매겨집니다.`],
  };
}

export function protocolDrills(now = new Date()): ProtocolDrill[] {
  const dateKey = now.toISOString().slice(0, 10);
  return PROTOCOL_DRILL_TYPES.map((type) => protocolDrillForDate(dateKey, type));
}

export function protocolDrillForId(id: string): ProtocolDrill | null {
  const match = DRILL_RE.exec(id);
  return match ? protocolDrillForDate(match[1], match[2] as ProtocolDrillType) : null;
}

export function isProtocolDrillId(id: string): boolean {
  return DRILL_RE.test(id);
}
