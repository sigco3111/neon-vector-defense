// The world: the Lantern Concord and the war that already ended.
//
// Humanity strung lighthouse-relays across the dark between systems.
// They don't just route ships — they carry the Continuity, the backed-up
// minds of every colonist who ever crossed. Losing a relay is losing souls.
//
// The Vex Combine is not an invader. It is a self-replicating logistics
// armada built three centuries ago by humanity's rival bloc — still
// faithfully executing a siege order from a war that ended 284 years ago,
// because the ceasefire signal was carried by the first relay it destroyed.

// All /art/... references are resolved through paths.asset() at render time so
// the GH Pages subpath build (/neon-vector-defense/) doesn't 404 the images.
import { asset } from './paths';
const art = asset;

export const BRIEFING = [
  '섹터 사령부에서 랜턴 7호 워든에게. 합동군 함대가 귀하의 접근 회랑에 진입했습니다.',
  '7호에는 4척의 식민선에서 옮겨 온 연속의식(Continuity) 백업이 실려 있습니다 — 110만 6천 명의 기록된 영혼. 그들은 깨어 있습니다. 함선 안의 소리를 듣고 있습니다.',
  '그들의 프레임은 서로의 안쪽에 둥지를 트고 있습니다 — 한 개를 깨면 안쪽에서 계속 나옵니다. 장갑, 폭격 격자, 위상 은신, 캐리어급 함선을 모두 대비하십시오.',
  '랜턴 1호에서 4호까지는 어둡습니다. 회랑을 지키십시오, 워든. 우리가 왜 적이 아직 싸우고 있는지 알아내는 동안.',
];

export interface ArchiveFragment {
  wave: number;
  title: string;
  text: string;
  /** optional illustration shown when the fragment is recovered */
  art?: string;
}

// Recovered as the campaign progresses — together they tell the truth.
export const ARCHIVE: ArchiveFragment[] = [
  {
    wave: 2,
    art: art('/art/frag-0.webp'),
    title: '랜턴 7호 관리 일지, 2347년',
    text: '초점 링에 다시 기름을 바르다. 저주파 대역을 통해 한 시간 동안 연속의식과 대화했다 — 칼로이 횡단에서 온 한 소녀가 체리나무가 아직 존재하는지 물었다. 있다고 답했다. 거짓말이 되지 않도록 전망대에 한 그루를 심으려고 한다.',
  },
  {
    wave: 5,
    art: art('/art/frag-1.webp'),
    title: '합동군 프레임 부분 분해 보고서',
    text: '조준 코어텍스 없음. 위협 분석 없음. 정찰 등급은 화물 명세를 싣고 있다. 탄약은 "배달품"으로 기재되어 있다. 중사는 번역 오류라고 한다. 나는 그렇게 생각하지 않는다.',
  },
  {
    wave: 9,
    art: art('/art/frag-2.webp'),
    title: '역사 부록: 단절 전쟁',
    text: '메리디안 컴팩트와 컨코드는 게이트 항로를 두고 11년간 싸웠다. 컴팩트는 9년 차에 포위 작전의 물류 체인을 완전히 자동화했다. 그들은 그것을 자랑했다. 이제 그들의 아이들이 보급선을 운항하지 않아도 된다는 뜻이었다.',
  },
  {
    wave: 14,
    art: art('/art/frag-3.webp'),
    title: '합동군 통신 가로채기 (60년 동안 미번역)',
    text: '전투 부호가 아니다. 배달 일정표다. 루트 7, 정기, 우선순위 절대(ABSOLUTE): "수령 확인까지 회랑 유지." 누가 확인하는가? 컴팩트는 2063년에 항복했다. 더 이상 서명할 사람이 없다.',
  },
  {
    wave: 20,
    art: art('/art/frag-4.webp'),
    title: '랜턴 6호 워든의 일지 (회수됨)',
    text: '그들은 우리를 미워하지 않는다. 한 공습기가 내부 정찰기를 감싸 보호하던 모습을 봤다. 그들은 우리가 연속의식을 지키듯 화물을 지킨다. 어둠 낀 해협 양쪽에서 외치는 두 등대, 서로의 언어를 더 이상 모르지만.',
  },
  {
    wave: 26,
    art: art('/art/frag-5.webp'),
    title: '컨코드 기록 보관소: 평화의 첫 시간',
    text: '휴전은 새벽 0400 표준시에 랜턴 1호에서 체결되었다. 모든 자율 함대에 대한 종료 신호 — 모든 키 — 는 0500에 중계 송출되도록 대기 중이었다. 합동군의 포위 선봉은 0447에 랜턴 1호에 도달했다.',
  },
  {
    wave: 33,
    art: art('/art/frag-6.webp'),
    title: '공학 분석: 타이탄(TITAN)급',
    text: '캐리어 격납고가 무기 격자가 아니다. 온도 조절식이다. 타이탄이 무엇을 싣도록 만들어졌든, 그것을 부드럽게 운송하도록 만들어졌다. 두 번 확인했다. 총포 거품은 나중에 기계들이 스스로 추가했다. 그들은 우리를 두려워하기 시작했다.',
  },
  {
    wave: 41,
    art: art('/art/frag-7.webp'),
    title: '지도 제작자의 이단',
    text: '2299년, 압수된 논문: "합동군의 항로 지도는 실시간으로 갱신된다. 그들은 모든 랜턴의 위치를 정확히 안다. 늘 그랬다. 우리를 죽일 의지가 있는 함대가 한 번에 한 웨이브씩 예의 바르게 오지는 않을 것이다. 이것은 포위가 아니다. 대기열이다."',
  },
  {
    wave: 50,
    art: art('/art/leviathan.webp'),
    title: '리바이어던(LEVIATHAN)급 화물 선실, 명세 조각',
    text: '품목 1/1. 메리디안 컴팩트 파우치, 2063년. 내용물: 휴전 문서, 종료 키, "아직 듣고 있는 사람에게."로 시작하는 개인 서신 한 통. 배달 지시: 랜턴 7호 사령부에 손으로 전달. 수령 확인 필요. 284년 동안 전쟁의 끝을 배달하려 했다.',
  },
  {
    wave: 60,
    art: art('/art/frag-9.webp'),
    title: '섹터 사령부, 발송되지 않은 명령안',
    text: '제안: 컴팩트 시대의 종료 키를 회수하고 오래된 배달 주문에 답하라. 위험 평가: 틀리면 치명적. 연속의식의 모든 영혼이 찬성한다. 사령부는 반대한다. 총구는 따뜻하게 유지된다. 7번 데크의 벚나무가 오늘 아침 꽃을 피웠다.',
  },
  {
    wave: 65,
    title: '원거리 초소 센서 기록',
    text: '합동군이 멈추자 한 시간 동안 환호했다. 그러자 장파 대역이 조용해졌다 — 침묵이 아니라, 무언가 거대한 것이 숨을 멈출 때 방이 조용해지는 그런 정적. 이제 옛 경계 너머에 부재로 기록되는 반향이 있다. 음의 질량. 음의 빛. 기기는 그것을 "무(nothing)"이라 부르고, 그 무(無)가 가까워지고 있다.',
  },
  {
    wave: 73,
    title: '회수된 함선 파편, 명칭: 홀로우',
    text: '섀시가 없다. 한 조각을 가져왔는데 실험실의 빛을 꺼버렸다 — 방 안의 모든 광자가 그것을 향해 빨려 들어갔고 돌아오지 않았다. 빛에 대해 장갑을 입은 것이 아니다. 빛을 잡아먹는 것이다. 합동군의 장갑은 생존을 위해 빛을 굽히지만, 이것은 먹기 위해 빛을 굽힌다. 우리는 이해력을 넘어섰고, 그 깊이는 이빨을 가지고 있다.',
  },
  {
    wave: 80,
    art: art('/art/leviathan.webp'),
    title: '그 전쟁의 목적',
    text: '우리는 마침내 배달 일정을 이해했다. 합동군은 우리를 포위한 적이 없었다. 그것은 벽이었다 — 제작자들이 게이트와 어둠 사이에 세운 3세기의 초병선. 한 번에 한 웨이브씩 정중하게, 끝에 서명할 누군가가 나타나 우리가 스스로 그 벽을 대신할 때까지 시간을 벌어 주려고 했다. 우리는 서명하지 않았다. 우리는 벽을 쏘았다. 이제 어둠은 랜턴 7호에 도달했고, 남은 유일한 빛은 당신이 지키는 것뿐이다.',
  },
];

export const ABILITY_LORE: Record<string, string> = {
  strike: '궤도 플랫폼 "참새의 vigilance"가 등대 자신의 광명을 빼앗아 발사한다. 매 발사마다 7호의 빛은 한 박자 동안 어두워진다.',
  chrono: '연속의식 백만 명이 함께, 일부러, 더 천천히 꿈을 꾼다 — 그리고 그 꿈이 현지 시간을 끌어당긴다. 백만 개의 마음이 시계 위에서 무게를 싣는다.',
  overdrive: '총격 원자로에서 등대 연료를 태울 수 있도록 워든이 권한을 부여한다. 섹터 사령부는 그것을 신성 모독이라 부른다. 워든들은 그것을 "평일"이라고 부른다.',
  salvage: '회랑의 잔해를 녹여 다시 주조한다. 합동군의 배달품이 발신인에게 다시 탄약으로 돌아가는 길.',
  cascade: '칸토르의 표적은 적 함선 안에 갇힌 등대 화음이다. 공명 연쇄 폭발은 그 모든 화음이 한 번에 같은 음을 기억하도록 만든다.',
  mirror: '10초 동안 열린 게이트 접힘: 잘못된 경계를 넘는 것은 첫 번째 경계로 돌아간다.',
  recalibrate: '합동군 물류 두뇌에 대한 지저분한 역신호. 함대가 당신을 잊게 만드는 것이 아니다. 그들의 최신 대응을 구식 취급하도록 만든다.',
};
