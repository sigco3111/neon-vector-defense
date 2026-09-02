import { useEffect, useState } from 'react';
import { ENEMY_LIST } from './game/enemies';
import { ELITE_AFFIX_META, ELITE_VARIANT_DEF } from './game/eliteAffixes';
import { progress } from './game/storage';
import { sfx } from './game/sound';
import EnemyPortrait from './EnemyPortrait';
import Modal from './Modal';
import type { EnemyDef } from './game/types';

// The Combine Bestiary — a browsable codex of every hull. Undiscovered entries show a
// blacked-out silhouette plus a redacted teaser (trait count / capital-class) to create
// collection tension; an enemy is "identified" the first time it's seen in the field
// (progress.enemiesSeen, set by the in-game NEW HOSTILE reveal).

function traits(d: EnemyDef): string[] {
  const t: string[] = [];
  if (d.boss) t.push('캡털 함선');
  if (d.armored) t.push('물리 저항');
  if (d.immuneExplosive) t.push('폭발 저항');
  if (d.immuneCryo) t.push('냉각 저항');
  if (d.resist?.energy) t.push('에너지 저항');
  if (d.id === 'mirror') t.push('적응형 미러');
  if (d.heal) t.push('자가 수복');
  return t;
}

function tacticalNote(d: EnemyDef): string | null {
  const notes: string[] = [];
  if (d.armored) notes.push('AP가 Exposed를 쌓은 다음에만 물리탄이 먹힙니다');
  if (d.immuneExplosive) notes.push('폭발 장갑은 Exposed가 깨지면 비로소 약해집니다');
  if (d.immuneCryo) notes.push('냉각 공격은 저항되며 Exposed로만 유효해집니다');
  if (d.resist?.energy) notes.push('에너지 면이 전력 손실을 막지만, Exposed가 각도를 벗겨냅니다');
  if (d.id === 'mirror') notes.push('스폰 시 주력 데미지 타입을 복사합니다. 다양화하거나 Exposed를 쌓거나 재캘리브레이트를 사용하세요');
  return notes.length ? notes.join('; ') + '.' : null;
}

type Filter = 'all' | 'found' | 'locked' | 'boss';
const FILTERS: [Filter, string][] = [['all', '전체'], ['found', '식별됨'], ['locked', '미식별'], ['boss', '캡털 함선']];

export default function Bestiary({ onClose }: { onClose: () => void }) {
  const seen = new Set(progress.enemiesSeen);
  const total = ENEMY_LIST.length;
  const found = ENEMY_LIST.filter((d) => seen.has(d.id)).length;
  const eliteSeen = seen.has(ELITE_VARIANT_DEF.id);
  const [filter, setFilter] = useState<Filter>('all');

  // opening the codex acknowledges every identified hull so the NEW badge clears
  useEffect(() => { progress.bestiaryAck = found; }, [found]);

  const list = ENEMY_LIST.filter((d) => {
    if (filter === 'found') return seen.has(d.id);
    if (filter === 'locked') return !seen.has(d.id);
    if (filter === 'boss') return d.boss;
    return true;
  });

  return (
    <Modal onClose={onClose} overlayClass="bestiary-overlay" boxClass="bestiary" labelledBy="bestiary-title" testId="bestiary">
      <div className="bestiary-head">
        <span className="bestiary-title" id="bestiary-title">콤바인 도감</span>
        <span className="bestiary-count" aria-live="polite">{found} / {total} 식별됨</span>
        <button className="bestiary-close" onClick={onClose} aria-label="닫기">✕</button>
      </div>
      {/* a plain toggle-button group, not an ARIA tablist (no tabpanel/roving-tabindex model) */}
      <div className="bestiary-filters" role="group" aria-label="함선 필터">
        {FILTERS.map(([f, label]) => (
          <button key={f} type="button" aria-pressed={filter === f}
            className={`bestiary-filter ${filter === f ? 'on' : ''}`}
            onClick={() => { setFilter(f); sfx.click(); }}>{label}</button>
        ))}
      </div>
      {eliteSeen && (
        <div className="bestiary-elite-note">
          <div className="foe-name" style={{ color: ELITE_VARIANT_DEF.glow }}>{ELITE_VARIANT_DEF.name}</div>
          <div className="foe-traits">
            {Object.values(ELITE_AFFIX_META).map((affix) => <span key={affix.name}>{affix.name.toUpperCase()}</span>)}
          </div>
          <div className="foe-lore">{ELITE_VARIANT_DEF.lore}</div>
        </div>
      )}
      <div className="bestiary-grid">
        {list.map((d) => {
          const known = seen.has(d.id);
          const tlist = traits(d);
          const note = tacticalNote(d);
          return (
            <div key={d.id} className={`foe-card ${known ? '' : 'foe-unknown'} ${d.boss ? 'foe-boss' : ''}`}>
              <div className="foe-portrait">
                <EnemyPortrait def={d} unknown={!known} />
                {!known && <div className="foe-lock">?</div>}
              </div>
              <div className="foe-name" style={known ? { color: d.glow } : undefined}>
                {known ? d.name : d.boss ? '캡털 클래스' : '미식별'}
              </div>
              {known ? (
                <>
                  <div className="foe-traits">{tlist.map((t) => <span key={t}>{t}</span>)}</div>
                  <div className="foe-lore">{d.lore}</div>
                  {note && <div className="foe-lore dim">{note}</div>}
                </>
              ) : (
                <>
                  <div className="foe-traits redacted">
                    <span>{tlist.length > 0 ? `${tlist.length}개 특성 등급 비밀` : '정보 없음'}</span>
                  </div>
                  <div className="foe-lore dim">{d.boss ? '캡털 클래스 위협 — 비공개. 교전하여 등급을 해제하세요.' : '현장 데이터 없음. 교전하여 식별하세요.'}</div>
                </>
              )}
            </div>
          );
        })}
        {list.length === 0 && <div className="bestiary-empty">이 필터에 해당하는 함선이 아직 없습니다 — 콤바인과 교전하여 도감을 채워보세요.</div>}
      </div>
      <div className="bestiary-foot">벡스 콤바인 — 자기 복제하는 기계 집합체. 함선을 만나면 도감에 추가됩니다.</div>
    </Modal>
  );
}
