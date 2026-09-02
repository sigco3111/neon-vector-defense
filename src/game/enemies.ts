import type { EnemyDef } from './types';

// Layered enemy hierarchy, BTD-style: destroying one spawns its children.
// The Vex Combine — a self-replicating machine collective from the galactic rim.
const defs: EnemyDef[] = [
  {
    id: 'scout', name: '정찰 드론', hp: 1, speed: 60, radius: 9, reward: 2,
    color: '#ff4757', glow: '#ff6b81', children: [], shape: 'tri',
    lore: '일회용 정찰 프레임. 합동군은 사이클당 백만 대씩 찍어내며 하나도 아까워하지 않는다.',
  },
  {
    id: 'raider', name: '습격 드론', hp: 1, speed: 84, radius: 10, reward: 3,
    color: '#3d8bfd', glow: '#74b3ff', children: ['scout'], shape: 'tri',
    lore: '회수한 함선 장갑판으로 감싼 정찰기. 파괴되면 장갑 껍질을 벗어 던진다 — 안의 정찰기는 계속 온다.',
  },
  {
    id: 'stinger', name: '스팅어', hp: 1, speed: 108, radius: 10, reward: 4,
    color: '#2ed573', glow: '#7bed9f', children: ['raider'], shape: 'diamond',
    lore: '쌍날 인터셉터 섀시. 함선 피격 시 그 휘파람은 많은 정거장이 듣는 마지막 소리다.',
  },
  {
    id: 'phantom', name: '팬텀', hp: 1, speed: 190, radius: 10, reward: 5,
    color: '#ffd32a', glow: '#fff200', children: ['stinger'], shape: 'diamond',
    lore: '순수한 속도를 위해 자신의 보호막까지 벗어버린다. 망설이는 워든은 두 번째 기회를 얻지 못한다.',
  },
  {
    id: 'wraith', name: '레이스', hp: 1, speed: 210, radius: 11, reward: 6,
    color: '#ff6ec7', glow: '#ffa7dd', children: ['phantom'], shape: 'ship',
    lore: '칼날 같은 봉쇄선. 조준 컴퓨터를 따돌리도록 설계되었다 — 대부분의 경우, 실제로 그렇게 한다.',
  },
  {
    id: 'shade', name: '셰이드', hp: 2, speed: 110, radius: 12, reward: 8,
    color: '#57606f', glow: '#a4b0be', children: ['wraith', 'wraith'],
    immuneExplosive: true, shape: 'hex',
    lore: '반응성 ablative 격자가 폭발파를 통째로 삼킨다. 폭발은 위협이 아니라 기부다.',
  },
  {
    id: 'prism', name: '프리즘', hp: 2, speed: 120, radius: 12, reward: 8,
    color: '#f1f2f6', glow: '#ffffff', children: ['wraith', 'wraith'],
    immuneCryo: true, resist: { energy: 0.5 }, shape: 'hex',
    lore: '거울 같은 다면체 열 함선. 크라이오 플라즈마는 다이아몬드를 비춘 빛처럼 굴절되고, 에너지 빔은 다면에서 절반 기운 채 흩어진다.',
  },
  {
    id: 'aegis', name: '이지스 헐', hp: 3, speed: 55, radius: 13, reward: 10,
    color: '#8395a7', glow: '#c8d6e5', children: ['shade', 'shade'],
    armored: true, shape: 'pent',
    lore: '붕괴한 별의 합금으로 주조. 운동에너지탄은 빗방울처럼 튀어오른다. 에너지, 폭발, 또는 AP 슬러그를 가져오라.',
  },
  {
    id: 'chrono', name: '크로노 허스크', hp: 2, speed: 130, radius: 12, reward: 10,
    color: '#9c88ff', glow: '#c8b6ff', children: ['shade', 'prism'],
    immuneExplosive: true, immuneCryo: true, shape: 'hex',
    lore: '수 밀리초 어긋난 위상으로 건너뛴다. 폭발과 크라이오는 그것이 더 이상 존재하지 않는 순간에 도달한다.',
  },
  {
    id: 'vortex', name: '볼텍스 프레임', hp: 3, speed: 125, radius: 13, reward: 14,
    color: '#00d2d3', glow: '#7efff5', children: ['chrono', 'chrono'], shape: 'pent',
    lore: '전선에 크로노 허스크 둘을 끌고 가는 중력 코일 회전 cage. 합동군은 낭비하지 않는다.',
  },
  {
    id: 'juggernaut', name: '저거넛 셸', hp: 14, speed: 95, radius: 15, reward: 24,
    color: '#cd6133', glow: '#ffa502', children: ['vortex', 'vortex'], shape: 'pent',
    lore: '세라믹-복합체 포위 캐러페이스. 깨뜨리면 안에 든 탑재물이 다시 깨지며 되갚는다.',
  },
  {
    id: 'seraph', name: '세라프 텐더', hp: 5, speed: 72, radius: 14, reward: 18,
    color: '#7bed9f', glow: '#baffd0', children: ['chrono', 'chrono'],
    heal: { radius: 95, hps: 4 }, shape: 'hex',
    lore: '이동하며 수행하는 수리 텐더. 같은 프레임을 만 번 수리했다. 합동군은 죽음을 이해하지 못한다. 단지 미뤄진 유지보수만 이해한다.',
  },
  {
    id: 'titan', name: '타이탄 캐리어', hp: 240, speed: 38, radius: 26, reward: 150,
    color: '#e84118', glow: '#ff7f50', children: ['juggernaut', 'juggernaut', 'juggernaut', 'juggernaut'],
    boss: true, shape: 'capital',
    lore: '도시 블록 크기의 이동식 주조소. 저거넛 격납고 4개, 모두 장전 완료. 4호 중계기는 단 한 척의 타이탄에 함락되었다.',
  },
  {
    id: 'leviathan', name: '리바이어던 드레드노트', hp: 900, speed: 26, radius: 36, reward: 500,
    color: '#6c2eb9', glow: '#b388ff', children: ['titan', 'titan', 'titan', 'titan'],
    boss: true, shape: 'capital',
    lore: '요새화된 섹터에 대한 합동군의 대답: 섹터를 지워버려라. 발사 cradle에 타이탄 4척을 싣고 있다. 1호부터 3호 중계기는 더 이상 존재하지 않는다.',
  },
  {
    id: 'mirror', name: '미러 헐', hp: 760, speed: 28, radius: 34, reward: 440,
    color: '#d8e7ff', glow: '#80ffd8', children: ['titan', 'titan'],
    boss: true, shape: 'capital',
    lore: '출격 시 당신의 피해 대장을 읽고, 가장 흔한 피해 유형에 스스로 장갑을 두르는 사령부 기함. 그리드를 다양화하거나, Exposed로 깨거나, Recalibrate를 발사해 복제된 답이 관이 되기 전에.',
  },

  // ---- THE HOLLOW: the hunger that followed the Combine home. It does not deliver,
  // it does not queue — it eats light. Bleeds through in the deepest sieges and freeplay.
  {
    id: 'wisp', name: '홀로우 윕스', hp: 2, speed: 142, radius: 9, reward: 6,
    color: '#2c2046', glow: '#b388ff', children: [], shape: 'tri',
    immuneCryo: true,
    lore: '빛이 아닌 것의 파편 — 빠르고 굶주렸다. 한 번도 따뜻했던 적 없는 것은 차가울 수도 없다.',
  },
  {
    id: 'gorge', name: '홀로우 고지', hp: 9, speed: 72, radius: 13, reward: 16,
    color: '#231634', glow: '#9b6dff', children: ['wisp', 'wisp'], shape: 'hex',
    armored: true, immuneExplosive: true,
    lore: '빛이 그것 주위를 휘고 돌아오지 않는다. 운동탄은 눕고, 폭발은 그저 멈춘다. 에너지를 가져오거나, 아무것도 가져오지 말지어다.',
  },
  {
    id: 'lampblack', name: '램프블랙 텐더', hp: 7, speed: 64, radius: 14, reward: 20,
    color: '#1a1230', glow: '#7d5fff', children: ['gorge'], shape: 'hex',
    heal: { radius: 110, hps: 7 }, immuneCryo: true,
    lore: '상처를 일어나지 않게 함으로써 친척들을 고친다. 그것이 수행하는 곳에서는 피해가 가해진 적 있다는 사실조차 잊혀진다.',
  },
  {
    id: 'umbra', name: '움브라', hp: 1400, speed: 22, radius: 40, reward: 850,
    color: '#0a0614', glow: '#b388ff', children: ['titan', 'titan'],
    boss: true, armored: true, immuneExplosive: true, resist: { energy: 0.5 }, shape: 'capital',
    lore: '합동군이 3세기 동안 막아온 것. 그것이 지나가는 곳에서는 등대도 한 번 빛났다는 사실을 잊는다. 배달하지 않는다. 대기열에 서지도 않는다. 빛을 — 에너지 빔까지 포함해 — 먹어치우고, 그런 다음 어둠을 먹기 시작한다.',
  },
];

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(defs.map((d) => [d.id, d]));

/** Ordered roster (encounter order) for the Bestiary codex. */
export const ENEMY_LIST: EnemyDef[] = defs;

/** Total layered enemy count (lives lost on leak), computed recursively. */
export function rbe(id: string): number {
  const d = ENEMIES[id];
  return 1 + d.children.reduce((n, c) => n + rbe(c), 0);
}
