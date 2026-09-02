import { useState } from 'react';
import { sfx, setMuted, isMuted, setMusic, isMusicOn, MUSIC_PACKS, getMusicPack, setMusicPack } from '../game/sound';
import { applyAccessibility } from '../game/settings';
import { progress } from '../game/storage';
import Modal from '../Modal';

function SettingsRow({ name, sub, on, onToggle }: { name: string; sub: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="privacy-control">
      <div>
        <div className="privacy-control-name">{name}</div>
        <div className="privacy-control-sub">{sub}</div>
      </div>
      <button className={`privacy-toggle ${on ? 'on' : ''}`} aria-label={`${name}: ${on ? '켜짐' : '꺼짐'}`} aria-pressed={on} onClick={onToggle}>{on ? '켜짐' : '꺼짐'}</button>
    </div>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const sfxOn = !isMuted();
  const musicOn = isMusicOn();
  return (
    <Modal onClose={onClose} boxClass="overlay-box settings-box" labelledBy="settings-title" style={{ borderColor: 'var(--accent)' }}>
      <h2 id="settings-title" style={{ color: 'var(--accent)' }}>설정</h2>
      <div className="privacy-controls">
        <SettingsRow name="효과음" sub="절차적으로 생성되는 전투 음향." on={sfxOn}
          onToggle={() => { setMuted(sfxOn); rerender(); if (!sfxOn) sfx.click(); }} />
        <SettingsRow name="음악" sub="절차적으로 생성되는 음악." on={musicOn}
          onToggle={() => { setMusic(!musicOn); rerender(); }} />
        <div className="privacy-control">
          <div>
            <div className="privacy-control-name" id="settings-music-pack-label">음악 팩</div>
            <div className="privacy-control-sub">사운드트랙을 선택하세요.</div>
          </div>
          <select className="age-gate-select settings-select" aria-labelledby="settings-music-pack-label" value={getMusicPack()}
            onChange={(e) => { setMusicPack(e.target.value); rerender(); sfx.click(); }}>
            {MUSIC_PACKS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <SettingsRow name="모션 감소" sub="화면 흔들림과 적색 데미지 플래시를 끕니다." on={progress.reducedMotion}
          onToggle={() => { progress.reducedMotion = !progress.reducedMotion; applyAccessibility(); rerender(); sfx.click(); }} />
        <SettingsRow name="색맹 팔레트" sub="색맹 친화 데미지 타입 색상(물리/에너지/냉각/폭발)." on={progress.colorblind}
          onToggle={() => { progress.colorblind = !progress.colorblind; applyAccessibility(); rerender(); sfx.click(); }} />
      </div>
      <div className="overlay-btns"><button className="start-btn small" onClick={onClose}>완료 ▸</button></div>
    </Modal>
  );
}
