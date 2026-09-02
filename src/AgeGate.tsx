import { useEffect, useRef, useState } from 'react';
import { ADULT_MIN_AGE, setAgeFromBirthDate } from './game/consent';
import { sfx } from './game/sound';
import { IS_PORTAL_BUILD } from './game/portal';
import Modal from './Modal';

// Neutral entry age gate (a birth-year selection, NOT "are you 18?"). Required for
// US COPPA: under-13 takes a restricted, no-PII / no-behavioral-data path. Blocks
// first paint until answered. perf/demo bypass this (see App()).
const NOW_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => NOW_YEAR - i);
const MONTHS = [
  ['1', '1월'], ['2', '2월'], ['3', '3월'], ['4', '4월'],
  ['5', '5월'], ['6', '6월'], ['7', '7월'], ['8', '8월'],
  ['9', '9월'], ['10', '10월'], ['11', '11월'], ['12', '12월'],
];

export default function AgeGate({ onDone }: { onDone: () => void }) {
  const [year, setYear] = useState<number | ''>('');
  const [month, setMonth] = useState<number | ''>('');
  const [kid, setKid] = useState(false);
  const monthRef = useRef<HTMLSelectElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);

  // Modal autofocuses the first focusable on mount (= month select); this re-focuses the
  // Enter button when the under-13 safe-mode notice replaces the form.
  useEffect(() => {
    window.setTimeout(() => {
      if (kid) enterRef.current?.focus();
      else monthRef.current?.focus();
    }, 0);
  }, [kid]);

  const confirm = () => {
    if (year === '' || month === '') return;
    sfx.click();
    const band = setAgeFromBirthDate(year, month);
    if (band === 'under13') setKid(true); // brief notice, then continue restricted
    else onDone();
  };

  return (
    <Modal
      onClose={() => {}}
      closeOnBackdrop={false}
      closeOnEsc={false}
      overlayClass="overlay age-gate"
      boxClass="overlay-box age-gate-box"
      labelledBy={kid ? 'age-gate-safe-title' : 'age-gate-title'}
      describedBy={kid ? 'age-gate-safe-copy' : 'age-gate-copy'}
    >
      <div className="age-gate-eyebrow">랜턴 세븐 · 접근</div>
      {kid ? (
        <>
          <h2 id="age-gate-safe-title">환영합니다, 신병</h2>
          <p className="age-gate-copy" id="age-gate-safe-copy">
            지금은 <b>안전 모드</b>입니다. 게임 플레이 방식은 동일하지만 공개 콜사인을 만들지 않고 사용 데이터를 수집하지 않습니다. 즐거운 시간 보내세요.
          </p>
          <button ref={enterRef} className="start-btn" onClick={() => { sfx.click(); onDone(); }}>그리드 진입 ▸</button>
        </>
      ) : (
        <>
          <h2 id="age-gate-title">출격 전 확인</h2>
          <p className="age-gate-copy" id="age-gate-copy">태어난 해와 달을 알려주세요. 개인 정보 옵션을 설정하는 데에만 사용하며 어디에도 공유하지 않습니다.</p>
          <div className="age-gate-row">
            <select
              ref={monthRef}
              className="age-gate-select"
              value={month}
              onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : '')}
              aria-label="태어난 달"
            >
              <option value="">월 선택</option>
              {MONTHS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select
              className="age-gate-select"
              value={year}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
              aria-label="태어난 해"
            >
              <option value="">연도 선택…</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="start-btn" disabled={year === '' || month === ''} onClick={confirm}>확인 ▸</button>
          </div>
          <p className="age-gate-fine">
            {ADULT_MIN_AGE}세 미만 플레이어는 데이터 수집과 공개 리더보드가 없는 안전 모드로 자동 진입합니다.{IS_PORTAL_BUILD ? '' : <> 자세한 내용은 <a href="./privacy">개인정보 처리방침</a>을 확인하세요.</>}
          </p>
        </>
      )}
    </Modal>
  );
}
