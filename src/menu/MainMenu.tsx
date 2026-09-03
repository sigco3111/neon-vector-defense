import { useEffect, useRef, useState } from 'react';
import { W, H } from '../game/engine';
import { TOWERS_BY_UNLOCK } from '../game/towers';
import { ALL_MAPS, DIFFICULTIES } from '../game/maps';
import { ENEMY_LIST } from '../game/enemies';
import { progress } from '../game/storage';
import { appMetrics } from '../game/metrics';
import { dailyModifierNames, type DailyChallenge } from '../game/dailyChallenge';
import { THE_YAKKOB } from '../game/yakkob';
import { YakkobDwarf } from './YakkobDwarf';
import type { ProtocolDrill } from '../game/protocolDrills';
import { weeklyModifierNames, type WeeklyChallenge, type WeeklyGauntletDoc } from '../game/weeklyChallenge';
import type { GauntletProtocolRoute } from '../game/gauntletProtocol';
import { fetchReplayOfTheDay, type ReplaySpotlight } from '../game/replaySpotlight';

import { sfx } from '../game/sound';
import { asset as art, homeUrl, runUrl } from '../game/paths';
import OperationsBoard from '../OperationsBoard';
import Bestiary from '../Bestiary';
import { meta, rankBandKey } from '../game/meta';
import type { GameMap, DifficultyDef } from '../game/types';
import { DEMO_MODE } from '../appShared';
import { LeaderboardTab } from './LeaderboardTab';
import { HowToPlay } from '../game-ui/HowToPlay';
import { SettingsPanel } from '../game-ui/SettingsPanel';
import { IS_PORTAL_BUILD } from '../game/portal';

// ---------------- Main menu ----------------

type DeployMode = 'campaign' | 'daily' | 'drill' | 'weekly' | 'gauntlet' | 'gauntletProtocol' | 'yakkob';

const ATLAS_POS: Record<string, [number, number]> = {
  orbital: [8, 34],
  carousel: [16, 60],
  reactor: [25, 30],
  splice: [34, 56],
  mobius: [43, 34],
  mirror: [52, 62],
  hyperlane: [61, 30],
  blackout: [69, 56],
  throat: [77, 74],
  foundry: [75, 38],
  umbral: [88, 52],
  cinder: [94, 74],
};

function atlasPos(mapId: string, index: number): [number, number] {
  return ATLAS_POS[mapId] ?? [12 + index * 10, index % 2 ? 58 : 32];
}

type AtlasRegion = 'core' | 'forge' | 'dark';

function atlasRegion(mapId: string): AtlasRegion {
  if (['splice', 'foundry', 'cinder'].includes(mapId)) return 'forge';
  if (['blackout', 'throat', 'umbral'].includes(mapId)) return 'dark';
  return 'core';
}

function atlasRegionLabel(region: AtlasRegion): string {
  if (region === 'forge') return '포지 섹터';
  if (region === 'dark') return '암흑 섹터';
  return '코어 섹터';
}

function masteryLevel(mapId: string): number {
  const anyCampaignClear = DIFFICULTIES.some((d) => progress.best(mapId, d.id) >= d.waves);
  const recruitClear = progress.mapCleared(mapId) || anyCampaignClear;
  const apexClear = progress.best(mapId, 'hard') >= (DIFFICULTIES.find((d) => d.id === 'hard')?.waves ?? 70);
  const extinctionClear = progress.best(mapId, 'extinction') >= (DIFFICULTIES.find((d) => d.id === 'extinction')?.waves ?? 80);
  return (recruitClear ? 1 : 0) + (apexClear ? 1 : 0) + (extinctionClear ? 1 : 0);
}

function MasteryStars({ level, label = '마스터리' }: { level: number; label?: string }) {
  return (
    <span className="atlas-mastery" aria-label={`${label}: ${level} / 3 별`}>
      {'★'.repeat(level)}<span>{'★'.repeat(3 - level)}</span>
    </span>
  );
}

function PathGlyph({ map, className = '' }: { map: GameMap; className?: string }) {
  const points = map.path.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <svg className={`atlas-path-glyph ${className}`} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
      <polyline points={points} />
    </svg>
  );
}

// Sequential unlock: a sector opens only once every prior sector has been
// progressed (cleared, or reached wave 20+). No swiss-cheese gaps.
function mapProgressed(m: GameMap): boolean {
  if (DEMO_MODE) return true;
  return progress.mapCleared(m.id) || progress.bestWaveAny(m.id) >= 20;
}
function mapUnlocked(idx: number): boolean {
  if (DEMO_MODE) return true;
  // Grandfather: a sector the player has already played (any wave recorded or a
  // clear) never re-locks — inserting new maps into the chain must not take away
  // access veterans earned under the old ordering.
  const m = ALL_MAPS[idx];
  if (m && (progress.mapCleared(m.id) || progress.bestWaveAny(m.id) > 0)) return true;
  if (idx < 2) return true;
  for (let i = 0; i < idx; i++) if (!mapProgressed(ALL_MAPS[i])) return false;
  return true;
}

// Featured "Replay of the Day" spotlight — pulls a deterministic strong run from
// the live global boards. Renders nothing while loading or when no replay exists,
// so it never shows an empty box. The WATCH anchor reuses the ?run deep link;
// ReplayViewer records the watch telemetry on mount, so none is wired here.
function ReplayOfTheDayCard() {
  const [spot, setSpot] = useState<ReplaySpotlight | null>(null);
  useEffect(() => {
    let live = true;
    fetchReplayOfTheDay().then((s) => { if (live) setSpot(s); });
    return () => { live = false; };
  }, []);
  if (!spot) return null;
  return (
    <div className="replay-of-day-card">
      <div>
        <div className="replay-of-day-kicker">오늘의 리플레이</div>
        <div className="replay-of-day-title">{spot.callsign} · Wave {spot.wave}</div>
        <div className="replay-of-day-rules">{spot.mapName} · {spot.diffName}</div>
      </div>
      <a className="replay-of-day-watch" href={runUrl(spot.runId)} title="오늘의 추천 배틀플랜 관전">▶ 관전</a>
    </div>
  );
}

function CommanderDossierRail({ onOpenOps }: { onOpenOps: () => void }) {
  const rank = meta.rank;
  const streak = meta.streak;
  return (
    <aside className="commander-rail" data-testid="commander-rail">
      <button className="rail-rank" onClick={onOpenOps} title="운영 열기">
        <img className="rail-rank-crest" src={art(`/art/rank-${rankBandKey(rank.rank)}.webp`)} alt="" draggable={false} decoding="async" />
        <span>
          <b>{rank.title}</b>
          <i><span style={{ width: `${rank.pct * 100}%` }} /></i>
        </span>
      </button>
      <div className="rail-wallet">
        <span><i className="ico-diamond" aria-hidden="true" /> {meta.salvage.toLocaleString()} 인양물</span>
        <span>{streak.current}일 연속 출격</span>
      </div>
      <div className="rail-stats">
        <div><b>{progress.record.victories}</b><span>지킨 등대 수</span></div>
        <div><b>{progress.record.kills.toLocaleString()}</b><span>격파한 함선</span></div>
        <div><b>{progress.totalWaves}</b><span>클리어한 웨이브</span></div>
        <div><b>{meta.bestDailyWave || '-'}</b><span>데일리 최고 웨이브</span></div>
      </div>
      <ReplayOfTheDayCard />
    </aside>
  );
}

function WeeklyOpsSection(props: {
  weeklySeed: WeeklyChallenge;
  gauntlet: WeeklyGauntletDoc | null;
  gauntletProtocol: GauntletProtocolRoute;
  gauntletProtocolUnlocked: boolean;
  yakkobUnlocked: boolean;
  yakkobJustPlaced: boolean;
  onStartYakkob: () => void;
  deployMode: DeployMode;
  setDeployMode: (mode: DeployMode) => void;
}) {
  const weeklyMods = weeklyModifierNames(props.weeklySeed);
  return (
    <div className="weekly-ops-strip atlas-weekly-ops" data-testid="weekly-ops-strip">
      {props.yakkobUnlocked ? (
        // Unlocked: 더 야콥 takes the Weekly Mutation's slot as a glowing special edition
        // and calls for a press. `yakkob-shimmer` fires a one-shot light sweep the moment it lands.
        <button
          className={`weekly-op-card yakkob-op-card yakkob-attn ${props.yakkobJustPlaced ? 'yakkob-shimmer' : ''} ${props.deployMode === 'yakkob' ? 'active' : ''}`}
          data-testid="yakkob-card"
          aria-label="더 야콥 출격"
          title={THE_YAKKOB.rules.join('\n')}
          onClick={() => { props.setDeployMode('yakkob'); props.onStartYakkob(); }}
        >
          <span>✦ 더 야콥 ✦</span>
          <b>Prism Array · Watchfire Beacon</b>
          <em className="yakkob-cta" aria-hidden="true">▶ 탭하여 출격</em>
        </button>
      ) : (
        <button
          className={`weekly-op-card ${props.deployMode === 'weekly' ? 'active' : ''}`}
          data-testid="weekly-mutation-card"
          aria-pressed={props.deployMode === 'weekly'}
          title={props.weeklySeed.rules.join('\n')}
          onClick={() => { props.setDeployMode('weekly'); sfx.click(); }}
        >
          <span>주간 변이</span>
          <b>{weeklyMods.slice(0, 4).join(' / ')}</b>
        </button>
      )}
      <button
        className={`weekly-op-card ${props.deployMode === 'gauntlet' ? 'active' : ''}`}
        data-testid="weekly-gauntlet-card"
        aria-pressed={props.deployMode === 'gauntlet'}
        aria-disabled={!props.gauntlet}
        title={props.gauntlet ? `${props.gauntlet.callsign}의 웨이브 ${props.gauntlet.wave} 돌파` : '아직 주간 챔피언 건틀릿 우승자가 없습니다.'}
        onClick={() => { if (props.gauntlet) { props.setDeployMode('gauntlet'); sfx.click(); } }}
      >
        <span>챔피언 건틀릿</span>
        <b>{props.gauntlet ? `${props.gauntlet.callsign}의 웨이브 ${props.gauntlet.wave} 돌파` : '아직 우승자가 없습니다'}</b>
      </button>
      <button
        className={`weekly-op-card ${props.deployMode === 'gauntletProtocol' ? 'active' : ''}`}
        data-testid="gauntlet-protocol-card"
        aria-pressed={props.deployMode === 'gauntletProtocol'}
        aria-disabled={!props.gauntletProtocolUnlocked}
        title={props.gauntletProtocolUnlocked ? `경로: ${routeNames(props.gauntletProtocol.route)}` : '캠페인 클리어 필요'}
        onClick={() => { if (props.gauntletProtocolUnlocked) { props.setDeployMode('gauntletProtocol'); sfx.click(); } }}
      >
        <span>건틀릿 프로토콜</span>
        <b>{props.gauntletProtocolUnlocked ? `경로: ${routeNames(props.gauntletProtocol.route)}` : '캠페인 클리어 필요'}</b>
      </button>
    </div>
  );
}

function SectorAtlas(props: {
  map: GameMap;
  diff: DifficultyDef;
  setMap: (m: GameMap) => void;
  setDiff: (d: DifficultyDef) => void;
  deployMode: DeployMode;
  setDeployMode: (mode: DeployMode) => void;
  dailySeed: DailyChallenge;
  drills: ProtocolDrill[];
  selectedDrill: ProtocolDrill;
  setSelectedDrill: (drill: ProtocolDrill) => void;
  weeklySeed: WeeklyChallenge;
  gauntlet: WeeklyGauntletDoc | null;
  gauntletProtocol: GauntletProtocolRoute;
  gauntletProtocolUnlocked: boolean;
  yakkobUnlocked: boolean;
  onStartYakkob: () => void;
  firstTime: boolean;
  apexLocked: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const weeklyRef = useRef<HTMLDivElement>(null);
  // dock has two faces: campaign protocols vs seeded challenges (daily + weekly ops)
  const [dockTab, setDockTab] = useState<'protocols' | 'challenges'>(
    props.deployMode === 'campaign' ? 'protocols' : 'challenges');
  // one-shot shimmer sweep on the YAKKOB card the moment it lands in the dock
  const [yakkobPlaced, setYakkobPlaced] = useState(false);
  const prevYakkobUnlocked = useRef(props.yakkobUnlocked);
  const dailyMods = dailyModifierNames(props.dailySeed);
  const selectedMap = ALL_MAPS.find((m) => m.id === props.map.id) ?? ALL_MAPS[0];
  const selectedMastery = masteryLevel(selectedMap.id);
  const selectedBest = progress.bestWaveAny(selectedMap.id);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const draw = () => {
      const rect = field.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      let seed = 7331;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
      ctx.fillStyle = 'rgba(207,217,255,0.72)';
      for (let i = 0; i < 150; i++) {
        ctx.globalAlpha = 0.12 + rnd() * 0.5;
        const size = rnd() < 0.1 ? 2 : 1;
        ctx.fillRect(rnd() * rect.width, rnd() * rect.height, size, size);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(75,207,250,0.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      for (let i = 0; i < ALL_MAPS.length - 1; i++) {
        const [ax, ay] = atlasPos(ALL_MAPS[i].id, i);
        const [bx, by] = atlasPos(ALL_MAPS[i + 1].id, i + 1);
        ctx.beginPath();
        ctx.moveTo((ax / 100) * rect.width, (ay / 100) * rect.height);
        ctx.lineTo((bx / 100) * rect.width, (by / 100) * rect.height);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    };
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, []);

  useEffect(() => {
    const idx = ALL_MAPS.findIndex((m) => m.id === props.map.id);
    if (idx >= 0 && !mapUnlocked(idx)) {
      const fallback = ALL_MAPS.find((_, i) => mapUnlocked(i));
      if (fallback) props.setMap(fallback);
    }
  }, [props.map, props.setMap]);

  // The moment THE YAKKOB unlocks: flip the dock to CHALLENGES, scroll its card (row 2,
  // right under DAILY) into view, focus it, and fire the one-shot shimmer.
  useEffect(() => {
    if (props.yakkobUnlocked && !prevYakkobUnlocked.current) {
      setDockTab('challenges');
      setYakkobPlaced(true);
      const raf = requestAnimationFrame(() => {
        const card = weeklyRef.current?.querySelector<HTMLButtonElement>('[data-testid="yakkob-card"]');
        card?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        card?.focus();
      });
      const clear = setTimeout(() => setYakkobPlaced(false), 1500);
      prevYakkobUnlocked.current = props.yakkobUnlocked;
      return () => { cancelAnimationFrame(raf); clearTimeout(clear); };
    }
    prevYakkobUnlocked.current = props.yakkobUnlocked;
  }, [props.yakkobUnlocked]);

  const moveNodeFocus = (current: HTMLButtonElement, delta: number) => {
    const nodes = [...fieldRef.current?.querySelectorAll<HTMLButtonElement>('[data-atlas-node="true"]') ?? []];
    const at = nodes.indexOf(current);
    if (at < 0 || nodes.length === 0) return;
    nodes[(at + delta + nodes.length) % nodes.length].focus();
  };

  const openWeeklyOps = () => {
    // the beacon SELECTS the weekly mutation, it doesn't just point at it —
    // clicking a glowing map node and having nothing change reads as broken
    setDockTab('challenges');
    props.setDeployMode('weekly');
    sfx.click();
    requestAnimationFrame(() => {
      weeklyRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      weeklyRef.current?.querySelector<HTMLButtonElement>('[data-testid="weekly-mutation-card"]')?.focus();
    });
  };

  return (
    <section className="sector-atlas" data-testid="sector-atlas" aria-label="섹터 아틀라스">
      <div className="atlas-field" ref={fieldRef} data-testid="atlas-field">
        <canvas className="atlas-stars-canvas" ref={canvasRef} aria-hidden="true" />
        <div className="atlas-region-label atlas-region-core">코어 릴레이</div>
        <div className="atlas-region-label atlas-region-forge">포지 벨트</div>
        <div className="atlas-region-label atlas-region-dark">암흑 권역</div>
        {ALL_MAPS.map((m, i) => {
          const unlocked = mapUnlocked(i);
          const active = props.deployMode === 'campaign' && props.map.id === m.id;
          const [x, y] = atlasPos(m.id, i);
          const prior = ALL_MAPS[Math.max(0, i - 1)];
          const lockCopy = `${prior.name}을(를) 클리어하거나 웨이브 20에 도달하여 해제하세요.`;
          const region = atlasRegion(m.id);
          return (
            <button
              key={m.id}
              type="button"
              className={`atlas-node atlas-node-${region} ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}`}
              data-atlas-node="true"
              data-testid={`map-node-${m.id}`}
              aria-disabled={!unlocked}
              aria-label={unlocked ? `${m.name}. ${m.difficulty} 섹터. ${m.desc}` : `잠긴 섹터. ${lockCopy}`}
              title={unlocked ? m.desc : lockCopy}
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => {
                if (!unlocked) {
                  appMetrics.recordLockedMapClick(m.id);
                  return;
                }
                appMetrics.recordMapSelect(m.id);
                props.setDeployMode('campaign');
                setDockTab('protocols');
                props.setMap(m);
                sfx.click();
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  moveNodeFocus(e.currentTarget, 1);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  moveNodeFocus(e.currentTarget, -1);
                }
              }}
            >
              {!active && props.firstTime && i === 0 && <span className="start-pill atlas-start">여기서 시작</span>}
              <span className="atlas-node-halo">
                <PathGlyph map={m} className={region} />
              </span>
              <span className="atlas-node-name">{unlocked ? m.name : '미분류'}</span>
              <MasteryStars level={unlocked ? masteryLevel(m.id) : 0} label={`${m.name} 마스터리`} />
            </button>
          );
        })}
        <button
          type="button"
          className="atlas-node atlas-weekly-beacon"
          data-atlas-node="true"
          data-testid="weekly-ops-beacon"
          aria-label="주간 운영 열기"
          style={{ left: '90%', top: '30%' }}
          onClick={openWeeklyOps}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              moveNodeFocus(e.currentTarget, 1);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              moveNodeFocus(e.currentTarget, -1);
            }
          }}
        >
          <span className="atlas-node-halo">
            <PathGlyph map={selectedMap} className="weekly" />
          </span>
          <span className="atlas-node-name">주간 운영</span>
        </button>
      </div>

      <aside className="atlas-dock" data-testid="sector-dock" aria-live="polite">
        <div className="dock-kicker">{atlasRegionLabel(atlasRegion(selectedMap.id))}</div>
        <h2>{selectedMap.name}</h2>
        <div className="dock-mastery-row">
          <MasteryStars level={selectedMastery} />
          <span>{selectedMastery}/3 마스터리</span>
        </div>
        <p>{selectedMap.desc}</p>
        <div className="dock-stat-grid">
          <div><span>최고 웨이브</span><b>{selectedBest > 0 ? `W${selectedBest}` : '-'}</b></div>
          <div><span>난이도</span><b>{selectedMap.difficulty === 'Easy' ? '쉬움' : selectedMap.difficulty === 'Medium' ? '보통' : selectedMap.difficulty === 'Hard' ? '어려움' : selectedMap.difficulty}</b></div>
        </div>
        <div className="dock-tabs" role="tablist" aria-label="출격 옵션">
          <button
            role="tab"
            data-testid="dock-tab-protocols"
            aria-selected={dockTab === 'protocols'}
            className={dockTab === 'protocols' ? 'on' : ''}
            onClick={() => { setDockTab('protocols'); sfx.click(); }}
          >프로토콜</button>
          <button
            role="tab"
            data-testid="dock-tab-challenges"
            aria-selected={dockTab === 'challenges'}
            className={dockTab === 'challenges' ? 'on' : ''}
            onClick={() => { setDockTab('challenges'); sfx.click(); }}
          >도전</button>
        </div>
        {dockTab === 'protocols' ? (
        <div className="diff-row atlas-protocols" data-testid="diff-row">
          {DIFFICULTIES.map((d) => {
            const locked = (d.id === 'hard' && props.apexLocked)
              || (d.id === 'extinction' && !DEMO_MODE && !progress.apexCleared);
            const active = props.deployMode === 'campaign' && props.diff.id === d.id;
            const reason = d.id === 'extinction'
              ? { label: '잠긴 말멸', desc: '정점 캠페인을 클리어하여 해제하세요.', title: '정점을 클리어해야 말멸에 도전할 수 있습니다.' }
              : { label: '잠긴 정점', desc: '캠페인 하나를 클리어하여 해제하세요.', title: '캠페인을 하나 클리어하면 정점이 열립니다.' };
            if (locked) {
              return (
                <button key={d.id} type="button" className="diff-card atlas-protocol-row diff-locked" data-testid={`diff-card-${d.id}`}
                  aria-disabled="true" aria-label={`잠긴 프로토콜. ${reason.desc}`} title={reason.title}
                  onClick={() => appMetrics.recordLockedProtocolClick(d.id)}>
                  <span className="diff-name">{reason.label}</span>
                  <span className="diff-desc">{reason.desc}</span>
                </button>
              );
            }
            return (
              <button
                key={d.id}
                className={`diff-card atlas-protocol-row ${active ? 'active' : ''} ${d.id === 'extinction' ? 'diff-extinction' : ''}`}
                data-testid={`diff-card-${d.id}`}
                aria-label={`${d.name} 프로토콜. ${d.desc}`}
                title={d.desc}
                onClick={() => { appMetrics.recordProtocolSelect(d.id); props.setDeployMode('campaign'); sfx.click(); props.setDiff(d); }}
              >
                {!active && props.firstTime && d.id === 'easy' && <span className="start-pill">추천</span>}
                <span className="diff-name">{d.name}</span>
                <span className="diff-desc">{d.waves} 웨이브 · 최고 {progress.best(selectedMap.id, d.id) ? `W${progress.best(selectedMap.id, d.id)}` : '—'}</span>
              </button>
            );
          })}
        </div>
        ) : (
        <div className="dock-challenges" ref={weeklyRef} data-testid="dock-challenges">
          <button
            className={`diff-card atlas-protocol-row daily-protocol ${props.deployMode === 'daily' ? 'active' : ''}`}
            data-testid="diff-card-daily"
            aria-label={`데일리 챌린지 프로토콜. ${dailyMods.join(', ')}`}
            aria-pressed={props.deployMode === 'daily'}
            title={props.dailySeed.rules.join('\n')}
            onClick={() => { props.setDeployMode('daily'); sfx.click(); }}
          >
            <span className="diff-name">데일리 챌린지</span>
            <span className="diff-desc daily-card-mods">{dailyMods.join(' / ')}</span>
          </button>
          <WeeklyOpsSection
            weeklySeed={props.weeklySeed}
            gauntlet={props.gauntlet}
            gauntletProtocol={props.gauntletProtocol}
            gauntletProtocolUnlocked={props.gauntletProtocolUnlocked}
            yakkobUnlocked={props.yakkobUnlocked}
            yakkobJustPlaced={yakkobPlaced}
            onStartYakkob={props.onStartYakkob}
            deployMode={props.deployMode}
            setDeployMode={props.setDeployMode}
          />
        </div>
        )}
      </aside>
    </section>
  );
}

export function MainMenu(props: {
  map: GameMap; diff: DifficultyDef;
  setMap: (m: GameMap) => void; setDiff: (d: DifficultyDef) => void;
  dailySeed: DailyChallenge;
  drills: ProtocolDrill[];
  weeklySeed: WeeklyChallenge;
  gauntlet: WeeklyGauntletDoc | null;
  gauntletProtocol: GauntletProtocolRoute;
  onStart: () => void;
  onStartDaily: () => void;
  onStartDrill: (drill: ProtocolDrill) => void;
  onStartWeekly: () => void;
  onStartGauntlet: () => void;
  onStartGauntletProtocol: () => void;
  onStartYakkob: () => void;
  yakkobUnlocked: boolean;
  onUnlockYakkob: () => void;
}) {
  const [tab, setTab] = useState<'deploy' | 'board' | 'ops'>('deploy');
  const [deployMode, setDeployMode] = useState<DeployMode>('campaign');
  const [selectedDrill, setSelectedDrill] = useState(props.drills[0]);
  const [, bumpClaim] = useState(0); // re-read meta.claimableCount() for the nav badge after a claim
  const [help, setHelp] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bestiaryOpen, setBestiaryOpen] = useState(false);
  // Apex unlocks on a COMPLETED campaign (a win), matching its "survive one campaign"
  // copy — not on any run end (an instant wave-1 loss used to unlock it).
  const apexLocked = !DEMO_MODE && progress.record.victories < 1;
  const firstTime = !DEMO_MODE && progress.record.runs < 1;
  const gauntletProtocolUnlocked = DEMO_MODE || progress.record.victories >= 1;
  const selectedUnlocked = deployMode === 'daily' || deployMode === 'drill' || deployMode === 'weekly' || deployMode === 'gauntlet'
    || (deployMode === 'gauntletProtocol' && gauntletProtocolUnlocked)
    || (deployMode === 'yakkob' && props.yakkobUnlocked)
    || mapUnlocked(ALL_MAPS.findIndex((m) => m.id === props.map.id));
  // nav-tab cues: claimable operations + newly-identified hulls awaiting a Bestiary visit.
  // foesSeen must use the SAME basis the Bestiary acks with (ENEMY_LIST intersection, not the
  // raw persisted list) or a stale/removed enemy id would make the NEW badge stick forever.
  const claimable = DEMO_MODE ? 0 : meta.claimableCount();
  const foesSeen = ENEMY_LIST.filter((d) => progress.enemiesSeen.includes(d.id)).length;
  const foesNew = Math.max(0, foesSeen - progress.bestiaryAck);
  return (
    <div className="menu-root">
      <div className="menu-stars" />

      {tab === 'deploy' && !props.yakkobUnlocked && (
        <YakkobDwarf onUnlock={() => { props.onUnlockYakkob(); setDeployMode('yakkob'); }} />
      )}

      <header className="menu-topbar">
        <div className="menu-brand">
          <span className="menu-eyebrow">섹터 방어 프로토콜</span>
          <h1 className="menu-title">랜턴<span> 7</span></h1>
        </div>
        <nav className="menu-tabs" aria-label="메인 메뉴 영역">
          <button className={tab === 'deploy' ? 'on' : ''} aria-pressed={tab === 'deploy'} onClick={() => { appMetrics.recordMenuTab('deploy'); setTab('deploy'); sfx.click(); }}>출격</button>
          <button className={tab === 'board' ? 'on' : ''} aria-pressed={tab === 'board'} onClick={() => { appMetrics.recordMenuTab('board'); setTab('board'); sfx.click(); }}>리더보드</button>
          <button className={tab === 'ops' ? 'on' : ''} aria-pressed={tab === 'ops'} onClick={() => { setTab('ops'); sfx.click(); }}>
            운영{claimable > 0 && <span className="tab-badge" aria-label={`${claimable}개 보상 수령 가능`}>{claimable}</span>}
          </button>
          <button className="menu-tab-help" title={`Combine Bestiary — ${foesSeen}/${ENEMY_LIST.length} 함선 동정 완료`}
            data-testid="menu-utility-bestiary"
            aria-label={`Combine Bestiary, ${foesSeen}/${ENEMY_LIST.length} 함선 동정 완료${foesNew > 0 ? `, 신규 ${foesNew}종` : ''}`}
            onClick={() => { setBestiaryOpen(true); sfx.click(); }}>
            <span className="menu-tab-icon" aria-hidden="true">👾</span>{foesNew > 0 && <span className="tab-badge new" aria-hidden="true">{foesNew}</span>}
          </button>
          <button className="menu-tab-help" title="플레이 방법" data-testid="menu-utility-help" aria-label="플레이 방법" onClick={() => { setHelp(true); sfx.click(); }}>
            <span className="menu-tab-icon" aria-hidden="true">?</span>
          </button>
          <button className="menu-tab-help" title="설정" data-testid="menu-utility-settings" aria-label="설정" onClick={() => { setSettingsOpen(true); sfx.click(); }}>
            <span className="menu-tab-icon" aria-hidden="true">⚙</span>
          </button>
        </nav>
      </header>

      {help && <HowToPlay onDone={() => { setHelp(false); sfx.click(); }} />}
      {settingsOpen && <SettingsPanel onClose={() => { setSettingsOpen(false); sfx.click(); }} />}
      {bestiaryOpen && <Bestiary onClose={() => { setBestiaryOpen(false); sfx.click(); }} />}

      {DEMO_MODE && (
        <div className="menu-demo-banner">
          리쿠르터 데모: 이번 세션에서는 모든 섹터, 프로토콜, 타워가 해제됩니다. 진행도, 텔레메트리, 점수 등록은 비활성화됩니다.
        </div>
      )}

      {/* one unified Commander Dossier (returning players) replaces the 3 ragged strips.
          Deploy-tab only: on Leaderboard/Operations it just pushed the content down. */}
      {tab === 'deploy' && (progress.record.runs > 0 ? (
        <div className="commander-dossier">
          <div className="hero-stats">
            <span><b>{progress.record.victories}</b> 지킨 등대 수</span>
            <span><b>{progress.record.kills.toLocaleString()}</b> 격파한 함선</span>
            <span><b>{progress.totalWaves}</b> 클리어한 웨이브</span>
            {progress.freeplay.runs > 0 && <span><b>{progress.freeplay.bestWave}</b> 프리플레이 최고 웨이브</span>}
          </div>
          {!DEMO_MODE && (() => {
            const rank = meta.rank; const streak = meta.streak;
            return (
              <button className="menu-rank-strip" onClick={() => { setTab('ops'); sfx.click(); }} title="운영 열기">
                <img className="menu-rank-crest" src={art(`/art/rank-${rankBandKey(rank.rank)}.webp`)} alt="" draggable={false} decoding="async" />
                <span className="menu-rank-title">{rank.title}</span>
                <span className="menu-rank-bar"><span className="menu-rank-fill" style={{ width: `${rank.pct * 100}%` }} /></span>
                <span className="menu-rank-meta"><i className="ico-diamond" aria-hidden="true" /> {meta.salvage.toLocaleString()}{streak.current > 0 ? ` · 🔥 ${streak.current}` : ''}</span>
              </button>
            );
          })()}
          {!DEMO_MODE && (() => {
            const k = progress.record.kills;
            const next = TOWERS_BY_UNLOCK.find((d) => d.unlockAt > k);
            if (!next) return null;
            const prev = TOWERS_BY_UNLOCK.filter((d) => d.unlockAt <= k).reduce((m, d) => Math.max(m, d.unlockAt), 0);
            const pct = Math.min(100, ((k - prev) / (next.unlockAt - prev)) * 100);
            return (
              <div className="menu-next-unlock" title={`${k.toLocaleString()} / ${next.unlockAt.toLocaleString()} 함선`}>
                <div className="unlock-label">다음 해제: {next.name}</div>
                <div className="unlock-bar"><div className="unlock-fill" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })()}
        </div>
      ) : (!DEMO_MODE && (
        <div className="menu-firsttime-note">커맨더 초기화 완료 · 섹터를 클리어하면 워든 등급을 받습니다</div>
      )))}

      <div className={`menu-layout menu-tab-${tab}`}>
        <CommanderDossierRail onOpenOps={() => { setTab('ops'); sfx.click(); }} />
        <main className="menu-main">
          <div className="menu-content">
        {tab === 'deploy' ? (
          <SectorAtlas
            map={props.map}
            diff={props.diff}
            setMap={props.setMap}
            setDiff={props.setDiff}
            deployMode={deployMode}
            setDeployMode={setDeployMode}
            dailySeed={props.dailySeed}
            drills={props.drills}
            selectedDrill={selectedDrill}
            setSelectedDrill={setSelectedDrill}
            weeklySeed={props.weeklySeed}
            gauntlet={props.gauntlet}
            gauntletProtocol={props.gauntletProtocol}
            gauntletProtocolUnlocked={gauntletProtocolUnlocked}
            yakkobUnlocked={props.yakkobUnlocked}
            onStartYakkob={props.onStartYakkob}
            firstTime={firstTime}
            apexLocked={apexLocked}
          />
        ) : tab === 'board' ? (
          <LeaderboardTab
            map={props.map}
            diff={props.diff}
            daily={props.dailySeed}
            weekly={props.weeklySeed}
            gauntlet={props.gauntlet}
            initialMode={deployMode === 'daily' ? 'daily' : deployMode === 'weekly' ? 'weekly' : deployMode === 'gauntlet' ? 'gauntlet' : 'campaign'}
          />
        ) : (
          <OperationsBoard onClaimed={() => bumpClaim((n) => n + 1)} />
        )}
      </div>

      {/* sticky launch bar — always visible, reflects the current selection */}
        </main>
      </div>
      {tab === 'deploy' && <div className="deploy-bar">
        <div className="deploy-bar-inner">
          <div className="menu-legal">
            {!IS_PORTAL_BUILD && <a href={homeUrl() + "privacy"}>개인정보 처리방침 및 데이터 선택</a>}
          </div>
          <div className="deploy-bar-sel">
            <span className="dbar-label">출격 지역</span>
            <span className="dbar-sec">{deployMode === 'daily'
              ? (ALL_MAPS.find((m) => m.id === props.dailySeed.mapId)?.name ?? props.dailySeed.mapId)
              : deployMode === 'yakkob'
                ? (ALL_MAPS.find((m) => m.id === THE_YAKKOB.mapId)?.name ?? THE_YAKKOB.mapId)
              : deployMode === 'drill'
                ? (ALL_MAPS.find((m) => m.id === selectedDrill.mapId)?.name ?? selectedDrill.mapId)
              : deployMode === 'weekly'
                ? (ALL_MAPS.find((m) => m.id === props.weeklySeed.mapId)?.name ?? props.weeklySeed.mapId)
                : deployMode === 'gauntlet' && props.gauntlet
                  ? (ALL_MAPS.find((m) => m.id === props.gauntlet?.map)?.name ?? props.gauntlet.map)
                  : deployMode === 'gauntletProtocol'
                    ? (ALL_MAPS.find((m) => m.id === props.gauntletProtocol.route[0])?.name ?? props.gauntletProtocol.route[0])
                    : props.map.name}</span>
            <span className="dbar-dot">·</span>
            <span className="dbar-diff">{deployMode === 'daily'
              ? '데일리 챌린지'
              : deployMode === 'yakkob'
                ? '더 야콥'
              : deployMode === 'drill'
                ? selectedDrill.title.toUpperCase()
              : deployMode === 'weekly'
                ? '주간 변이'
                : deployMode === 'gauntlet'
                  ? '챔피언 건틀릿'
                  : deployMode === 'gauntletProtocol'
                    ? '건틀릿 프로토콜'
                    : props.diff.name}</span>
          </div>
          <button className={`start-btn deploy-bar-btn ${deployMode !== 'campaign' ? 'daily' : ''}`} data-testid="deploy-button" disabled={!selectedUnlocked || (deployMode === 'gauntlet' && !props.gauntlet)}
            onClick={() => {
              if (deployMode === 'daily') {
                appMetrics.recordDeployAttempt(props.dailySeed.mapId, props.dailySeed.diffId, true);
                props.onStartDaily();
              } else if (deployMode === 'yakkob') {
                appMetrics.recordDeployAttempt(THE_YAKKOB.mapId, THE_YAKKOB.diffId, true);
                props.onStartYakkob();
              } else if (deployMode === 'drill') {
                props.onStartDrill(selectedDrill);
              } else if (deployMode === 'weekly') {
                appMetrics.recordDeployAttempt(props.weeklySeed.mapId, props.weeklySeed.diffId, true);
                props.onStartWeekly();
              } else if (deployMode === 'gauntlet') {
                props.onStartGauntlet();
              } else if (deployMode === 'gauntletProtocol') {
                props.onStartGauntletProtocol();
              } else {
                appMetrics.recordDeployAttempt(props.map.id, props.diff.id, selectedUnlocked);
                props.onStart();
              }
            }}>
            {deployMode === 'daily'
              ? '▶ 데일리 챌린지'
              : deployMode === 'yakkob'
                ? '▶ 더 야콥'
              : deployMode === 'drill'
                ? '▶ 프로토콜 훈련'
              : deployMode === 'weekly'
                ? '▶ 주간 변이'
                : deployMode === 'gauntlet'
                  ? '▶ 건틀릿'
                  : deployMode === 'gauntletProtocol'
                    ? '▶ 건틀릿 프로토콜'
                    : firstTime
                    ? '▶ 미션 시작'
                    : '▶ 출격'}
          </button>
        </div>
      </div>}
    </div>
  );
}

function routeNames(route: readonly string[]): string {
  return route.map((id) => ALL_MAPS.find((map) => map.id === id)?.name ?? id).join(' -> ');
}
