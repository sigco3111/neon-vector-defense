import type { DifficultyDef, GameMap } from './types';
import { standardMapTheme } from './mapThemes';

// All coordinates in a 1280x720 logical space.
export const MAPS: GameMap[] = [
  {
    id: 'orbital',
    name: '궤도 중계기',
    desc: '중계 코어 주변을 도는 길고 구불구불한 보급 회랑. 건설할 공간이 넉넉하다.',
    difficulty: 'Easy',
    pathWidth: 46,
    path: [
      { x: -40, y: 140 }, { x: 320, y: 140 }, { x: 320, y: 360 }, { x: 130, y: 360 },
      { x: 130, y: 580 }, { x: 620, y: 580 }, { x: 620, y: 130 }, { x: 950, y: 130 },
      { x: 950, y: 430 }, { x: 790, y: 430 }, { x: 790, y: 640 }, { x: 1160, y: 640 },
      { x: 1160, y: 300 }, { x: 1320, y: 300 },
    ],
    blockers: [{ x: 640, y: 360, r: 0 }],
    theme: standardMapTheme('orbital'),
  },
  {
    id: 'reactor',
    name: '쌍둥이 원자로',
    desc: '두 개의 원자로 코어가 회랑을 좁은 초크포인트로 압축한다. 간격에 주의하라.',
    difficulty: 'Medium',
    pathWidth: 44,
    path: [
      { x: 640, y: -40 }, { x: 640, y: 150 }, { x: 250, y: 150 }, { x: 250, y: 420 },
      { x: 540, y: 420 }, { x: 540, y: 250 }, { x: 1030, y: 250 }, { x: 1030, y: 520 },
      { x: 740, y: 520 }, { x: 740, y: 660 }, { x: 320, y: 660 }, { x: 320, y: 560 },
      { x: 120, y: 560 }, { x: 120, y: 760 },
    ],
    blockers: [
      { x: 395, y: 285, r: 58 },
      { x: 885, y: 385, r: 58 },
    ],
    theme: standardMapTheme('reactor'),
  },
  {
    id: 'hyperlane',
    name: '하이퍼레인 분기점',
    desc: '짧고 거친 교차 회랑. 적이 거의 즉시 위에 닥친다.',
    difficulty: 'Hard',
    pathWidth: 42,
    path: [
      { x: -40, y: 600 }, { x: 420, y: 600 }, { x: 420, y: 180 }, { x: 860, y: 180 },
      { x: 860, y: 600 }, { x: 640, y: 600 }, { x: 640, y: 90 }, { x: 1100, y: 90 },
      { x: 1100, y: 480 }, { x: 1320, y: 480 },
    ],
    blockers: [
      { x: 200, y: 250, r: 80 },
      { x: 1080, y: 650, r: 70 },
    ],
    theme: standardMapTheme('hyperlane'),
  },
];

export const MAPS2: GameMap[] = [
  {
    id: 'carousel',
    name: '회전목마',
    desc: '천천히 안쪽으로 소용돌이치는 외곽 순찰 경로. 긴 접근 구간 덕분에 사령관들이 숨 돌릴 시간이 있다.',
    difficulty: 'Easy',
    pathWidth: 48,
    music: 'orbital',
    path: [
      { x: -40, y: 95 }, { x: 1180, y: 95 }, { x: 1180, y: 625 }, { x: 100, y: 625 },
      { x: 100, y: 165 }, { x: 1040, y: 165 }, { x: 1040, y: 555 }, { x: 240, y: 555 },
      { x: 240, y: 260 }, { x: 900, y: 260 }, { x: 900, y: 460 }, { x: 460, y: 460 },
      { x: 460, y: 760 },
    ],
    blockers: [],
    theme: standardMapTheme('carousel'),
  },
  {
    id: 'mobius',
    name: '뫼비우스 표류',
    desc: '자기 자신을 향해 접히는 구불구불한 causeway. 타워가 여러 통과 지점을 덮지만 — 캐리어급이 그 모든 곳을 두드린다.',
    difficulty: 'Medium',
    pathWidth: 42,
    music: 'orbital',
    path: [
      { x: -40, y: 95 }, { x: 1110, y: 95 }, { x: 1110, y: 240 }, { x: 170, y: 240 },
      { x: 170, y: 385 }, { x: 1110, y: 385 }, { x: 1110, y: 530 }, { x: 170, y: 530 },
      { x: 170, y: 660 }, { x: 660, y: 660 }, { x: 660, y: 770 },
    ],
    blockers: [],
    theme: standardMapTheme('mobius'),
  },
  {
    id: 'blackout',
    name: '정전 구역',
    desc: '죽은 섹터. 세 개의 비콘 원 바깥에서는 타워 사거리가 35% 감소한다. 빛 안에서 건설하라.',
    difficulty: 'Hard',
    pathWidth: 44,
    music: 'reactor',
    path: [
      { x: -40, y: 360 }, { x: 250, y: 360 }, { x: 250, y: 130 }, { x: 640, y: 130 },
      { x: 640, y: 580 }, { x: 1010, y: 580 }, { x: 1010, y: 300 }, { x: 1320, y: 300 },
    ],
    blockers: [],
    zones: [
      { x: 250, y: 250, r: 150 },
      { x: 640, y: 360, r: 160 },
      { x: 1010, y: 440, r: 150 },
    ],
    theme: standardMapTheme('blackout'),
  },
  {
    id: 'splice',
    name: '스플라이스 분기점',
    desc: '같은 중앙 초크를 통과하는 꼬인 서비스 회랑. 경로가 다시 접힐 때까지는 커버리지가 넉넉해 보인다.',
    difficulty: 'Medium',
    pathWidth: 42,
    music: 'reactor',
    path: [
      { x: -40, y: 250 }, { x: 270, y: 250 }, { x: 520, y: 360 }, { x: 270, y: 470 },
      { x: 650, y: 470 }, { x: 520, y: 360 }, { x: 650, y: 250 }, { x: 1010, y: 250 },
      { x: 760, y: 360 }, { x: 1010, y: 470 }, { x: 1320, y: 470 },
    ],
    // r=24 fits the braid diamonds: their diagonals pass ~50px from center,
    // so anything bigger intrudes into the 42-wide lane
    blockers: [
      { x: 395, y: 360, r: 24 },
      { x: 885, y: 360, r: 24 },
    ],
    theme: standardMapTheme('splice'),
  },
  {
    id: 'mirror',
    name: '거울 어레이',
    desc: '중계 거울을 통과하는 회전 대칭의 이중-S. 장애물은 적지만 모든 타워 각도가 어색하다.',
    difficulty: 'Medium',
    pathWidth: 42,
    music: 'orbital',
    path: [
      { x: -40, y: 180 }, { x: 180, y: 180 }, { x: 180, y: 540 }, { x: 420, y: 540 },
      { x: 420, y: 180 }, { x: 640, y: 180 }, { x: 640, y: 540 }, { x: 860, y: 540 },
      { x: 860, y: 180 }, { x: 1100, y: 180 }, { x: 1100, y: 540 }, { x: 1320, y: 540 },
    ],
    blockers: [
      { x: 320, y: 360, r: 44 },
      { x: 960, y: 360, r: 44 },
    ],
    theme: standardMapTheme('mirror'),
  },
  {
    id: 'throat',
    name: '목구멍',
    desc: '잔해가 섹터를 하나의 꽉 조인 더블백으로 막아버렸다. 킬 박스의 천국 — 캐리어가 걸어 들어올 때까지는.',
    difficulty: 'Hard',
    pathWidth: 40,
    music: 'hyperlane',
    path: [
      { x: -40, y: 200 }, { x: 540, y: 200 }, { x: 540, y: 330 }, { x: 280, y: 330 },
      { x: 280, y: 460 }, { x: 540, y: 460 }, { x: 540, y: 590 }, { x: 900, y: 590 },
      { x: 900, y: 200 }, { x: 1100, y: 200 }, { x: 1100, y: 460 }, { x: 1320, y: 460 },
    ],
    blockers: [
      { x: 160, y: 600, r: 110 },
      { x: 1150, y: 80, r: 90 },
      { x: 80, y: 80, r: 90 },
      { x: 760, y: 350, r: 70 },
    ],
    theme: standardMapTheme('throat'),
  },
];

// THE HOLLOW sectors — the dark past the Combine's old line.
export const MAPS3: GameMap[] = [
  {
    id: 'foundry',
    name: '주조장 바닥',
    desc: '용광로 벽이 나누는 산업용 지그재그. 회랑은 읽을 수 있지만 건설 그리드는 읽을 수 없다.',
    difficulty: 'Hard',
    pathWidth: 36,
    music: 'hyperlane',
    path: [
      { x: -40, y: 130 }, { x: 1000, y: 130 }, { x: 1000, y: 260 }, { x: 250, y: 260 },
      { x: 250, y: 390 }, { x: 1050, y: 390 }, { x: 1050, y: 520 }, { x: 300, y: 520 },
      { x: 300, y: 650 }, { x: 1320, y: 650 },
    ],
    // r=36 keeps 11px of clearance to the 36-wide lanes; the four relocated
    // walls used to sit on the vertical connector segments (x=250/300/1000/1050).
    blockers: [
      { x: 230, y: 195, r: 36 }, { x: 390, y: 195, r: 36 }, { x: 550, y: 195, r: 36 },
      { x: 710, y: 195, r: 36 }, { x: 870, y: 195, r: 36 }, { x: 1130, y: 195, r: 36 },
      { x: 150, y: 325, r: 36 }, { x: 390, y: 325, r: 36 }, { x: 550, y: 325, r: 36 },
      { x: 710, y: 325, r: 36 }, { x: 870, y: 325, r: 36 }, { x: 1030, y: 325, r: 36 },
      { x: 230, y: 455, r: 36 }, { x: 390, y: 455, r: 36 }, { x: 550, y: 455, r: 36 },
      { x: 710, y: 455, r: 36 }, { x: 870, y: 455, r: 36 }, { x: 1150, y: 455, r: 36 },
      { x: 390, y: 585, r: 36 }, { x: 500, y: 585, r: 36 }, { x: 640, y: 585, r: 36 },
      { x: 780, y: 585, r: 36 }, { x: 940, y: 585, r: 36 }, { x: 1100, y: 585, r: 36 },
    ],
    theme: standardMapTheme('foundry'),
  },
  {
    id: 'umbral',
    name: '움브랄 구역',
    desc: '홀로우가 이미 먹기 시작한 죽은 회랑. 세 빛의 웅덩이 바깥에서는 타워가 35% 사거리를 잃는다 — 어둠이 빔을 마신다.',
    difficulty: 'Hard',
    pathWidth: 44,
    music: 'reactor',
    path: [
      { x: -40, y: 130 }, { x: 300, y: 130 }, { x: 300, y: 500 }, { x: 600, y: 500 },
      { x: 600, y: 160 }, { x: 940, y: 160 }, { x: 940, y: 540 }, { x: 1320, y: 540 },
    ],
    blockers: [],
    zones: [
      { x: 300, y: 315, r: 150 },
      { x: 600, y: 330, r: 150 },
      { x: 940, y: 350, r: 150 },
    ],
    theme: standardMapTheme('umbral'),
  },
  {
    id: 'cinder',
    name: '신더 원인',
    desc: '탄화된 중계 struts로 막힌 잔해 더블백. 킬 박스의 천국 — 움브라가 회랑을 걸으면, 킬 박스는 관이 된다.',
    difficulty: 'Hard',
    pathWidth: 42,
    music: 'hyperlane',
    path: [
      { x: 640, y: -40 }, { x: 640, y: 170 }, { x: 240, y: 170 }, { x: 240, y: 470 },
      { x: 560, y: 470 }, { x: 560, y: 300 }, { x: 900, y: 300 }, { x: 900, y: 560 },
      { x: 1120, y: 560 }, { x: 1120, y: 200 }, { x: 1320, y: 200 },
    ],
    blockers: [
      { x: 400, y: 320, r: 70 },
      { x: 760, y: 410, r: 62 },
      { x: 1010, y: 120, r: 58 },
    ],
    theme: standardMapTheme('cinder'),
  },
];

// THE FRACTURE sectors — four hostile approaches beyond the old Hollow line.
// Each route enters from a different edge so the closing atlas leg tests every
// ingress orientation instead of repeating the campaign's usual west approach.
export const MAPS4: GameMap[] = [
  {
    id: 'crossfeed',
    name: '크로스피드 게이트',
    desc: '북쪽과 서쪽 접근 지오메트리가 공유 중계 목구멍을 통과해 접힌다. 가로지르는 긴 시야선 뒤에 사악한 마지막 턴이 숨어 있다.',
    difficulty: 'Hard',
    pathWidth: 40,
    music: 'reactor',
    path: [
      { x: 360, y: -40 }, { x: 360, y: 150 }, { x: 110, y: 150 }, { x: 110, y: 360 },
      { x: 560, y: 360 }, { x: 560, y: 110 }, { x: 850, y: 110 }, { x: 850, y: 560 },
      { x: 1080, y: 560 }, { x: 1080, y: 300 }, { x: 1320, y: 300 },
    ],
    blockers: [
      { x: 240, y: 270, r: 48 },
      { x: 710, y: 260, r: 56 },
      { x: 970, y: 430, r: 44 },
    ],
    theme: { bg1: '#071517', bg2: '#0b3032', path: '#104044', pathEdge: '#44f0dd' },
  },
  {
    id: 'needleglass',
    name: '바늘유리 경주로',
    desc: '날카롭게 얇은 동향 필라멘트가 넉넉한 건설 공간을 남겨두지만, 커버 공백에 대한 거의 용서가 없다.',
    difficulty: 'Hard',
    pathWidth: 28,
    music: 'orbital',
    path: [
      { x: -40, y: 610 }, { x: 180, y: 610 }, { x: 180, y: 420 }, { x: 470, y: 420 },
      { x: 470, y: 650 }, { x: 720, y: 650 }, { x: 720, y: 230 }, { x: 1010, y: 230 },
      { x: 1010, y: 500 }, { x: 1180, y: 500 }, { x: 1180, y: 160 }, { x: 1320, y: 160 },
    ],
    blockers: [
      { x: 330, y: 535, r: 46 },
      { x: 595, y: 535, r: 46 },
      { x: 865, y: 365, r: 46 },
      { x: 1100, y: 340, r: 42 },
    ],
    theme: { bg1: '#100816', bg2: '#26102f', path: '#35153f', pathEdge: '#f06dff' },
  },
  {
    id: 'bastion',
    name: '요새 격자',
    desc: '남쪽 진입 포위 회랑이 방어 묘지를 가로지른다. 빽빽한 요새들은 모든 타워 집단을 약속으로 만든다.',
    difficulty: 'Hard',
    pathWidth: 34,
    music: 'hyperlane',
    path: [
      { x: 210, y: 760 }, { x: 210, y: 610 }, { x: 480, y: 610 }, { x: 480, y: 430 },
      { x: 170, y: 430 }, { x: 170, y: 210 }, { x: 680, y: 210 }, { x: 680, y: 500 },
      { x: 1010, y: 500 }, { x: 1010, y: 170 }, { x: 1190, y: 170 }, { x: 1190, y: 360 },
      { x: 1320, y: 360 },
    ],
    blockers: [
      { x: 80, y: 90, r: 42 }, { x: 220, y: 90, r: 42 }, { x: 360, y: 90, r: 42 },
      { x: 500, y: 90, r: 42 }, { x: 640, y: 90, r: 42 }, { x: 780, y: 90, r: 42 },
      { x: 920, y: 90, r: 42 }, { x: 1060, y: 70, r: 38 }, { x: 1210, y: 70, r: 38 },
      { x: 330, y: 320, r: 40 }, { x: 510, y: 320, r: 40 }, { x: 820, y: 320, r: 40 },
      { x: 900, y: 630, r: 42 }, { x: 1060, y: 630, r: 42 }, { x: 1220, y: 630, r: 42 },
      { x: 80, y: 570, r: 40 }, { x: 600, y: 630, r: 40 }, { x: 740, y: 630, r: 40 },
    ],
    theme: { bg1: '#171006', bg2: '#34230a', path: '#46300e', pathEdge: '#ffd15a' },
  },
  {
    id: 'eventide',
    name: '저녁 왕관',
    desc: '오른쪽 진입 대관 나선이 죽은 별을 둘러싼다. 비콘 빛은 넓은 커버리지에 보상하고, 경로는 코어 주변을 꾸준히 좁혀간다.',
    difficulty: 'Hard',
    pathWidth: 38,
    music: 'reactor',
    path: [
      { x: 1320, y: 100 }, { x: 1120, y: 100 }, { x: 1120, y: 620 }, { x: 150, y: 620 },
      { x: 150, y: 170 }, { x: 950, y: 170 }, { x: 950, y: 500 }, { x: 340, y: 500 },
      { x: 340, y: 290 }, { x: 770, y: 290 }, { x: 770, y: 410 }, { x: 560, y: 410 },
      { x: 560, y: -40 },
    ],
    blockers: [
      { x: 640, y: 350, r: 36 },
      { x: 1050, y: 370, r: 46 },
      { x: 245, y: 395, r: 44 },
    ],
    zones: [
      { x: 150, y: 395, r: 145 },
      { x: 640, y: 350, r: 165 },
      { x: 1080, y: 350, r: 145 },
    ],
    theme: { bg1: '#060912', bg2: '#10162b', path: '#171f3d', pathEdge: '#ff527b' },
  },
];

export const ALL_MAPS = [
  MAPS[0],      // Orbital Relay
  MAPS2[0],     // The Carousel
  MAPS[1],      // Twin Reactor
  MAPS2[3],     // Splice Junction
  MAPS2[1],     // Mobius Drift
  MAPS2[4],     // Mirror Array
  MAPS[2],      // Hyperlane Junction
  MAPS2[2],     // Blackout Reach
  MAPS2[5],     // The Throat
  MAPS3[0],     // Foundry Floor
  MAPS3[1],     // Umbral Reach
  MAPS3[2],     // Cinder Causeway
  MAPS4[0],     // Crossfeed Gate
  MAPS4[1],     // Needleglass Run
  MAPS4[2],     // Bastion Lattice
  MAPS4[3],     // Eventide Crown
];

export const DIFFICULTIES: DifficultyDef[] = [
  { id: 'easy', name: '신규', lives: 200, cash: 900, costMult: 0.85, hpMult: 0.9, lateScale: 0.28, waves: 50, desc: '코어 200 · 저렴한 타워 · 위상 은신 없음 · 50 웨이브' },
  { id: 'normal', name: '베테랑', lives: 120, cash: 700, costMult: 1.0, hpMult: 1.4, lateScale: 0.33, waves: 60, desc: '코어 120 · 적응형 함대 · 60 웨이브' },
  { id: 'hard', name: '정점', lives: 80, cash: 700, costMult: 1.2, hpMult: 1.8, lateScale: 0.38, waves: 70, desc: '코어 80 · 강화된 적응 함선 · 가속 포위 · 70 웨이브' },
  { id: 'extinction', name: '말멸', lives: 70, cash: 950, costMult: 1.2, hpMult: 1.95, lateScale: 0.43, waves: 80, desc: '코어 70 · 끊임없는 함대 · 가혹한 적응형 가속 · 80 웨이브' },
];

/** Total length of a polyline path. */
export function pathLength(path: { x: number; y: number }[]): number {
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    len += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  }
  return len;
}
