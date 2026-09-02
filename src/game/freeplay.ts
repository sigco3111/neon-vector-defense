import type { DamageType, WaveGroup } from './types';
import { ALL_MAPS, DIFFICULTIES } from './maps';

export type FreeplayContractId = 'standard' | 'ironcore' | 'leanGrid' | 'volatile' | 'purist';
export type FreeplayRelicId = 'beaconChoir' | 'emberDoctrine' | 'siegeDoctrine' | 'sensorCrown' | 'salvageTax' | 'chronoMarket' | 'rivalBounty' | 'stormCapacitors';
export type FreeplayMutatorId = 'cloakSurge' | 'healerConvoy' | 'armoredSwarm' | 'speedSurge' | 'shieldedBoss' | 'creditDrought' | 'sensorBlackout' | 'splitPressure';
export type FreeplayRivalId = 'vesper' | 'orrery' | 'blackbox' | 'redSaint';
export type RiskWaveId = 'redline' | 'blackout' | 'bounty';

export interface FreeplayContract {
  id: FreeplayContractId;
  name: string;
  short: string;
  desc: string;
  multiplier: number;
  maxTowers?: number;
  livesMult?: number;
  noSell?: boolean;
  noBlueprint?: boolean;
  bonusType?: DamageType;
  penaltyType?: DamageType;
}

export interface FreeplayRelic {
  id: FreeplayRelicId;
  name: string;
  desc: string;
  downside: string;
  scoreMult: number;
}

export interface FreeplayMutator {
  id: FreeplayMutatorId;
  name: string;
  desc: string;
  scoreMult: number;
}

export interface FreeplayRival {
  id: FreeplayRivalId;
  name: string;
  desc: string;
  scoreMult: number;
}

export interface RiskWaveOffer {
  id: RiskWaveId;
  name: string;
  desc: string;
  reward: string;
  mutatorIds: FreeplayMutatorId[];
  scoreMult: number;
  bonusCredits: number;
}

export interface DailyFreeplaySeed {
  id: string;
  dateKey: string;
  mapId: string;
  diffId: string;
  title: string;
  rules: string[];
  towerIds: string[];
  contractIds: FreeplayContractId[];
  relicIds: FreeplayRelicId[];
  mutatorBias: FreeplayMutatorId[];
  rivalIds: FreeplayRivalId[];
}

export interface FreeplayState {
  contract: FreeplayContract | null;
  relics: FreeplayRelic[];
  nextRelicOffer: FreeplayRelic[];
  lastRelicOfferWave: number;
  currentMutators: FreeplayMutator[];
  nextMutators: FreeplayMutator[];
  rival: FreeplayRival | null;
  rivalLevel: number;
  riskOffer: RiskWaveOffer | null;
  riskAccepted: RiskWaveOffer | null;
  riskCleared: number;
  scoreMult: number;
  lastCheckpointWave: number;
  daily: DailyFreeplaySeed | null;
}

export const FREEPLAY_CONTRACTS: FreeplayContract[] = [
  { id: 'standard', name: '자유 지속', short: 'OPEN', desc: '특별한 제약이 없다. 표준 점수의 깨끗한 무한 런.', multiplier: 1 },
  { id: 'ironcore', name: '철심 서약', short: 'IRON', desc: '프리플레이를 더 적은 코어로 시작하지만, 모든 체크포인트의 가치가 높아진다.', multiplier: 1.2, livesMult: 0.65 },
  { id: 'leanGrid', name: '절제 그리드 강제', short: 'LEAN', desc: '타워 수가 18개로 제한된다. 모든 배치가 의미를 가져야 한다.', multiplier: 1.35, maxTowers: 18 },
  { id: 'volatile', name: '휘발성 인양물', short: 'VOLT', desc: '판매 불가. 위원회는 확신의 대가를 치른다 — 후회가 아니다.', multiplier: 1.3, noSell: true },
  { id: 'purist', name: '운동력 순수 조항', short: 'PURE', desc: '운동 타워는 더 강하고, 에너지 피해는 계약의 벌칙을 받는다.', multiplier: 1.25, bonusType: 'kinetic', penaltyType: 'energy' },
];

export const FREEPLAY_RELICS: FreeplayRelic[] = [
  { id: 'beaconChoir', name: '비콘 합창단', desc: '지원 오라가 증폭되고 센서 커버가 정전에 저항한다.', downside: '라이벌 교란 펄스가 더 자주 발생한다.', scoreMult: 1.08 },
  { id: 'emberDoctrine', name: '잿불 교리', desc: '화상과 지속 화염 효과가 훨씬 강해진다.', downside: '교리가 활성화되어 있는 동안 킬 수입이 감소한다.', scoreMult: 1.06 },
  { id: 'siegeDoctrine', name: '포위 교리', desc: '미사일, 레일, 빔 최종 단계가 보스와 라이벌을 더 강하게 깬다.', downside: '군체 변이자가 더 많은 수를 추가한다.', scoreMult: 1.08 },
  { id: 'sensorCrown', name: '센서 왕관', desc: '감지 타워가 위상 은신 급증과 센서 정전 벌칙을 뚫는다.', downside: '위상 은신 웨이브가 더 자주 도착한다.', scoreMult: 1.05 },
  { id: 'salvageTax', name: '인양물세', desc: '웨이브와 리스크 보상이 더 많은 크레딧을 지급한다.', downside: '기본 킬 보상이 웨이브 60 이후 더 가파르게 줄어든다.', scoreMult: 1.04 },
  { id: 'chronoMarket', name: '시간 시장', desc: '능력이 프리플레이 중 더 빠르게 회복된다.', downside: '속도 급증 변이자가 더 격렬해진다.', scoreMult: 1.05 },
  { id: 'rivalBounty', name: '라이벌 현상금', desc: '라이벌 처치 시 큰 현상금과 점수 향상을 받는다.', downside: '라이벌이 추가 호위 장갑을 갖추고 진입한다.', scoreMult: 1.1 },
  { id: 'stormCapacitors', name: '폭풍 축전기', desc: '최종 단계 에너지와 아크 타워가 추가 연쇄 압력을 얻는다.', downside: '장갑 군체 변이자가 더 흔해진다.', scoreMult: 1.06 },
];

export const FREEPLAY_MUTATORS: FreeplayMutator[] = [
  { id: 'cloakSurge', name: '은신 급증', desc: '웨이브의 일부가 위상 은신으로 들어가 센서 커버를 강제한다.', scoreMult: 1.04 },
  { id: 'healerConvoy', name: '치유자 호위', desc: '세라프 호위가 웨이브에 합류해 빽빽한 함선 집단을 수리한다.', scoreMult: 1.05 },
  { id: 'armoredSwarm', name: '장갑 군체', desc: '이지스/저거넛 추가 압력이 운동 답변을 시험한다.', scoreMult: 1.05 },
  { id: 'speedSurge', name: '속도 급증', desc: '빠른 함선들이 압축된 패킷으로 도착한다.', scoreMult: 1.04 },
  { id: 'shieldedBoss', name: '쉴드 보스', desc: '보스 함선이 추가 체력과 호위 화면으로 도착한다.', scoreMult: 1.06 },
  { id: 'creditDrought', name: '크레딧 흉년', desc: '이번 웨이브 동안 킬 수입이 일시적으로 더 빠듯해진다.', scoreMult: 1.08 },
  { id: 'sensorBlackout', name: '센서 정전', desc: '강한 센서 네트워크만 위상 은신 함선을 완전히 대응할 수 있다.', scoreMult: 1.07 },
  { id: 'splitPressure', name: '분할 압력', desc: '무겁고 빠른 그룹이 정중하게 도착하는 대신 겹친다.', scoreMult: 1.05 },
];

export const FREEPLAY_RIVALS: FreeplayRival[] = [
  { id: 'vesper', name: '베스퍼, 조용한 별', desc: '팬텀 호위를 거느린 위상 은신 기함.', scoreMult: 1.08 },
  { id: 'orrery', name: '오러리, 포위의 톱니바퀴', desc: '타이탄 화면을 데려오는 쉴드 자본함.', scoreMult: 1.1 },
  { id: 'blackbox', name: '블랙박스, 기억의 함선', desc: '교란 펄스로 근처 타워를 방해하는 라이벌.', scoreMult: 1.09 },
  { id: 'redSaint', name: '레드 세인트, 현상금 헐', desc: '격파하면 보상을 주는 잔혹한 현상금 기함.', scoreMult: 1.12 },
];

export const RISK_WAVES: RiskWaveOffer[] = [
  { id: 'redline', name: '한계 속도 패킷', desc: '다음 웨이브에 속도와 분할 압력을 추가한다.', reward: '클리어 시 +12% 점수 배율과 크레딧.', mutatorIds: ['speedSurge', 'splitPressure'], scoreMult: 1.12, bonusCredits: 450 },
  { id: 'blackout', name: '정전 패킷', desc: '은신 급증과 센서 정전을 추가한다.', reward: '클리어 시 +15% 점수 배율과 유물 리롤.', mutatorIds: ['cloakSurge', 'sensorBlackout'], scoreMult: 1.15, bonusCredits: 300 },
  { id: 'bounty', name: '현상금 패킷', desc: '쉴드 보스 압력과 치유자 호위를 추가한다.', reward: '클리어 시 +18% 점수 배율과 큰 현상금.', mutatorIds: ['shieldedBoss', 'healerConvoy'], scoreMult: 1.18, bonusCredits: 700 },
];

const DAILY_CORE_TOWER_IDS = ['pulse', 'flak', 'tesla', 'cryo', 'rail', 'emp', 'missile'];
const DAILY_ROTATING_TOWER_IDS = [
  'drone', 'ember', 'cantor', 'cinder', 'sunspear', 'gauss',
  'prismarr', 'locust', 'requiem', 'watchfire', 'abyss',
];

export function createFreeplayState(): FreeplayState {
  return {
    contract: null,
    relics: [],
    nextRelicOffer: [],
    lastRelicOfferWave: 0,
    currentMutators: [],
    nextMutators: [],
    rival: null,
    rivalLevel: 0,
    riskOffer: null,
    riskAccepted: null,
    riskCleared: 0,
    scoreMult: 1,
    lastCheckpointWave: 0,
    daily: null,
  };
}

export function dailyFreeplaySeed(now = new Date()): DailyFreeplaySeed {
  const dateKey = now.toISOString().slice(0, 10);
  const seed = hash(dateKey);
  const map = ALL_MAPS[seed % ALL_MAPS.length];
  // Exclude Recruit; it is too soft for endless daily operations.
  const diffPool = DIFFICULTIES.filter((d) => d.id !== 'easy');
  const diff = diffPool[Math.floor(seed / 7) % diffPool.length];
  const contractIds = pickMany(
    FREEPLAY_CONTRACTS.filter((c) => c.id !== 'standard').map((c) => c.id),
    seed + 5,
    3,
  );
  const towerIds = [...DAILY_CORE_TOWER_IDS, ...pickMany(DAILY_ROTATING_TOWER_IDS, seed + 47, 5)];
  const relicIds = pickMany(FREEPLAY_RELICS.map((r) => r.id), seed + 11, 5);
  const mutatorBias = pickMany(FREEPLAY_MUTATORS.map((m) => m.id), seed + 23, 4);
  const rivalIds = pickMany(FREEPLAY_RIVALS.map((r) => r.id), seed + 37, 3);
  return {
    id: `daily-${dateKey}`,
    dateKey,
    mapId: map.id,
    diffId: diff.id,
    title: `데일리 무한 ${dateKey.slice(5)}: ${map.name}`,
    rules: [
      '모든 플레이어를 위한 고정된 타워 무기고.',
      '고정된 유물 풀, 라이벌 순서, 변이자 편향.',
      '체크포인트 저장은 새로운 최고 웨이브 당 한 번 허용된다.',
      '리스크 웨이브는 표준 프리플레이보다 점수가 +25% 더 가치가 있다.',
    ],
    towerIds,
    contractIds,
    relicIds,
    mutatorBias,
    rivalIds,
  };
}

export function contractById(id: FreeplayContractId): FreeplayContract {
  return FREEPLAY_CONTRACTS.find((c) => c.id === id) ?? FREEPLAY_CONTRACTS[0];
}

export function relicById(id: FreeplayRelicId): FreeplayRelic {
  return FREEPLAY_RELICS.find((r) => r.id === id) ?? FREEPLAY_RELICS[0];
}

export function mutatorById(id: FreeplayMutatorId): FreeplayMutator {
  return FREEPLAY_MUTATORS.find((m) => m.id === id) ?? FREEPLAY_MUTATORS[0];
}

export function riskById(id: RiskWaveId): RiskWaveOffer {
  return RISK_WAVES.find((r) => r.id === id) ?? RISK_WAVES[0];
}

export function relicOffer(wave: number, owned: FreeplayRelic[], daily: DailyFreeplaySeed | null): FreeplayRelic[] {
  const pool = (daily?.relicIds.map(relicById) ?? FREEPLAY_RELICS).filter((r) => !owned.some((o) => o.id === r.id));
  if (pool.length <= 3) return pool;
  return pickMany(pool, wave * 97 + owned.length * 31 + (daily ? hash(daily.id) : 0), 3);
}

export function nextMutators(wave: number, relics: FreeplayRelic[], daily: DailyFreeplaySeed | null, risk?: RiskWaveOffer | null): FreeplayMutator[] {
  const ids = new Set<FreeplayMutatorId>();
  const over = Math.max(0, wave - 60);
  const count = wave < 60 ? 0 : wave < 70 ? 1 : wave < 90 ? 2 : 3;
  const bias = daily?.mutatorBias ?? [];
  for (let i = 0; i < count; i++) {
    const pool = i < bias.length ? bias.map(mutatorById) : FREEPLAY_MUTATORS;
    ids.add(pickOne(pool, wave * 41 + i * 17 + over * 3).id);
  }
  if (relics.some((r) => r.id === 'sensorCrown')) ids.add('cloakSurge');
  if (relics.some((r) => r.id === 'stormCapacitors')) ids.add('armoredSwarm');
  for (const id of risk?.mutatorIds ?? []) ids.add(id);
  return [...ids].map(mutatorById);
}

export function rivalForWave(wave: number, daily: DailyFreeplaySeed | null): FreeplayRival | null {
  if (wave < 70 || wave % 10 !== 0) return null;
  const rivals = daily?.rivalIds.map((id) => FREEPLAY_RIVALS.find((r) => r.id === id)!).filter(Boolean) ?? FREEPLAY_RIVALS;
  return rivals[Math.floor((wave - 70) / 10) % rivals.length] ?? null;
}

export function riskOfferForWave(wave: number, daily: DailyFreeplaySeed | null): RiskWaveOffer | null {
  if (wave < 62 || wave % 4 !== 2) return null;
  return pickOne(RISK_WAVES, wave * 53 + (daily ? hash(daily.id) : 0));
}

export function freeplayIncomeMult(wave: number, relics: FreeplayRelic[], mutators: FreeplayMutator[]): number {
  let mult = 1;
  if (wave > 60) mult *= Math.max(0.42, 1 - (wave - 60) * 0.018);
  if (relics.some((r) => r.id === 'emberDoctrine')) mult *= 0.88;
  if (relics.some((r) => r.id === 'salvageTax')) mult *= 0.86;
  if (mutators.some((m) => m.id === 'creditDrought')) mult *= 0.7;
  return mult;
}

export function freeplayWaveBonusMult(wave: number): number {
  return wave <= 60 ? 1 : Math.max(0.35, 1 - (wave - 60) * 0.025);
}

export function applyMutatorsToWave(wave: number, base: WaveGroup[], mutators: FreeplayMutator[], rival: FreeplayRival | null, risk: RiskWaveOffer | null): WaveGroup[] {
  const groups = base.map((g) => ({ ...g }));
  const add = (type: string, count: number, gap: number, delay = 0, cloaked = false) => groups.push({ type, count, gap, delay, cloaked });
  const scale = Math.max(1, Math.floor((wave - 55) / 10));
  for (const m of mutators) {
    if (m.id === 'cloakSurge') {
      groups.forEach((g, i) => { if (i % 2 === 0) g.cloaked = true; });
      add('wraith', 8 + scale * 3, 0.38, 0.4, true);
    } else if (m.id === 'healerConvoy') {
      add('seraph', 2 + scale, 1.7, 0.7);
    } else if (m.id === 'armoredSwarm') {
      add('aegis', 6 + scale * 3, 0.55, 0.3);
      add('juggernaut', 4 + scale, 0.75, 1);
    } else if (m.id === 'speedSurge') {
      add('stinger', 18 + scale * 6, 0.18, 0.2);
      add('chrono', 10 + scale * 3, 0.35, 0.6);
    } else if (m.id === 'shieldedBoss') {
      add(wave >= 70 ? 'mirror' : 'titan', 1 + Math.floor(scale / 2), 2.4, 1.2);
    } else if (m.id === 'splitPressure') {
      groups.forEach((g) => { g.delay = Math.max(0, (g.delay ?? 0) * 0.45); });
      add('vortex', 10 + scale * 4, 0.35, 0.4);
    } else if (m.id === 'sensorBlackout') {
      add('phantom', 10 + scale * 3, 0.33, 0.5, true);
    }
  }
  if (rival) {
    const rivalType = rival.id === 'blackbox' ? 'mirror' : rival.id === 'redSaint' ? 'leviathan' : rival.id === 'orrery' ? 'umbra' : 'leviathan';
    add(rivalType, 1, 1, 0.2, rival.id === 'vesper');
    if (rival.id === 'vesper') add('phantom', 14 + scale * 2, 0.25, 0.6, true);
    if (rival.id === 'orrery') add('titan', 3 + scale, 1.4, 1);
    if (rival.id === 'blackbox') add('chrono', 14 + scale * 3, 0.3, 0.7);
    if (rival.id === 'redSaint') add('seraph', 4 + scale, 1.2, 1);
  }
  if (risk?.id === 'bounty') add('leviathan', 1, 1, 0.4);
  return groups;
}

export function freeplaySummary(state: FreeplayState): string {
  const parts = [
    state.contract?.short,
    ...state.relics.map((r) => r.name),
    state.daily ? 'DAILY' : '',
  ].filter(Boolean);
  return parts.slice(0, 8).join(' / ');
}

export function freeplayScoreMultiplier(state: FreeplayState): number {
  const relicMult = state.relics.reduce((m, r) => m * r.scoreMult, 1);
  const mutatorMult = state.currentMutators.reduce((m, r) => m * r.scoreMult, 1);
  return roundMult((state.contract?.multiplier ?? 1) * relicMult * mutatorMult * state.scoreMult * (state.daily ? 1.15 : 1));
}

function pickOne<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

function pickMany<T>(items: T[], seed: number, count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  let s = seed;
  while (pool.length && out.length < count) {
    s = Math.imul(s ^ 0x9e3779b9, 1664525) + 1013904223;
    out.push(pool.splice(Math.abs(s) % pool.length, 1)[0]);
  }
  return out;
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function roundMult(n: number): number {
  return Math.round(n * 100) / 100;
}
