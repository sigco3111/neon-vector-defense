import Modal from '../Modal';

export function HowToPlay({ onDone }: { onDone: () => void }) {
  const steps: [string, string, string][] = [
    ['01', '그리드 건설', 'ARSENAL에서 타워를 선택하거나 (1-9, 0 키 사용) 빈 공간을 클릭하거나 화살표 키와 Enter로 배치하세요. 타워는 자동으로 사거리 안의 적을 공격합니다.'],
    ['CR', '크레딧 관리', '파괴한 함선 hull마다 보상이 들어옵니다. 타워와 업그레이드에 투자하세요.'],
    ['UP', '이중 업그레이드', '배치한 타워를 클릭해 두 갈래 업그레이드 경로로 강화하세요. 첫 캠페인 클리어 후 VETERAN DEPLOY가 새로 배치한 타워를 크레딧이 허락하는 한 tier 4/4까지 자동 업그레이드합니다.'],
    ['AP', '데미지 타입과 Exposed', '물리/에너지/폭발/냉각 데미지는 각기 다른 장갑에 유효합니다. Shred 적중 시 4초간 Exposed 1스택(최대 5스택)이 쌓이며, 이후 모든 데미지의 효율을 끌어올립니다. Mirror Hull은 당신의 주력 데미지 타입을 복제합니다.'],
    ['CD', '사령관 능력', 'Q/W/E/R/T/Y/U 키로 진행에 따라 해제되는 능력을 사용하세요. 궤도 폭격, 시간 감속, 재캘리브레이션 등 라인이 무너질 때 투입합니다.'],
    ['HP', '라인 방어', 'OUT 게이트에 도달한 적은 원자로 코어를 손상시킵니다. 모두 잃으면 등대가 함락됩니다. SPACE 또는 LAUNCH로 다음 웨이브를 시작하고 1x/2x/4x로 속도를 조절하세요.'],
  ];
  return (
    <Modal onClose={onDone} boxClass="overlay-box howto" labelledBy="howto-title" testId="tutorial-overlay">
      <h2 id="howto-title" style={{ color: 'var(--accent)' }}>라인 방어 안내</h2>
      <div className="howto-steps">
        {steps.map(([icon, title, body]) => (
          <div key={title} className="howto-step">
            <span className="howto-icon">{icon}</span>
            <div>
              <div className="howto-title">{title}</div>
              <div className="howto-body">{body}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="overlay-btns">
        <button className="start-btn small" onClick={onDone}>확인 &gt;</button>
      </div>
    </Modal>
  );
}
