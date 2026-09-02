import type { TowerDef, TowerStats, UpgradeDef, UpgradeTrack } from './types';
import { getBalance } from './balanceConfig';

function base(partial: Partial<TowerStats>): TowerStats {
  return {
    range: 100, fireRate: 1, damage: 1, damageType: 'kinetic', pierce: 1,
    projectileSpeed: 520, splash: 0, count: 1, detection: false,
    slowPower: 0, slowDuration: 0, burnDps: 0, burnDuration: 0,
    burnZoneRadius: 0, burnZoneDps: 0, burnZoneDuration: 0, droneSwarm: 0,
    chain: 0, buffRate: 0, buffRange: 0, shred: false, drag: 0, execute: 0,
    ...partial,
  };
}

function u(name: string, desc: string, cost: number, apply: (s: TowerStats) => void): UpgradeDef {
  return { name, desc, cost, apply };
}

function track(name: string, upgrades: UpgradeDef[]): UpgradeTrack {
  return { name, upgrades };
}

// Tiers 1-4 are always buyable on both tracks; tiers 5-6 (BONUS) require committing the tower to that track.
// NOTE: unlockAt is part of the versioned replay surface — re-simulation derives
// mid-run unlock availability from this ladder (reSimulate.ts setupReplayGame),
// so bump REPLAY_ENGINE_VERSION whenever any unlockAt value changes.
export const TOWERS: TowerDef[] = [
  {
    id: 'pulse', name: '펄스 터렛', short: 'PLS', cost: 170, unlockAt: 0,
    desc: '저렴하고 안정적인 볼트 터렛. 한 경로는 에너지 레인 관통기가 되고, 다른 경로는 근거리 산탄이 된다.',
    lore: '첫 번째 침공 이래 표준 보급품. 모든 워든의 첫 번째 친구.',
    color: '#4bcffa', glow: '#8be9ff', style: 'bolt',
    base: base({ range: 110, fireRate: 1.4, damage: 1 }),
    tracks: [
      track('태양 창', [
        u('장거리 광학', '+35% 사거리.', 100, (s) => { s.range *= 1.35; }),
        u('쌍둥이 방출기', '한 발사당 두 발의 볼트.', 185, (s) => { s.count = 2; }),
        u('관통 격자', '에너지 볼트가 4명을 관통한다.', 260, (s) => { s.pierce = 4; s.damageType = 'energy'; }),
        u('과충전 코어', '2배 피해, +40% 발사 속도, 에너지 볼트.', 520, (s) => { s.damage *= 2; s.fireRate *= 1.4; s.damageType = 'energy'; }),
        u('헬리오스 어레이', '보너스: 세 발의 볼트, 2배 피해.', 1400, (s) => { s.count = 3; s.damage *= 2; }),
        u('여명의 총', '보너스: 회랑 전체를 관통하는 여명의 광선 — 모든 함선을 관통하고, 3배 피해.', 3200, (s) => { s.damage *= 3; s.pierce = 999; s.fireRate *= 1.4; s.projectileSpeed = 1400; }),
      ]),
      track('불릿 스톰', [
        u('자이로 로더', '+30% 발사 속도.', 90, (s) => { s.fireRate *= 1.3; }),
        u('근접 폭발', '짧은 사거리, 작은 폭발 범위.', 210, (s) => { s.splash = 24; s.range *= 0.9; s.damageType = 'explosive'; }),
        u('자동 주조소', '+1 피해.', 300, (s) => { s.damage += 1; }),
        u('사이클론 드라이브', '+80% 발사 속도.', 640, (s) => { s.fireRate *= 1.8; }),
        u('불릿 허리케인', '보너스: 네 발의 볼트, +50% 발사 속도.', 1500, (s) => { s.count = 4; s.fireRate *= 1.5; }),
        u('특이점 폭풍', '보너스: +3 피해, 관통 6, +60% 발사 속도. 공기 자체가 산탄이 된다.', 3400, (s) => { s.damage += 3; s.pierce = 6; s.fireRate *= 1.6; }),
      ]),
    ],
  },
  {
    id: 'tesla', name: '테슬라 코일', short: 'TSL', cost: 280, unlockAt: 500,
    desc: '모든 방향으로 전기 아크를 방출한다. 초크포인트에서 압도적인 위력.',
    lore: '격추된 벡스 폭풍 수확기에서 역설계. 적이 접근하면 윙윙거린다.',
    color: '#feca57', glow: '#fff3a0', style: 'arc',
    base: base({ range: 80, fireRate: 1.1, damage: 1, count: 8, damageType: 'energy', projectileSpeed: 800 }),
    tracks: [
      track('고전압', [
        u('축전기 뱅크', '+30% 아크 사거리.', 120, (s) => { s.range *= 1.3; }),
        u('고속 방전', '+55% 발사 속도.', 210, (s) => { s.fireRate *= 1.55; }),
        u('16점 어레이', '방전당 16개의 아크.', 320, (s) => { s.count = 16; }),
        u('체인 라이트닝', '아크가 3명의 추가 대상에게 튀고, +1 피해.', 680, (s) => { s.chain = 3; s.damage += 1; }),
        u('폭풍 대성당', '보너스: 체인이 6명에게 닿고, +2 피해.', 1600, (s) => { s.chain = 6; s.damage += 2; }),
        u('신 코일', '보너스: +50% 사거리, 2배 피해. 하늘이 하얗게 된다.', 3600, (s) => { s.range *= 1.5; s.damage *= 2; }),
      ]),
      track('억제', [
        u('절연 코어', '+20% 사거리.', 110, (s) => { s.range *= 1.2; }),
        u('이온화된 공기', '아크가 함선을 잠시 20% 감속.', 240, (s) => { s.slowPower = 0.2; s.slowDuration = 0.8; }),
        u('과부하 릴레이', '+1 피해.', 340, (s) => { s.damage += 1; }),
        u('초전도체', '+60% 발사 속도.', 620, (s) => { s.fireRate *= 1.6; }),
        u('마그네타 케이지', '보너스: 아크가 함선을 뒤로 끌어당긴다.', 1500, (s) => { s.drag = 22; }),
        u('사건 테슬라', '보너스: 모든 방전이 24개의 함선에 체인 — 한 호위 전체가 동시에 점등.', 3500, (s) => { s.chain = 24; s.damage += 3; s.count = 20; }),
      ]),
    ],
  },
  {
    id: 'cryo', name: '크라이오 이미터', short: 'CRY', cost: 320, unlockAt: 1300,
    desc: '초저온 플라즈마를 펄스로 발사해 사거리 안의 모든 적을 감속시킨다.',
    lore: '갇힌 마이크로 특이점에서 냉각제를 분출한다. 정비반은 작업복을 세 겹 입는다.',
    color: '#7efff5', glow: '#c7fffb', style: 'pulse',
    base: base({ range: 85, fireRate: 0.9, damage: 0, damageType: 'cryo', slowPower: 0.45, slowDuration: 1.6, pierce: 99 }),
    tracks: [
      track('절대 영도', [
        u('광역 분산', '+40% 펄스 반경.', 140, (s) => { s.range *= 1.4; }),
        u('심층 동결', '슬로우 강도 65%.', 240, (s) => { s.slowPower = 0.65; }),
        u('영구 동토', '슬로우가 두 배 오래 지속된다.', 300, (s) => { s.slowDuration *= 2; }),
        u('쇄빙 펄스', '펄스당 크라이오 피해 2.', 560, (s) => { s.damage = 2; }),
        u('절대 영도', '보너스: 슬로우 강도 85%.', 1300, (s) => { s.slowPower = 0.85; }),
        u('열의 죽음', '보너스: 펄스당 6 피해. 엔트로피는 항상 이긴다.', 3000, (s) => { s.damage = 6; s.slowDuration *= 1.5; }),
      ]),
      track('빙하', [
        u('짙은 안개', '+25% 반경.', 130, (s) => { s.range *= 1.25; }),
        u('부서진 선체', '+1 펄스 피해.', 260, (s) => { s.damage += 1; }),
        u('만년설', '+50% 슬로우 지속.', 320, (s) => { s.slowDuration *= 1.5; }),
        u('눈사태', '+2 펄스 피해.', 600, (s) => { s.damage += 2; }),
        u('혜성 핵', '보너스: +4 피해, +30% 반경.', 1400, (s) => { s.damage += 4; s.range *= 1.3; }),
        u('긴 겨울', '보너스: 92% 슬로우 — 함선이 거의 꽁꽁 얼고 — +70% 반경. 봄은 취소되었다.', 3200, (s) => { s.slowPower = 0.92; s.slowDuration *= 1.5; s.range *= 1.7; s.damage += 3; }),
      ]),
    ],
  },
  {
    id: 'rail', name: '레일건 포스트', short: 'RLG', cost: 420, unlockAt: 5500,
    desc: '초기 정밀 레일 포스트. 본격적인 포위포가 등장하기 전까지 유틸리티, 관통, 마무리 일격을 제공한다.',
    lore: '슬러그가 소리보다 먼저 도착한다. 소리는 결코 도착하지 않는다 — 여기는 우주다.',
    color: '#ff6b6b', glow: '#ffa8a8', style: 'rail',
    base: base({ range: 9999, fireRate: 0.55, damage: 3 }),
    tracks: [
      track('매스 드라이버', [
        u('AP 슬러그', '탄환이 장갑을 분쇄 — 이지스 헐에 피해를 입힘.', 220, (s) => { s.shred = true; }),
        u('스포터 업링크', '위상 은신 적을 탐지.', 240, (s) => { s.detection = true; }),
        u('고속 사이클러', '+80% 발사 속도.', 400, (s) => { s.fireRate *= 1.8; }),
        u('특이점 탄환', '6 피해, 관통 5.', 900, (s) => { s.damage = 6; s.pierce = 5; }),
        u('매스 드라이버', '보너스: 12 피해, 관통 7.', 1800, (s) => { s.damage = 12; s.pierce = 7; }),
        u('궤도 게이지', '보너스: 30 피해, 슬러그는 절대 멈추지 않는다 — 회랑 전체를 관통한다. 어딘가에서 기술적으로는 전쟁 범죄.', 4000, (s) => { s.damage = 30; s.pierce = 999; s.shred = true; }),
      ]),
      track('팬텀 라운드', [
        u('억제기', '+25% 발사 속도.', 200, (s) => { s.fireRate *= 1.25; }),
        u('헌터 광학', '은신을 탐지.', 240, (s) => { s.detection = true; }),
        u('쌍둥이 레일', '발사당 두 발의 슬러그.', 520, (s) => { s.count = 2; }),
        u('집행자 탄환', '비-보스 헐을 15% HP 이하에서 즉사시킨다.', 880, (s) => { s.execute = 0.15; }),
        u('죽음의 표식', '보너스: 즉사 임계치 30%.', 1700, (s) => { s.execute = 0.3; }),
        u('하나의 진짜 사격', '보너스: 3배 피해, 비-보스 헐을 체력 절반 이하에서 즉사. 슬러그가 당신의 이름을 기억한다.', 3800, (s) => { s.damage *= 3; s.execute = 0.5; }),
      ]),
    ],
  },
  {
    id: 'missile', name: '미사일 배터리', short: 'MSL', cost: 540, unlockAt: 18000,
    desc: '버스트 피해와 보스 압력을 위한 느린 유도탄. 더 큰 타격, 적은 트릭, 진짜 장갑 파괴 업그레이드.',
    lore: '구식 식민지 무기, 드론 신호에 맞게 재점화. 투박하다. 사랑받는다.',
    color: '#ff9f43', glow: '#ffc48a', style: 'missile',
    base: base({ range: 155, fireRate: 0.62, damage: 4, damageType: 'explosive', splash: 48, projectileSpeed: 310 }),
    tracks: [
      track('포화', [
        u('열압 폭약', '+50% 폭발 반경.', 250, (s) => { s.splash *= 1.5; }),
        u('쌍둥이 발사대', '한 사벨로 두 발의 미사일.', 380, (s) => { s.count = 2; }),
        u('자동 장전기', '+35% 발사 속도.', 460, (s) => { s.fireRate *= 1.35; }),
        u('벙커 버스터', '탄두가 장갑을 분쇄, +3 피해.', 850, (s) => { s.shred = true; s.damage += 3; }),
        u('포화 연발', '보너스: 한 사벨로 네 발의 미사일.', 1500, (s) => { s.count = 4; }),
        u('멸종 호', '보너스: +6 피해, +50% 폭발. 지평선이 항의한다.', 3400, (s) => { s.damage += 6; s.splash *= 1.5; }),
      ]),
      track('지옥불', [
        u('근접 신관', '+25% 폭발 반경.', 220, (s) => { s.splash *= 1.25; }),
        u('성형 작약', '+3 피해.', 360, (s) => { s.damage += 3; }),
        u('백린', '짧은 화상 5 dps, 2초간.', 520, (s) => { s.burnDps = 5; s.burnDuration = 2; }),
        u('클러스터 탄두', '+1 미사일, +20% 폭발.', 780, (s) => { s.count += 1; s.splash *= 1.2; }),
        u('불보라', '보너스: +7 피해, 장갑 분쇄.', 1600, (s) => { s.damage += 7; s.shred = true; }),
        u('전술적 일출', '보너스: 여섯 발의 탄두 카펫, 2배 피해, 2배 폭발. 낮이 두 번 온다.', 3600, (s) => { s.damage *= 2; s.splash *= 2; s.count = Math.max(s.count, 6); }),
      ]),
    ],
  },
  {
    id: 'drone', name: '드론 캐리어', short: 'DRN', cost: 600, unlockAt: 28000,
    desc: '회랑 전체에 화력을 분산하는 인터셉터 편대를 발진한다. 넓은 커버리지, 센서 지원, 그리고 많은 작은 운동 타격.',
    lore: '군체(群體)와 군체로 싸운다. 인터셉터들은 스스로에게 이름을 붙이기 시작했다.',
    color: '#1dd1a1', glow: '#8ef5d9', style: 'bolt',
    base: base({ range: 170, fireRate: 1.45, damage: 1, damageType: 'kinetic', pierce: 2, projectileSpeed: 500, droneSwarm: 2 }),
    tracks: [
      track('캐리어 그룹', [
        u('제2 편대', '발진당 +1 인터셉터.', 320, (s) => { s.droneSwarm += 1; }),
        u('센서 슈트', '드론이 은신을 탐지.', 280, (s) => { s.detection = true; }),
        u('오토캐논 포드', '+1 피해, 관통 4.', 520, (s) => { s.damage += 1; s.pierce = 4; }),
        u('캐리어 그룹', '두 편대, +35% 발진율.', 980, (s) => { s.count = 2; s.fireRate *= 1.35; }),
        u('에이스 편대', '보너스: 발진당 +3 인터셉터.', 1500, (s) => { s.droneSwarm += 3; }),
        u('영원한 캐리어', '보너스: +2 피해, +60% 발사 속도. 격납고는 잠들지 않는다.', 3300, (s) => { s.damage += 2; s.fireRate *= 1.6; }),
      ]),
      track('하이브', [
        u('연장 순찰', '+30% 공역.', 260, (s) => { s.range *= 1.3; }),
        u('가시 로터', '관통 +2, +1 인터셉터.', 340, (s) => { s.pierce += 2; s.droneSwarm += 1; }),
        u('수리 베이', '+35% 발사 속도.', 480, (s) => { s.fireRate *= 1.35; }),
        u('합금 선체', '+1 피해.', 700, (s) => { s.damage += 1; }),
        u('메뚜기 교리', '보너스: 군체가 함선을 그을리다 — 6 dps 화상.', 1400, (s) => { s.burnDps = 6; s.burnDuration = 2; }),
        u('군체 특이점', '보너스: +4 인터셉터, 관통 8. 하늘은 이제 동사다.', 3200, (s) => { s.droneSwarm += 4; s.pierce = 8; }),
      ]),
    ],
  },
  {
    id: 'emp', name: 'EMP 스파이어', short: 'EMP', cost: 450, unlockAt: 11000,
    desc: '지원 파일론. 위상 은신 적을 드러내고 근처 타워를 오버클럭한다.',
    lore: '그들이 남긴 침묵을 청취함으로써 벡스 위상 은신을 꿰뚫어 본다.',
    color: '#54a0ff', glow: '#a3ccff', style: 'support',
    base: base({ range: 130, fireRate: 0, damage: 0, detection: true, buffRate: 0.10 }),
    tracks: [
      track('비콘 그리드', [
        u('광대역 레이더', '+45% 오라 반경.', 200, (s) => { s.range *= 1.45; }),
        u('오버클럭 필드', '근처 타워 +25% 발사 속도.', 350, (s) => { s.buffRate = 0.25; }),
        u('신호 부스터', '근처 타워 +15% 사거리.', 400, (s) => { s.buffRange = 0.15; }),
        u('이온 폭풍 프로토콜', '오라가 적을 30% 감속.', 800, (s) => { s.slowPower = 0.3; s.slowDuration = 0.5; }),
        u('그리드 주권', '보너스: 근처 타워에 +45% 발사 속도.', 1600, (s) => { s.buffRate = 0.45; }),
        u('등대의 심장', '보너스: +60% 발사 속도, +30% 사거리 오라. 비콘도 함께 싸운다.', 3500, (s) => { s.buffRate = 0.6; s.buffRange = 0.3; }),
      ]),
      track('무 전투', [
        u('재밍 스파이크', '오라 슬로우 20%.', 240, (s) => { s.slowPower = Math.max(s.slowPower, 0.2); s.slowDuration = 0.5; }),
        u('블랙 아이스', '오라 슬로우 35%.', 420, (s) => { s.slowPower = Math.max(s.slowPower, 0.35); }),
        u('레이저 스태틱', '오라가 함선을 그을림: 2 dps.', 520, (s) => { s.burnDps = 2; s.burnDuration = 0.6; }),
        u('코르텍스 웜', '오라 화상 4 dps.', 760, (s) => { s.burnDps = 4; }),
        u('시스템 역병', '보너스: 오라 화상 8 dps.', 1500, (s) => { s.burnDps = 8; }),
        u('무(無) 섹터', '보너스: 50% 오라 슬로우, +30% 반경. 기계들이 기계하는 법을 잊는다.', 3400, (s) => { s.slowPower = 0.5; s.range *= 1.3; }),
      ]),
    ],
  },
  {
    id: 'cantor', name: '별빛 칸토르', short: 'CNT', cost: 680, unlockAt: 60000,
    desc: '함선에 비컨 음을 불러 공명 표식을 남긴다: 스택당 모든 출처의 피해 +10%.',
    lore: '연속의식이 그들 방식으로 싸우는 단 하나의 악기를 요청했다 — 들리는 것으로.',
    color: '#f6e58d', glow: '#fff8c4', style: 'resonance',
    base: base({ range: 130, fireRate: 1.6, damage: 1, damageType: 'energy' }),
    tracks: [
      track('합창', [
        u('성가대 로프트', '+30% 사거리.', 260, (s) => { s.range *= 1.3; }),
        u('이부 조화', '한 절당 두 함선에 표식.', 420, (s) => { s.count = 2; }),
        u('크레셴도', '+75% 절(verse) 속도.', 560, (s) => { s.fireRate *= 1.75; }),
        u('긴 음', '표식이 사라지지 않음, 3 피해.', 1000, (s) => { s.burnDuration = 999; s.damage = 3; }),
        u('수백만의 합창', '보너스: 세 함선에 표식.', 1500, (s) => { s.count = 3; }),
        u('끝나지 않는 음', '보너스: 영구 공명으로 한 번에 8 함선에 표식. 호위 전체가 듣는다.', 3300, (s) => { s.count = 8; s.fireRate *= 1.5; s.damage = 5; s.burnDuration = 999; }),
      ]),
      track('송가', [
        u('저음 화음', '+25% 사거리.', 240, (s) => { s.range *= 1.25; }),
        u('단조', '+1 피해.', 380, (s) => { s.damage += 1; }),
        u('슬픈 노래', '+50% 절 속도.', 520, (s) => { s.fireRate *= 1.5; }),
        u('애도', '+3 피해.', 900, (s) => { s.damage += 3; }),
        u('진혼 미사', '보너스: +4 피해, 두 함선에 표식.', 1500, (s) => { s.damage += 4; s.count = Math.max(s.count, 2); }),
        u('끝의 노래', '보너스: 세 표식, +5 피해. 모든 기계가 자기 이름을 듣는다.', 3400, (s) => { s.count = 3; s.damage += 5; }),
      ]),
    ],
  },
  {
    id: 'prismarr', name: '프리즘 어레이', short: 'PRM', cost: 1600, unlockAt: 420000,
    desc: '호위 전체를 녹이는 집속 광자 창. 프리미엄 하드웨어.',
    lore: '한 기가 메리디안 게이트에 장착되어 있었다. 그 게이트는 9년을 버텼다.',
    color: '#be2edd', glow: '#e0a6f5', style: 'beam',
    base: base({ range: 140, fireRate: 4, damage: 1, damageType: 'energy', pierce: 6 }),
    tracks: [
      track('제노사이드', [
        u('집속 수정', '+30% 사거리.', 500, (s) => { s.range *= 1.3; }),
        u('굴절 격자', '빔이 12 관통.', 750, (s) => { s.pierce = 12; }),
        u('타키온 렌즈', '은신을 탐지, +50% 발사 속도.', 900, (s) => { s.detection = true; s.fireRate *= 1.5; }),
        u('제노사이드 코어', '3배 피해.', 2400, (s) => { s.damage *= 3; }),
        u('아크라이트', '보너스: 다시 2배 피해.', 2600, (s) => { s.damage *= 2; }),
        u('마지막 여명', '보너스: +40% 사거리, 관통 20. 회랑이 햇빛이 된다.', 5200, (s) => { s.range *= 1.4; s.pierce = 20; }),
      ]),
      track('스펙트럼', [
        u('와이드 렌즈', '+25% 사거리.', 450, (s) => { s.range *= 1.25; }),
        u('프리즘 속도', '+40% 발사 속도.', 700, (s) => { s.fireRate *= 1.4; }),
        u('바이올렛 시프트', '+1 피해.', 950, (s) => { s.damage += 1; }),
        u('스펙트럼 시력', '은신을 탐지, +30% 발사 속도.', 1400, (s) => { s.detection = true; s.fireRate *= 1.3; }),
        u('무지개 붕괴', '보너스: +3 피해, +50% 발사 속도.', 2400, (s) => { s.damage += 3; s.fireRate *= 1.5; }),
        u('화이트 홀', '보너스: 호위 전체를 관통하는 끊기지 않는 빔, 2배 피해. 색은 하나의 단계였다.', 5000, (s) => { s.pierce = 999; s.damage *= 2; s.fireRate *= 1.2; }),
      ]),
    ],
  },
  // ---- the strange ones ----
  {
    id: 'locust', name: '메뚜기 사원', short: 'LCS', cost: 900, unlockAt: 520000,
    desc: '공학적 나노-메뚜기의 성물함. 정기적으로 자신의 공역에 모든 함선을 갉아먹는 탐욕스러운 구름을 내려보낸다.',
    lore: '합동군이 손대지 않은 죽은 세계에서 인양. 그 세계를 먹은 것이 무엇이든, 우리는 여기서 한 잔 분량을 보관하고 있으며, 그것은 감사하는 중이다.',
    color: '#b8e994', glow: '#dff9c4', style: 'pulse',
    base: base({ range: 100, fireRate: 1, damage: 0, damageType: 'energy', burnDps: 3, burnDuration: 2, pierce: 99 }),
    tracks: [
      track('기근', [
        u('굶주린 새끼', '갉아먹기 5 dps.', 280, (s) => { s.burnDps = 5; }),
        u('시체 바람', '+35% 구름 반경.', 360, (s) => { s.range *= 1.35; }),
        u('키틴 폭풍', '갉아먹기 8 dps.', 520, (s) => { s.burnDps = 8; }),
        u('탐욕 구름', '갉아먹기 4초 지속.', 800, (s) => { s.burnDuration = 4; }),
        u('기근 엔진', '보너스: 갉아먹기 14 dps.', 1500, (s) => { s.burnDps = 14; }),
        u('재의 수확', '보너스: 갉아먹기 22 dps, +30% 반경. 까마귀에게 남기는 것이 없다.', 3300, (s) => { s.burnDps = 22; s.range *= 1.3; }),
      ]),
      track('역병', [
        u('포자 환기', '구름이 함선을 15% 감속.', 260, (s) => { s.slowPower = 0.15; s.slowDuration = 1; }),
        u('괴사', '펄스당 1 피해.', 380, (s) => { s.damage = 1; }),
        u('검은 키틴', '펄스당 2 피해.', 560, (s) => { s.damage = 2; }),
        u('역병 전파자', '구름 슬로우 35%.', 840, (s) => { s.slowPower = 0.35; }),
        u('팬데믹 합창', '보너스: 4 피해, 슬로우 45%.', 1400, (s) => { s.damage = 4; s.slowPower = 0.45; }),
        u('세계-잠식의 꽃', '보너스: +50% 반경, 갉아먹기 +10 dps. 한 잔 분량이었던 것이 바다였음을 기억한다.', 3200, (s) => { s.range *= 1.5; s.burnDps += 10; }),
      ]),
    ],
  },
  {
    id: 'requiem', name: '잠긴 별의 성물함', short: 'DSR', cost: 1450, unlockAt: 650000,
    desc: '자기 계를 지키다 죽은 별의 식어가는 잿불을 보관한다. 정기적으로 안식의 파동 — 통과하는 모든 것을 상처 입히는 확장하는 고리 — 를 내뱉는다.',
    lore: '별은 조용히 죽지 않는다. 이 별은 우리 쪽 선에서 계속 애통하기를 동의했다.',
    color: '#f8a5c2', glow: '#ffd9e8', style: 'nova',
    base: base({ range: 240, fireRate: 0.275, damage: 5, damageType: 'energy', pierce: 999 }),
    tracks: [
      track('애통', [
        u('더 깊은 애도', '파동 피해 7.5.', 700, (s) => { s.damage = 7.5; }),
        u('더 넓은 각성', '파동 사거리 260.', 900, (s) => { s.range = 260; }),
        u('쌍둥이 펄스', '+75% 파동 속도.', 1100, (s) => { s.fireRate *= 1.75; }),
        u('별의 슬픔', '파동 피해 11.25.', 1600, (s) => { s.damage = 11.25; }),
        u('빛의 무덤', '보너스: 파동 피해 17.5.', 2000, (s) => { s.damage = 17.5; }),
        u('초신성 진혼곡', '보너스: 피해 27.5, 사거리 425. 사이클당 한 번, 전쟁이 별의 전생을 듣는다.', 4200, (s) => { s.damage = 27.5; s.range = 425; }),
      ]),
      track('기억', [
        u('메아리', '+62% 파동 속도.', 650, (s) => { s.fireRate *= 1.625; }),
        u('추억', '파동이 함선을 25% 감속.', 850, (s) => { s.slowPower = 0.25; s.slowDuration = 1.4; }),
        u('촛불', '+2.5 파동 피해.', 1050, (s) => { s.damage += 2.5; }),
        u('야경', '파동 사거리 +25%.', 1500, (s) => { s.range *= 1.25; }),
        u('영원한 각성', '보너스: +100% 파동 속도.', 1900, (s) => { s.fireRate *= 2; }),
        u('다시 태어난 별', '보너스: +12.5 피해, 슬로우 40%. 따뜻했던 시절을 기억한다.', 4000, (s) => { s.damage += 12.5; s.slowPower = Math.max(s.slowPower, 0.4); }),
      ]),
    ],
  },
  {
    id: 'watchfire', name: '워치파이어 비콘', short: 'WFB', cost: 2500, unlockAt: 800000,
    desc: '랜턴 7호 자신의 비콘이 바깥으로 향해졌다. 빔이 가로지르는 모든 것을 쓸어버리는 잡힌 별빛의 회전 창 — 연속 피해, 조준 없음, 재사용 대기 없음.',
    lore: '백만 척의 배를 집으로 안내한 빛이 이제 뒤따라온 것들을 위해 어둠을 훑는다. 관리자는 렌즈를 뒤집었을 때 울었다. 그리고 뒤집었다.',
    color: '#ffe8a3', glow: '#fff6d0', style: 'sweep',
    // damage = dps, range = beam length, fireRate = rotation speed (rad/s), count = beams
    base: base({ range: 170, fireRate: 1.1, damage: 16, damageType: 'energy', count: 1, detection: true, pierce: 999 }),
    tracks: [
      track('풀 빔', [
        u('윤곽 렌즈', '+25% 빔 길이.', 600, (s) => { s.range *= 1.25; }),
        u('쌍둥이 등불', '두 번째 빔, 첫 번째의 반대쪽.', 1100, (s) => { s.count = 2; }),
        u('더 밝은 연소', '초당 +10 피해.', 1400, (s) => { s.damage += 10; }),
        u('고속 로터', '+45% 회전 속도.', 1900, (s) => { s.fireRate *= 1.45; }),
        u('쿼드 어레이', '보너스: 네 개의 빔, 완전 커버.', 3600, (s) => { s.count = 4; }),
        u('끝나지 않는 눈', '보너스: 2.2배 피해, +30% 길이. 빛을 건너는 것은 아무도 — 보지도, 온전하지도 못한다.', 8200, (s) => { s.damage *= 2.2; s.range *= 1.3; }),
      ]),
      track('굴절', [
        u('냉각 필터', '쓸린 함선은 30% 감속.', 700, (s) => { s.slowPower = 0.3; s.slowDuration = 0.6; }),
        u('태양 플레어', '빔이 함선을 점화: 10 dps.', 1200, (s) => { s.burnDps = 10; s.burnDuration = 1.5; }),
        u('와이드 조리개', '+1 빔, +20% 길이.', 1700, (s) => { s.count += 1; s.range *= 1.2; }),
        u('태우기 집속', '초당 +12 피해.', 2100, (s) => { s.damage += 12; }),
        u('프리즘 왕관', '보너스: 깊은 동결 (60% 슬로우) + 20 dps 화상이 쓸림을 따라.', 3800, (s) => { s.slowPower = 0.6; s.slowDuration = 1; s.burnDps = 20; s.burnDuration = 2; }),
        u('여명의 엔진', '보너스: 2배 피해, +60% 회전. 밤은 이제 당신의 일정에 따라 끝난다.', 8000, (s) => { s.damage *= 2; s.fireRate *= 1.6; }),
      ]),
    ],
  },
  {
    id: 'abyss', name: '심연 게이트', short: 'ABY', cost: 5200, unlockAt: 1000000,
    desc: '금지된 엔드게임 타워. 대상 군집에 공허 게이트를 열어 방어를 분쇄하고, 함선을 뒤로 끌어당기고, 게이트 주변 회랑을 동결시킨다.',
    lore: '게이트는 발사하지 않는다. 잠깐 동안 전장에 다른 곳이 더 가깝다고 납득시킨다.',
    color: '#6c5ce7', glow: '#c8b6ff', style: 'rift',
    base: base({
      range: 210, fireRate: 0.28, damage: 18, damageType: 'energy',
      pierce: 999, splash: 72, count: 1, detection: true,
      slowPower: 0.35, slowDuration: 1.2, drag: 55, shred: true,
    }),
    tracks: [
      track('사건의 지평선', [
        u('질량 그림자', '+25% 게이트 반경.', 1800, (s) => { s.splash *= 1.25; }),
        u('잔혹한 중력', '+45% 끌어당김.', 2600, (s) => { s.drag *= 1.45; }),
        u('호킹 이빨', '+14 게이트 피해.', 3400, (s) => { s.damage += 14; }),
        u('붕괴 리듬', '+50% 게이트 속도.', 5200, (s) => { s.fireRate *= 1.5; }),
        u('이원 지평선', '보너스: 사이클당 두 개의 게이트 개방.', 8200, (s) => { s.count = 2; }),
        u('한밤의 입', '보너스: 거대한 게이트, 62 피해, 잔혹한 끌어당김. 호위는 자신을 통해 빠져나간다.', 16000, (s) => { s.damage = 62; s.splash = 132; s.drag *= 2.2; }),
      ]),
      track('웜홀 네트워크', [
        u('먼 조리개', '+35% 사거리.', 1600, (s) => { s.range *= 1.35; }),
        u('두 번째 입', '다른 군집에 두 번째 게이트 개방.', 3000, (s) => { s.count = 2; }),
        u('슬립스트림 전단', '+40% 게이트 속도.', 3800, (s) => { s.fireRate *= 1.4; }),
        u('인과적 연소', '게이트가 3초 동안 22 dps 화상 적용.', 5400, (s) => { s.burnDps = 22; s.burnDuration = 3; }),
        u('게이트 합창', '보너스: 사이클당 세 개의 게이트 개방.', 9000, (s) => { s.count = 3; }),
        u('어디에나 있는 출구', '보너스: 다섯 개의 게이트, 무제한 사거리, 더 깊은 슬로우. 모든 길이 심연을 통과한다.', 17000, (s) => { s.count = 5; s.range = 9999; s.slowPower = 0.62; s.slowDuration = 2.2; }),
      ]),
    ],
  },
  // ---- THE HOLLOW arsenal: light against the hunger ----
  {
    id: 'ember', name: '잿불 격자', short: 'EMB', cost: 420, unlockAt: 42000,
    desc: '자기 공역에 가둬진 별불의 격자를 펼친다 — 내부의 모든 것이 탄다. 화염은 에너지이므로 장갑도 홀로우도 피난처가 아니다.',
    lore: '중계기가 어두워질 때 등대지기들이 신호 불의 격자를 켰다. 이것은 꺼지지 않으며, 더 이상 신호가 아니다.',
    color: '#ff7f50', glow: '#ffd0a0', style: 'pulse',
    base: base({ range: 95, fireRate: 1.1, damage: 0, damageType: 'energy', burnDps: 5, burnDuration: 2, pierce: 99 }),
    tracks: [
      track('들불', [
        u('둔한 숯', '그을리기 8 dps.', 200, (s) => { s.burnDps = 8; }),
        u('퍼지는 불꽃', '+35% 격자 반경.', 280, (s) => { s.range *= 1.35; }),
        u('백열', '그을리기 13 dps.', 420, (s) => { s.burnDps = 13; }),
        u('용광로 바람', '펄스당 +1 피해, +30% 발사 속도.', 700, (s) => { s.damage += 1; s.fireRate *= 1.3; }),
        u('대화재', '보너스: 그을리기 22 dps.', 1500, (s) => { s.burnDps = 22; }),
        u('별-잠식', '보너스: 그을리기 34 dps, +40% 반경. 차가움 자체를 태운다.', 3200, (s) => { s.burnDps = 34; s.range *= 1.4; }),
      ]),
      track('난로불', [
        u('수호의 빛', '격자 안의 위상 은신 함선을 드러냄.', 220, (s) => { s.detection = true; }),
        u('잿불 물림', '펄스당 +2 피해.', 320, (s) => { s.damage += 2; }),
        u('잿불 공기', '격자가 함선을 30% 감속.', 460, (s) => { s.slowPower = 0.3; s.slowDuration = 1; }),
        u('숯 위를 걷다', '펄스당 +3 피해.', 720, (s) => { s.damage += 3; }),
        u('장작 더미 장', '보너스: 슬로우 45%, +4 피해.', 1500, (s) => { s.slowPower = 0.45; s.damage += 4; }),
        u('긴 정오', '보너스: +60% 반경, 그을리기 +12 dps. 끝나지 않는 정오.', 3200, (s) => { s.range *= 1.6; s.burnDps += 12; }),
      ]),
    ],
  },
  {
    id: 'anchor', name: '위상 닻', short: 'ANC', cost: 700, unlockAt: 115000,
    desc: '갇힌 특이점. 발사하지 않는다. 함선이 어디에 있는지 다시 쓴다 — 한 줄을 킬 포켓으로 끌어다 거기에 고정시키고, 맹인 호위를 드러낸다. 그것의 "승천"은 피해가 아니라 통제다.',
    lore: '심연 게이트의 민간 조상: 화물선을 폭풍에 정박시키기 위해 항구 예인선이 한때 사용했다. 컨코드는 부드러운 버전을 보관했다. 합동군은 보관하지 않았다.',
    color: '#8e7bef', glow: '#cdbcff', style: 'gravity',
    base: base({
      range: 120, fireRate: 1.0, damage: 0, damageType: 'energy', pierce: 99,
      drag: 26, slowPower: 0.25, slowDuration: 0.8, detection: false,
    }),
    tracks: [
      track('특이점 우물', [
        u('더 깊은 우물', '+35% 사거리.', 300, (s) => { s.range *= 1.35; }),
        u('질량 그림자', '더 강한 뒤쪽 당김.', 450, (s) => { s.drag = 40; }),
        u('시간 지연', '슬로우 45%, 더 길게.', 650, (s) => { s.slowPower = 0.45; s.slowDuration = 1.4; }),
        u('중력 바이스', '짓누르는 당김 + 고정.', 1000, (s) => { s.drag = 70; s.slowPower = 0.55; }),
        u('사건의 우물', '보너스: 깊은 당김, +20% 사거리.', 1900, (s) => { s.drag = 110; s.range *= 1.2; }),
        u('구덩이', '보너스: 한 줄이 앞으로 존재하는 것을 단순히 멈춘다. 잔혹한 당김, 깊은 슬로우, 넓음.', 3800, (s) => { s.drag = 180; s.slowPower = 0.7; s.slowDuration = 2; s.range *= 1.2; }),
      ]),
      track('워든 어레이', [
        u('위상 감지기', '필드 어디든 위상 은신 함선을 드러냄.', 320, (s) => { s.detection = true; }),
        u('공명 격자', '+30% 사거리.', 450, (s) => { s.range *= 1.3; }),
        u('깊은 착취', '슬로우 45%, 더 긴 고정.', 650, (s) => { s.slowPower = 0.45; s.slowDuration = 1.4; }),
        u('그래비톤 메시', '+25% 사거리, 더 강한 당김.', 1000, (s) => { s.range *= 1.25; s.drag = 40; }),
        u('워든 필드', '보너스: 필드 전체 감지와 무거운 슬로우 — 아무것도 숨지 못하고, 아무것도 돌진하지 못한다.', 1900, (s) => { s.detection = true; s.slowPower = 0.6; s.range *= 1.2; }),
        u('끝나지 않는 눈', '보너스: 완전 봉쇄 — 깊은 당김, 깊은 슬로우, 넓음, 모든 함선이 드러난다.', 3800, (s) => { s.detection = true; s.drag = 110; s.slowPower = 0.7; s.slowDuration = 2; s.range *= 1.3; }),
      ]),
    ],
  },
  {
    id: 'sunspear', name: '태양 창 배터리', short: 'SUN', cost: 760, unlockAt: 150000,
    desc: '레일 위의 집속된 햇빛 창. 에너지, 장갑 분쇄, 어떤 은신도 꿰뚫는다 — 어둠이 숨기는 것들을 처치하도록 만들어졌다.',
    lore: '프리즘 어레이가 그 원리를 증명한 후, 메리디안 게이트의 마지막 작동 렌즈로 주조되었다. 한 발, 한 번의 여명, 반복.',
    color: '#ffe066', glow: '#fff3a0', style: 'rail',
    base: base({ range: 9999, fireRate: 0.55, damage: 5, damageType: 'energy', detection: true, shred: true }),
    tracks: [
      track('정점', [
        u('집속 빔', '+45% 발사 속도.', 400, (s) => { s.fireRate *= 1.45; }),
        u('태양 슬러그', '8 피해.', 520, (s) => { s.damage = 8; }),
        u('쌍둥이 여명', '발사당 두 개의 창.', 760, (s) => { s.count = 2; }),
        u('코로나 라운드', '12 피해, 관통 3.', 1000, (s) => { s.damage = 12; s.pierce = 3; }),
        u('정오의 총', '보너스: 18 피해, 화상 8 dps.', 1800, (s) => { s.damage = 18; s.burnDps = Math.max(s.burnDps, 8); s.burnDuration = Math.max(s.burnDuration, 3); }),
        u('두 번째 일출', '보너스: 2배 피해, 관통 6. 여명이 두 번 오고, 어둠은 오지 않는다.', 3800, (s) => { s.damage *= 2; s.pierce = 6; }),
      ]),
      track('일식', [
        u('흑점 광학', '+20% 발사 속도, 더 강한 은신 방지 집속.', 240, (s) => { s.fireRate *= 1.2; s.detection = true; }),
        u('눈부심', '비-보스 헐을 15% HP 이하에서 즉사.', 480, (s) => { s.execute = 0.15; }),
        u('연소 핵', '타격이 3초간 8 dps로 그을리고, +2 피해.', 640, (s) => { s.burnDps = 8; s.burnDuration = 3; s.damage += 2; }),
        u('태양신호기', '즉사 임계치 25%.', 980, (s) => { s.execute = 0.25; }),
        u('별의 낙하', '보너스: 즉사 35%, 화상 14 dps.', 1700, (s) => { s.execute = 0.35; s.burnDps = 14; s.burnDuration = 4; }),
        u('마지막 빛', '보너스: 3배 피해, 비-보스 헐을 체력 절반 이하에서 즉사. 어둠이 먼저 눈을 깜빡인다.', 3900, (s) => { s.damage *= 3; s.execute = 0.5; }),
      ]),
    ],
  },
  {
    id: 'siphon', name: '화음 흡입기', short: 'SIP', cost: 700, unlockAt: 200000,
    desc: '집속 대음파 발산에 공명 스택을 소모하고, 그 다음 약한 메아리를 인근 함선에 흩뿌린다.',
    lore: '칸토르가 노래한다. 흡입기는 함선 안에서 음표를 훔쳐 응답한다.',
    color: '#9bffd4', glow: '#d8fff0', style: 'siphon',
    base: base({ range: 135, fireRate: 1.25, damage: 3.75, damageType: 'energy', pierce: 1, splash: 90, chain: 1 }),
    tracks: [
      track('대음파', [
        u('조율된 흡입', '타격당 최대 2개의 공명 스택 소모.', 420, (s) => { s.pierce = 2; }),
        u('더 가까운 결합', '+30% 대음파 속도.', 560, (s) => { s.fireRate *= 1.3; }),
        u('역산란', '메아리가 더 넓은 반경으로 2개의 인근 함선에 퍼진다.', 760, (s) => { s.chain = 2; s.splash = 90; }),
        u('깊은 화음', '+3 피해, +25% 사거리.', 1100, (s) => { s.damage += 3; s.range *= 1.25; }),
        u('공명 엔진', '보너스: 3 스택을 소모하고 3 함선에 퍼짐.', 1900, (s) => { s.pierce = 3; s.chain = 3; }),
        u('돌아오는 음', '보너스: 사이클당 두 번의 대음파, 4-스택 소모 한도, +4 피해.', 4200, (s) => { s.count = 2; s.pierce = 4; s.damage += 4; }),
      ]),
      track('무(無) 합창', [
        u('와이드 조리개', '+30% 사거리.', 380, (s) => { s.range *= 1.3; }),
        u('쓴 으뜸음', '+2 피해.', 520, (s) => { s.damage += 2; }),
        u('위상 귀', '위상 은신 함선을 듣고 조준할 수 있다.', 680, (s) => { s.detection = true; }),
        u('물음과 대답', '사이클당 두 개의 표식된 함선을 타격.', 1050, (s) => { s.count = 2; }),
        u('검은 합창', '보너스: 소모된 스택이 8 dps 에너지 화상을 남긴다.', 1800, (s) => { s.burnDps = 8; s.burnDuration = 2; }),
        u('마지막 대음파', '보너스: 세 대상, +5 피해, 더 강한 메아리 확산.', 4000, (s) => { s.count = 3; s.damage += 5; s.chain += 2; }),
      ]),
    ],
  },
  {
    id: 'lure', name: '벡터 미끼', short: 'LUR', cost: 850, unlockAt: 330000,
    desc: '우선 함선에 가짜 사령 벡터로 표식을 남겨, 인근 방어 시설이 그것에 집중하도록 강제하는 동안 호위가 비틀거린다.',
    lore: '합동군 사령부 흐름에 위조된 한 줄의 명령: 당신이 지금 전쟁의 중심이다.',
    color: '#ff5fd2', glow: '#ffc2f0', style: 'lure',
    base: base({ range: 185, fireRate: 0.9, damage: 0, damageType: 'energy', pierce: 1, slowPower: 0.25, slowDuration: 1.5, burnDuration: 3 }),
    tracks: [
      track('살상 명령', [
        u('롱 렌즈', '+25% 신호 사거리.', 420, (s) => { s.range *= 1.25; }),
        u('하드 핑', '집중 표식이 4.5초 지속.', 580, (s) => { s.burnDuration = 4.5; }),
        u('우선 분배기', '사이클당 두 함선에 표식.', 820, (s) => { s.count = 2; }),
        u('타겟 해석기', '+50% 표식 속도와 더 강한 집중 우선도.', 1200, (s) => { s.fireRate *= 1.5; s.pierce = 2; }),
        u('사격 통제', '보너스: 사이클당 세 함선에 표식.', 2100, (s) => { s.count = 3; }),
        u('단일 대상 전쟁', '보너스: 잔혹한 집중 우선도와 +35% 사거리.', 4600, (s) => { s.pierce = 4; s.range *= 1.35; }),
      ]),
      track('오도(誤導)', [
        u('정적 각성', '표식된 함선 32% 감속.', 400, (s) => { s.slowPower = 0.32; }),
        u('호위 혼란', '인근 호위가 슬로우 각성에 잡힌다.', 620, (s) => { s.splash = 65; s.slowDuration = 2; }),
        u('거짓 틈', '각성이 호위를 회랑을 따라 뒤로 끌어당긴다.', 860, (s) => { s.drag = 22; }),
        u('혼란 비콘', '더 넓은 각성, +35% 표식 속도.', 1180, (s) => { s.splash = 95; s.fireRate *= 1.35; }),
        u('공황 벡터', '보너스: 두 함선에 표식, 45% 슬로우.', 2100, (s) => { s.count = 2; s.slowPower = 0.45; }),
        u('틀린 출구', '보너스: 거대한 혼란 각성, 강한 당김, 6초 표식.', 4600, (s) => { s.splash = 130; s.drag = 55; s.burnDuration = 6; }),
      ]),
    ],
  },
  // ---- kinetic / explosive / fire reinforcements ----
  {
    id: 'flak', name: '플라크 배터리', short: 'FLK', cost: 450, unlockAt: 2400,
    desc: '터지는 플라크의 빠른 벽을 던진다 — 군체를 분쇄하는 저렴한 산탄. 폭발 장갑 헐이 통째로 삼키므로 백업을 두어라.',
    lore: '식민지 지대 방어 무기, 회랑을 향해 재조준. 들어오는 미사일을 잡기 위해 만들어졌다. 드론이 더 쉽다.',
    color: '#ffa502', glow: '#ffd56b', style: 'missile',
    base: base({ range: 145, fireRate: 1.4, damage: 0.8, damageType: 'explosive', splash: 15, projectileSpeed: 560, count: 2, pierce: 2 }),
    tracks: [
      track('연발', [
        u('쌍둥이 총신', '한 폭발당 +2 발.', 130, (s) => { s.count += 2; }),
        u('산탄 구름', '+2 관통, 작은 폭발 증가.', 200, (s) => { s.pierce += 2; s.splash *= 1.2; }),
        u('고속 사이클러', '+40% 발사 속도.', 375, (s) => { s.fireRate *= 1.4; }),
        u('중포탄', '+0.8 피해.', 650, (s) => { s.damage += 0.8; }),
        u('플라크 폭풍', '보너스: 여덟 발의 폭발.', 1200, (s) => { s.count = Math.max(s.count, 8); }),
        u('철의 비', '보너스: +2 피해, +40% 발사 속도, 관통 8. 하늘이 녹슨다.', 2600, (s) => { s.damage += 2; s.fireRate *= 1.4; s.pierce = 8; }),
      ]),
      track('근접', [
        u('근접 신관', '+20% 폭발 반경, +1 관통.', 185, (s) => { s.splash *= 1.2; s.pierce += 1; }),
        u('예광탄', '위상 은신 함선을 탐지.', 250, (s) => { s.detection = true; }),
        u('공중 폭발 패턴', '+3 발.', 425, (s) => { s.count += 3; }),
        u('클러스터 탄두', '+2 발, +0.8 피해.', 700, (s) => { s.count += 2; s.damage += 0.8; }),
        u('죽은 손', '보너스: 은신 탐지, 관통 7.', 1300, (s) => { s.detection = true; s.pierce = Math.max(s.pierce, 7); }),
        u('산란 폭풍', '보너스: 열 발, +2 피해. 회랑의 모든 것이 풍하방이다.', 2700, (s) => { s.count = Math.max(s.count, 10); s.damage += 2; }),
      ]),
    ],
  },
  {
    id: 'cinder', name: '신더 박격포', short: 'CDR', cost: 800, unlockAt: 85000,
    desc: '폭발하고, 회랑을 불태운 채 두는 인화성 탄환을 발사한다. 폭발은 예의상이다; 불이 핵심이다.',
    lore: '6호 중계기의 마지막 원자로 냉각제로 장전 — 공기와 만나면 냉각제가 아님이 드러났다.',
    color: '#ff6348', glow: '#ffae6b', style: 'missile',
    base: base({ range: 170, fireRate: 0.44, damage: 2, damageType: 'explosive', splash: 27, burnDps: 3.75, burnDuration: 2, burnZoneRadius: 42, burnZoneDps: 5, burnZoneDuration: 4, projectileSpeed: 300 }),
    tracks: [
      track('들불', [
        u('서멧 핵', '연소 구역 그을리기 10 dps.', 280, (s) => { s.burnZoneDps = 10; }),
        u('와이드 꽃', '+35% 연소 구역 반경.', 360, (s) => { s.burnZoneRadius *= 1.35; }),
        u('긴 연소', '연소 구역이 7초 지속.', 460, (s) => { s.burnZoneDuration = 7; }),
        u('이중 탄', '두 발의 탄, +1 피해.', 760, (s) => { s.count = 2; s.damage += 1; }),
        u('불보라', '보너스: 연소 구역 그을리기 18 dps.', 1500, (s) => { s.burnZoneDps = 18; }),
        u('긴 여름', '보너스: 연소 구역 그을리기 28 dps, +40% 반경, 10초 지속.', 3400, (s) => { s.burnZoneDps = 28; s.burnZoneRadius *= 1.4; s.burnZoneDuration = 10; }),
      ]),
      track('화성쇄설', [
        u('성형 작약', '+3 폭발 피해.', 260, (s) => { s.damage += 3; }),
        u('예광 신관', '위상 은신 함선을 탐지.', 360, (s) => { s.detection = true; }),
        u('클러스터 연소', '+1 발.', 600, (s) => { s.count += 1; }),
        u('마그마 핵', '연소 구역 그을리기 14 dps, +2 폭발 피해.', 900, (s) => { s.burnZoneDps = 14; s.damage += 2; }),
        u('칼데라', '보너스: +60% 연소 구역 반경, +5 피해.', 1600, (s) => { s.burnZoneRadius *= 1.6; s.damage += 5; }),
        u('재의 강하', '보너스: 네 발의 탄, 연소 구역 그을리기 22 dps.', 3500, (s) => { s.count = Math.max(s.count, 4); s.burnZoneDps = 22; }),
      ]),
    ],
  },
  {
    id: 'gauss', name: '가우스 요새', short: 'GAU', cost: 1500, unlockAt: 260000,
    desc: '요새 등급의 가우스 드라이버: 텅스텐 슬러그 한 발, 무제한 사거리, 터무니없는 단일 대상 펀치. 순수한 운동력이므로 먼저 장갑을 분쇄하라.',
    lore: '메리디안 게이트의 닻포에서 인양. 조준이라기보다 결정한다.',
    color: '#dfe6e9', glow: '#ffffff', style: 'rail',
    base: base({ range: 9999, fireRate: 0.26, damage: 16, damageType: 'kinetic', pierce: 1 }),
    tracks: [
      track('매스 드라이버', [
        u('경화 슬러그', '탄환이 장갑을 분쇄.', 380, (s) => { s.shred = true; }),
        u('고속 장전기', '+45% 발사 속도.', 520, (s) => { s.fireRate *= 1.45; }),
        u('텅스텐 핵', '28 피해.', 760, (s) => { s.damage = 28; }),
        u('완전 관통', '관통 3, +10 피해.', 1200, (s) => { s.pierce = 3; s.damage += 10; }),
        u('포위 파괴자', '보너스: 58 피해.', 2000, (s) => { s.damage = 58; }),
        u('대륙포', '보너스: 2배 피해, 회랑 전체를 관통, 분쇄. 슬러그가 발사 명령보다 먼저 도착한다.', 4200, (s) => { s.damage *= 2; s.pierce = 999; s.shred = true; }),
      ]),
      track('요새', [
        u('스포터 어레이', '위상 은신 함선을 탐지.', 340, (s) => { s.detection = true; }),
        u('쌍둥이 드라이버', '발사당 두 개의 중슬러그, 더 느린 사이클.', 620, (s) => { s.count = 2; s.fireRate *= 0.82; }),
        u('세보 라운드', '장갑 분쇄, +12 피해.', 820, (s) => { s.shred = true; s.damage += 12; }),
        u('살상 명령', '비-보스 헐을 20% HP 이하에서 즉사.', 1300, (s) => { s.execute = 0.2; }),
        u('포위 벽', '보너스: 세 발의 슬러그, +18 피해.', 2100, (s) => { s.count = 3; s.damage += 18; }),
        u('마지막 한마디', '보너스: 2배 피해, 즉사 40%. 생존자가 반박하도록 남겨두지 않는다.', 4400, (s) => { s.damage *= 2; s.execute = 0.4; }),
      ]),
    ],
  },
];

export const TOWER_MAP: Record<string, TowerDef> = Object.fromEntries(TOWERS.map((t) => [t.id, t]));

/** Arsenal display + hotkey order: by unlock threshold, so the menu reads as the
 *  order you actually earn them (EMP Spire sits in its early slot, etc.). */
export const TOWERS_BY_UNLOCK: TowerDef[] = [...TOWERS].sort((a, b) => a.unlockAt - b.unlockAt);

export function computeStats(def: TowerDef, tierA: number, tierB: number): TowerStats {
  const s = { ...def.base };
  for (let i = 0; i < tierA; i++) def.tracks[0].upgrades[i].apply(s);
  for (let i = 0; i < tierB; i++) def.tracks[1].upgrades[i].apply(s);
  // remote balance overrides (identity 1× by default — no-op unless a config is loaded)
  const o = getBalance().tower(def.id);
  s.damage *= o.damageMult;
  s.range *= o.rangeMult;
  s.fireRate *= o.fireRateMult;
  s.projectileSpeed *= o.projectileSpeedMult;
  s.splash *= o.splashMult;
  s.burnZoneRadius *= o.splashMult;
  s.slowPower = Math.min(0.95, s.slowPower * o.slowMult);
  s.burnDps *= o.burnMult;
  s.burnZoneDps *= o.burnMult;
  return s;
}

export function sellValue(invested: number): number {
  return Math.floor(invested * 0.8);
}
