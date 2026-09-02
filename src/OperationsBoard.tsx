import { useRef, useState } from 'react';
import { meta, rankBandKey, type QuestWithProgress, type RunMetaReward } from './game/meta';
import { PALETTES, applyAccent } from './game/palette';
import { sfx } from './game/sound';
import SignalSkinPicker from './ui/SignalSkinPicker';
import MapThemePicker from './ui/MapThemePicker';

// Third menu tab: Warden Rank + Salvage wallet + Watch Streak + the daily/weekly
// Operations Board. All reads come from the `meta` singleton (localStorage); claiming a
// completed quest grants XP/salvage. Cosmetic/QoL only — never touches run balance.
export default function OperationsBoard({ onClaimed }: { onClaimed?: () => void } = {}) {
  const [, force] = useState(0);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [flash, setFlash] = useState<{ xp: number; salvage: number; n: number } | null>(null);
  const statusTimer = useRef<number | undefined>(undefined);
  // status renders as a fixed toast that fades out on its own
  const pushStatus = (s: { kind: 'ok' | 'err'; text: string }) => {
    setStatus(s);
    window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus(null), 4200);
  };
  const rerender = () => force((n) => n + 1);
  const showReward = (xp: number, salvage: number) => setFlash((f) => ({ xp, salvage, n: (f?.n ?? 0) + 1 }));
  // shared success epilogue for claim() and claimAll()
  const grant = (r: RunMetaReward, text: string) => {
    pushStatus({ kind: 'ok', text });
    showReward(r.xp, r.salvage);
    sfx.upgrade();
    rerender();
    onClaimed?.();
  };

  const rank = meta.rank;
  const streak = meta.streak;
  const board = meta.board();
  const daily = board.filter((q) => q.period === 'daily');
  const weekly = board.filter((q) => q.period === 'weekly');
  const claimable = board.filter((q) => q.complete && !q.claimed).length;

  const claim = (id: string) => {
    const r = meta.claimQuest(id);
    if (r) {
      grant(r, `${r.breakdown[0]?.label ?? '작전'} 수령: +${r.xp} XP, 인양물 +${r.salvage}.`);
    } else {
      pushStatus({ kind: 'err', text: '해당 작전은 아직 수령할 수 없습니다.' });
      sfx.error();
    }
  };

  const claimAll = () => {
    const r = meta.claimAll();
    if (r.xp > 0 || r.salvage > 0) {
      grant(r, `${r.breakdown.length}개 작전 수령: +${r.xp} XP, 인양물 +${r.salvage}.`);
    }
  };

  return (
    <div className="ops-tab" data-testid="ops-tab">
      <div className="ops-head">
        <div className="ops-rank" data-testid="rank-bar">
          <img className="ops-rank-crest" src={`/art/rank-${rankBandKey(rank.rank)}.webp`} alt="" draggable={false} />
          <div className="ops-rank-body">
            <div className="ops-rank-top">
              <span className="ops-rank-title">{rank.title}</span>
              <span className="ops-rank-xp no-shift-counter">{rank.xpIntoRank.toLocaleString()} / {rank.xpForRank.toLocaleString()} XP</span>
            </div>
            <div className="ops-rank-bar"><div className="ops-rank-fill" style={{ width: `${rank.pct * 100}%` }} /></div>
            <div className="ops-rank-sub">워든 랭크 {rank.rank} · 누적 XP {rank.totalXp.toLocaleString()}</div>
          </div>
          {flash && (
            <div key={flash.n} className="xp-float" onAnimationEnd={() => setFlash(null)} aria-hidden="true">
              +{flash.xp.toLocaleString()} XP{flash.salvage > 0 ? <> · <i className="ico-diamond" />{flash.salvage}</> : ''}
            </div>
          )}
        </div>
        <div className="ops-chips">
          <div className="ops-chip salvage" title="인양물 — 매 런마다 획득, 아래 코스메틱에 사용">
            <span className="ops-chip-val no-shift-counter"><i className="ico-diamond" aria-hidden="true" /> {meta.salvage.toLocaleString()}</span>
            <span className="ops-chip-label">인양물</span>
          </div>
          <div className={`ops-chip streak ${streak.activeToday ? 'active' : streak.current > 0 ? 'warn' : ''}`}
            title={streak.current > 0 && !streak.activeToday ? `오늘 플레이하면 ${streak.current}일 연속 파견이 유지됩니다 (최고: ${streak.best})` : `최고 연속: ${streak.best}일`}>
            <span className="ops-chip-val no-shift-counter">🔥 {streak.current}</span>
            <span className="ops-chip-label">{streak.activeToday ? '일일 연속' : streak.current > 0 ? '오늘 플레이!' : '연속 없음'}</span>
          </div>
        </div>
      </div>

      <div className="ops-shop">
        <div className="menu-section-label">시그널 팔레트</div>
        <div className="palette-row">
          {PALETTES.map((p) => {
            const owned = (p.cost === 0 && !p.unlockOnly) || meta.owns(`palette-${p.id}`);
            const equipped = meta.equippedPalette === p.id;
            const afford = !p.unlockOnly && meta.salvage >= p.cost;
            const short = Math.max(0, p.cost - meta.salvage);
            const paletteLabel = owned
              ? (equipped ? `${p.name} 팔레트 장착됨` : `${p.name} 팔레트 장착`)
              : p.unlockOnly
                ? `${p.name} 팔레트는 인양물 격파 후 해금됩니다`
                : afford
                ? `${p.name} 팔레트 구매 (인양물 ${p.cost})`
                : `${p.name} 팔레트 - 인양물 ${short}개 더 필요`;
            return (
              <button key={p.id} className={`palette-chip ${equipped ? 'equipped' : ''}`} disabled={!owned && !afford}
                title={paletteLabel}
                aria-label={paletteLabel}
                onClick={() => {
                  if (owned) {
                    meta.equip('accent', p.id);
                    applyAccent();
                    sfx.click();
                    rerender();
                  }
                  else if (meta.buyCosmetic(`palette-${p.id}`, p.cost)) {
                    meta.equip('accent', p.id);
                    applyAccent();
                    pushStatus({ kind: 'ok', text: `${p.name} 팔레트를 구매하여 장착했습니다.` });
                    sfx.upgrade();
                    rerender();
                  }
                  else {
                    pushStatus({ kind: 'err', text: `${p.name} - 인양물 ${short}개 더 필요.` });
                    sfx.error();
                  }
                }}>
                <span className="palette-swatch" style={{ background: p.color }} />
                <span className="palette-name">{p.name}</span>
                <span className="palette-tag">
                  {equipped ? '✓ 장착됨' : owned ? '장착' : p.unlockOnly ? '캡털 격파' : afford ? <><i className="ico-diamond" aria-hidden="true" /> {p.cost}</> : <><i className="ico-diamond" aria-hidden="true" /> {short}개 부족</>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="ops-shop" data-testid="ops-shop-signal-skins">
        <div className="menu-section-label">시그널 스킨</div>
        <SignalSkinPicker onChange={(skin) => { pushStatus({ kind: 'ok', text: `${skin.name} 시그널 스킨 장착.` }); sfx.click(); rerender(); }} />
      </div>

      <div className="ops-shop" data-testid="ops-shop-map-themes">
        <div className="menu-section-label">맵 테마</div>
        <MapThemePicker onChange={(pack) => { pushStatus({ kind: 'ok', text: `${pack.name} 맵 테마 장착.` }); sfx.click(); rerender(); }} />
      </div>

      <div className={`ops-status ${status?.kind ?? 'idle'}`} role="status" aria-live="polite" aria-atomic="true" aria-hidden={!status}>
        {status?.text ?? '작전 상태 대기.'}
      </div>

      <div className="ops-board-head">
        <button
          className={`quest-claim claim-all ${claimable >= 2 ? '' : 'is-placeholder'}`}
          disabled={claimable < 2}
          aria-hidden={claimable < 2}
          tabIndex={claimable < 2 ? -1 : undefined}
          onClick={claimAll}
        >
          모두 수령 ({claimable})
        </button>
      </div>
      <div className="ops-board" data-testid="ops-board">
        <QuestColumn label="일일 작전" quests={daily} onClaim={claim} />
        <QuestColumn label="주간 작전" quests={weekly} onClaim={claim} />
      </div>
      <div className="ops-foot">작전은 매일/매주 새로 고침됩니다 · 보상은 코스메틱과 진행도에 한정되며 런 난이도에는 영향을 주지 않습니다.</div>
    </div>
  );
}

function QuestColumn({ label, quests, onClaim }: { label: string; quests: QuestWithProgress[]; onClaim: (id: string) => void }) {
  return (
    <div className="ops-col">
      <div className="menu-section-label">{label}</div>
      {quests.map((q) => {
        const pct = Math.min(100, (q.progress / q.target) * 100);
        return (
          <div key={q.id} className={`quest-card ${q.claimed ? 'claimed' : q.complete ? 'complete' : ''}`} data-testid={`quest-card-${q.id}`}>
            <div className="quest-top">
              <span className="quest-title">
                {q.title}
                {q.scope?.freeplay === true && <span className="quest-scope" title="프리플레이 진행 중에만 누적">프리플레이</span>}
              </span>
              <span className="quest-reward">+{q.rewardXp} XP · <i className="ico-diamond" aria-hidden="true" />{q.rewardSalvage}</span>
            </div>
            <div className="quest-bar"><div className="quest-fill" style={{ width: `${pct}%` }} /></div>
            <div className="quest-bot">
              <span className="quest-prog no-shift-counter">{Math.min(q.progress, q.target).toLocaleString()} / {q.target.toLocaleString()}</span>
              {q.claimed
                ? <span className="quest-done no-shift-action">✓ 수령함</span>
                : q.complete
                  ? <button className="quest-claim no-shift-action" onClick={() => onClaim(q.id)}>수령</button>
                  : <span className="quest-prog dim">진행 중</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
