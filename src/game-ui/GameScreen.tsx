import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Game, W, H } from '../game/engine';
import { render, drawTowerBody, setRenderQuality } from '../game/render';
import { TOWERS, TOWERS_BY_UNLOCK, computeStats, sellValue } from '../game/towers';
import { ENEMIES } from '../game/enemies';
import { ABILITIES } from '../game/abilities';
import { BRIEFING, ABILITY_LORE } from '../game/lore';
import { progress } from '../game/storage';
import { Bot } from '../game/bot';
import { isMilestoneWave } from '../game/writePolicy';
import { ageBand, canSubmitScore } from '../game/consent';
import {
  boardId,
  submitScore,
  submitDailyScore,
  submitWeeklyScore,
  submitGauntletScore,
  fetchTop,
  fetchDailyTop,
  fetchWeeklyTop,
  fetchGauntletTop,
  submitGauntletProtocolScore,
  fetchGauntletProtocolTop,
  submitRunReplay,
  streamRunReplayChunk,
  submitRunAnalytics,
  submitRunCheckpoint,
  logTelemetry,
  TELEMETRY_BUILD,
  type ScoreEntry,
} from '../game/leaderboard';
import type { RunCheckpointReason, RunUploadBundle } from '../game/runTelemetry';
import { buildAIHelpContext } from '../game/aiContext';
import { appMetrics, METRIC_EVENTS } from '../game/metrics';
import {
  FREEPLAY_CONTRACTS,
  rivalForWave,
  type FreeplayContractId,
  type FreeplayRelicId,
  type RiskWaveId,
} from '../game/freeplay';
import type { DailyChallenge } from '../game/dailyChallenge';
import { isYakkob, isYakkobSquishedTower } from '../game/yakkob';
import type { WeeklyChallenge, WeeklyGauntletDoc } from '../game/weeklyChallenge';
import {
  GAUNTLET_PROTOCOL_START_CORES,
  currentGauntletProtocolId,
  gauntletProtocolDifficulty,
  gauntletProtocolDraftOffer,
  gauntletProtocolMap,
  gauntletProtocolWaveCount,
  nextGauntletCredits,
  type GauntletProtocolLeg,
  type GauntletProtocolRoute,
} from '../game/gauntletProtocol';

import { sfx, setMuted, isMuted, setMusic, isMusicOn, playBriefing, playSectorTheme } from '../game/sound';
import { asset as art } from '../game/paths';
import { portal, type AdBreakResult, type AdBreakType } from '../game/portal';
import DossierShare from '../DossierShare';
import BotGhostHud from '../BotGhostHud';
import Modal from '../Modal';
import EnemyPortrait from '../EnemyPortrait';
import { UpgradeIcon, upgradeIconKey } from '../UpgradeIcon';
import { meta, type RunMetaReward } from '../game/meta';
import { buildGhostCurves, ghostCurvesForMap, type GhostCurve } from '../game/ghostCurve';
import { GHOST_CURVES_RAW } from '../game/ghostCurveData';
import { buildDossierInputFromGame, type DossierInput } from '../game/dossier';
import type { GameMap, DifficultyDef, TowerDef, Tower, TargetFilter, TargetMode, Vec, EnemyDef, WaveGroup } from '../game/types';
import { hasCloakedWave, isWaveGroupCloaked } from '../game/waves';
import { AIHelpWidget } from '../widgets/AIHelpWidget';
import { FeedbackWidget } from '../widgets/FeedbackWidget';
import { PERF_MAP, DEMO_MODE, AI_HELP_ENABLED, WIDGET_OPEN_EVENT } from '../appShared';
import { utilityWidgetOpen, isTypingTarget } from '../uiShared';

const TARGET_MODES: TargetMode[] = ['first', 'last', 'strong', 'close'];
const TARGET_MODE_LABELS: Record<TargetMode, string> = { first: '선두', last: '후미', strong: '강함', close: '근접' };
const TARGET_FILTER_LABELS: [TargetFilter, string][] = [
  ['boss', '보스'],
  ['armored', '장갑'],
  ['cloaked', '은신'],
  ['healer', '치유'],
  ['spawner', '분열'],
];
const ABILITY_KEYS = 'QWERTYU';
const DEMO_UNLOCK_KILLS = Math.max(...TOWERS_BY_UNLOCK.map((tower) => tower.unlockAt));
const KEYBOARD_GRID = 24;
const TOWER_EDGE = 16;
// Bot-rival ghost curves (matched-difficulty AI cores pace), built once from the bundled asset.
const GHOST_CURVES: GhostCurve[] = buildGhostCurves(GHOST_CURVES_RAW);
const REWARDED_AD_BREAKS_ENABLED = false;
const AD_BREAK_TIMEOUT_MS = 45_000;

type AdBreakPlacement = 'gameover' | 'return_to_menu' | 'rewarded_stub';

interface VeteranProjection {
  baseCost: number;
  totalCost: number;
  upgradeCost: number;
  tierA: number;
  tierB: number;
  range: number;
  upgrades: number;
}

function isControlTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (isTypingTarget(target)) return true;
  return Boolean(target.closest('button, a, input, textarea, select, [role="button"], [tabindex]'));
}

function clampCursor(pos: Vec): Vec {
  return {
    x: Math.max(TOWER_EDGE, Math.min(W - TOWER_EDGE, Math.round(pos.x / KEYBOARD_GRID) * KEYBOARD_GRID)),
    y: Math.max(TOWER_EDGE, Math.min(H - TOWER_EDGE, Math.round(pos.y / KEYBOARD_GRID) * KEYBOARD_GRID)),
  };
}

function skippedAdBreak(type: AdBreakType, error: string): AdBreakResult {
  return { status: 'skipped', type, adStarted: false, error };
}

function withAdBreakTimeout(promise: Promise<AdBreakResult>, type: AdBreakType): Promise<AdBreakResult> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve({ status: 'failed', type, adStarted: false, error: 'timeout' }), AD_BREAK_TIMEOUT_MS);
    promise.then(
      (result) => {
        window.clearTimeout(timer);
        resolve(result);
      },
      (error) => {
        window.clearTimeout(timer);
        resolve({
          status: 'failed',
          type,
          adStarted: false,
          error: error instanceof Error ? error.message : 'request_failed',
        });
      },
    );
  });
}

function AbilityArt({ id, fallback }: { id: string; fallback: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className="ability-icon-fallback" aria-hidden="true">{fallback}</span>;
  }
  return (
    <img
      className="ability-icon-img"
      src={art(`/art/ability-${id}.webp`)}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

function projectedVeteranDeploy(game: Game, def: TowerDef, credits = game.credits): VeteranProjection {
  const baseCost = game.cost(def);
  const tower: Tower = {
    uid: -1,
    def,
    pos: { x: 0, y: 0 },
    stats: computeStats(def, 0, 0),
    tierA: 0,
    tierB: 0,
    committed: null,
    cooldown: 0,
    angle: -Math.PI / 2,
    target: 'first',
    targetFilters: [],
    invested: baseCost,
    kills: 0,
    rateBuff: 1,
    rangeBuff: 1,
    flash: 0,
    recoil: 0,
  };
  let remaining = Math.max(0, credits - baseCost);
  let upgradeCost = 0;
  let upgrades = 0;
  while ((tower.tierA < 4 || tower.tierB < 4) && upgrades < 8) {
    const track: 0 | 1 = tower.tierA <= tower.tierB ? 0 : 1;
    if (game.tierOf(tower, track) >= 4) break;
    const nextCost = game.upgradeCost(tower, track);
    if (nextCost <= 0 || game.upgradeState(tower, track) !== 'ok' || remaining < nextCost) break;
    remaining -= nextCost;
    upgradeCost += nextCost;
    upgrades++;
    tower.invested += nextCost;
    if (track === 0) tower.tierA++;
    else tower.tierB++;
    tower.stats = computeStats(def, tower.tierA, tower.tierB);
  }
  return {
    baseCost,
    totalCost: baseCost + upgradeCost,
    upgradeCost,
    tierA: tower.tierA,
    tierB: tower.tierB,
    range: tower.stats.range,
    upgrades,
  };
}

function applyVeteranDeploy(game: Game, tower: Tower): number {
  let bought = 0;
  while ((tower.tierA < 4 || tower.tierB < 4) && bought < 8) {
    const track: 0 | 1 = tower.tierA <= tower.tierB ? 0 : 1;
    if (game.tierOf(tower, track) >= 4) break;
    const cost = game.upgradeCost(tower, track);
    if (cost <= 0 || game.upgradeState(tower, track) !== 'ok' || game.credits < cost) break;
    if (!game.upgradeTower(tower, track)) break;
    bought++;
  }
  return bought;
}

function summarizeWave(groups: WaveGroup[]) {
  const byType = new Map<string, { def: EnemyDef; count: number; cloaked: boolean; boss: boolean }>();
  for (const group of groups) {
    const def = ENEMIES[group.type];
    if (!def) continue;
    const row = byType.get(group.type) ?? { def, count: 0, cloaked: false, boss: !!def.boss };
    row.count += group.count;
    row.cloaked = row.cloaked || isWaveGroupCloaked(group);
    row.boss = row.boss || !!def.boss;
    byType.set(group.type, row);
  }
  return [...byType.entries()].map(([id, row]) => ({ id, ...row }));
}

function liveUnlockKills(game: Game): number {
  if (game.isDailyChallenge) return DEMO_UNLOCK_KILLS;
  return DEMO_MODE ? DEMO_UNLOCK_KILLS : progress.record.kills + game.totalKills;
}

function towerAvailable(game: Game, def: TowerDef): boolean {
  return DEMO_MODE || game.towerAvailable(def);
}

function towerLockText(game: Game, def: TowerDef): string {
  if (game.isDailyChallenge) return `${def.name}는 오늘의 데일리 아스날에 없습니다`;
  const lockedBy = Math.max(1, def.unlockAt - liveUnlockKills(game));
  return `${def.name} 잠김 - 적 ${lockedBy.toLocaleString()}기를 더 격파하세요`;
}

// ---------------- Game screen ----------------

export function GameScreen({ map, diff, dailySeed, weeklySeed, gauntlet, gauntletProtocol, onExit }: {
  map: GameMap;
  diff: DifficultyDef;
  dailySeed?: DailyChallenge | null;
  weeklySeed?: WeeklyChallenge | null;
  gauntlet?: WeeklyGauntletDoc | null;
  gauntletProtocol?: GauntletProtocolRoute | null;
  onExit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [run, setRun] = useState(0); // bump to restart the sector
  const [gauntletLeg, setGauntletLeg] = useState<1 | 2 | 3>(1);
  const [gauntletCredits, setGauntletCredits] = useState<number | null>(null);
  const [gauntletCores, setGauntletCores] = useState<number>(GAUNTLET_PROTOCOL_START_CORES);
  const [gauntletRelicIds, setGauntletRelicIds] = useState<FreeplayRelicId[]>([]);
  const [gauntletRunId] = useState(() => `gp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`);
  const [gauntletLegRunIds, setGauntletLegRunIds] = useState<string[]>([]);
  const [gauntletDraft, setGauntletDraft] = useState<ReturnType<typeof gauntletProtocolDraftOffer> | null>(null);
  const pendingGauntletReplayRef = useRef<{ leg: 1 | 2; bundle: RunUploadBundle } | null>(null);
  const activeGauntletRoute = gauntletProtocol ?? null;
  const activeMap = activeGauntletRoute ? gauntletProtocolMap(activeGauntletRoute, gauntletLeg) : map;
  const activeDiff = activeGauntletRoute ? gauntletProtocolDifficulty(gauntletLeg) : diff;
  const activeGauntletMeta: GauntletProtocolLeg | null = activeGauntletRoute ? {
    week: activeGauntletRoute.week || currentGauntletProtocolId(),
    gauntletRunId,
    leg: gauntletLeg,
    route: activeGauntletRoute.route,
    startingCredits: gauntletCredits ?? gauntletProtocolDifficulty(1).cash,
    startingCores: gauntletCores,
    relicIds: gauntletRelicIds,
    previousRunId: gauntletLegRunIds[gauntletLeg - 2],
  } : null;
  const gameRef = useRef<Game | null>(null);
  const runRef = useRef(-1);
  if (!gameRef.current || runRef.current !== run) {
    const nextGame = new Game(activeMap, activeDiff, {
      ...(gauntlet ? { seed: gauntlet.seed } : {}),
      ...(DEMO_MODE ? { lifetimeKills: DEMO_UNLOCK_KILLS } : {}),
    });
    if (dailySeed) nextGame.startDailyChallenge(dailySeed);
    if (weeklySeed) nextGame.startWeeklyChallenge(weeklySeed);
    if (gauntlet) nextGame.setGauntletChallenge(gauntlet);
    if (activeGauntletMeta) nextGame.startGauntletProtocolLeg(activeGauntletMeta);
    // restore the player's preferred run speed (smart fast-forward persistence)
    if (PERF_MAP === null && progress.preferredSpeed > 0) nextGame.speed = progress.preferredSpeed;
    gameRef.current = nextGame;
    runRef.current = run;
  }
  const game = gameRef.current;
  if (import.meta.env.DEV) {
    const devWindow = window as unknown as { game: Game; appMetrics: typeof appMetrics };
    devWindow.game = game;
    devWindow.appMetrics = appMetrics;
  }

  const [, setTick] = useState(0);
  const [placing, setPlacing] = useState<TowerDef | null>(null);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const veteranDeployUnlocked = progress.record.victories >= 1;
  const [veteranDeploy, setVeteranDeploy] = useState(veteranDeployUnlocked && progress.veteranDeploy);
  const [muted, setMutedState] = useState(isMuted());
  const [aiming, setAiming] = useState(false);
  // Action-gated first-run coach: new players learn by DOING (place → launch →
  // upgrade) via a non-blocking chip instead of the old HowToPlay modal wall.
  // The full reference card stays available behind the menu's "?" help.
  const [coachStage, setCoachStage] = useState<'place' | 'launch' | 'upgrade' | null>(
    PERF_MAP === null && !DEMO_MODE && !dailySeed && !weeklySeed && !gauntlet && !progress.tutorialSeen ? 'place' : null);
  const [briefed, setBriefed] = useState(PERF_MAP !== null || DEMO_MODE || !!dailySeed || !!weeklySeed || !!gauntlet);
  // One-time Veteran-protocol intro: the jump from Recruit is informational, not an
  // HP wall (early HP already ramps in over 25 waves) — the real step-change is
  // phase-cloaks + a leaner economy. Set expectations on the first Veteran campaign
  // deploy so cloaks/economy don't ambush a new player.
  const firstVeteranDeploy = PERF_MAP === null && !DEMO_MODE && !dailySeed && !weeklySeed && !gauntlet
    && !activeGauntletRoute && activeDiff.id === 'normal' && !progress.veteranIntroSeen;
  const [veteranIntroDone, setVeteranIntroDone] = useState(!firstVeteranDeploy);
  const botRef = useRef<Bot | null>(null);
  const fpsRef = useRef({ frames: 0, t: 0, fps: 0, worst: 999 });
  // adaptive render quality: smoothed fps + a hysteresis flag (see render.setRenderQuality)
  const qualRef = useRef({ fps: 60, lite: false });
  const perfIdleRef = useRef(0);
  const [cloakTip, setCloakTip] = useState(false);
  const [unlockModal, setUnlockModal] = useState<TowerDef | null>(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [abortConfirm, setAbortConfirm] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [checkpointState, setCheckpointState] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  const [metaReward, setMetaReward] = useState<RunMetaReward | null>(null);
  const [touchPreview, setTouchPreview] = useState<{ towerId: string; x: number; y: number } | null>(null);
  const [hostileReveal, setHostileReveal] = useState<EnemyDef | null>(null);
  const hostileRevealRef = useRef<EnemyDef | null>(null);
  const hostileQueueRef = useRef<EnemyDef[]>([]);
  const revealElapsedRef = useRef(0); // pause-aware real-time accumulator for the reveal toast
  const [shakeAbility, setShakeAbility] = useState<string | null>(null); // ability id to shake on a failed cast
  const hoverRef = useRef<Vec | null>(null);
  const placingRef = useRef<TowerDef | null>(null);
  const keyboardPlacementRef = useRef(false);
  const keyboardCursorRef = useRef<Vec | null>(null);
  const keyboardTowerIndexRef = useRef(-1);
  const previewViewRef = useRef('');
  const previewHoverRef = useRef('');
  const selectedRef = useRef<Tower | null>(null);
  const aimingRef = useRef(false);
  const overlayRef = useRef(false);
  const suppressMouseUntilRef = useRef(0);
  const adBreakBusyRef = useRef(false);
  const terminalAdRef = useRef('');
  const happyWaveRef = useRef(0);
  const victoryHappyRef = useRef('');
  placingRef.current = placing;
  aimingRef.current = aiming;
  selectedRef.current = game.towers.find((t) => t.uid === selectedUid) ?? null;
  // unlock modals must never stack on the briefing overlay
  const relicOfferOpen = game.phase === 'build' && game.freeplayState.nextRelicOffer.length > 0;
  overlayRef.current = !veteranIntroDone || !briefed || contractOpen || relicOfferOpen || game.bonusRound !== null;
  const terminalPhase = game.phase === 'gameover' || game.phase === 'victory';
  // cloakTip and the first-run coach are non-blocking, so they are
  // intentionally NOT part of blockingOverlay
  const blockingOverlay = !veteranIntroDone || !briefed || unlockModal !== null || contractOpen || relicOfferOpen || game.bonusRound !== null ||
    terminalPhase;
  const sideOpenRef = useRef(sideOpen);
  const blockingOverlayRef = useRef(blockingOverlay);
  const veteranDeployActive = veteranDeployUnlocked && veteranDeploy;
  const veteranDeployActiveRef = useRef(veteranDeployActive);
  sideOpenRef.current = sideOpen;
  blockingOverlayRef.current = blockingOverlay;
  veteranDeployActiveRef.current = veteranDeployActive;

  useEffect(() => {
    if (coachStage !== null) game.recorder.recordControl(METRIC_EVENTS.TUTORIAL_VIEW);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- record once per run, not per stage
  }, [game]);
  useEffect(() => {
    const pending = pendingGauntletReplayRef.current;
    if (!pending || !activeGauntletRoute || !game.gauntletProtocol || game.gauntletProtocol.leg !== pending.leg + 1) return;
    pending.bundle.run.summary.gauntletNextRunId = game.runId;
    if (pending.bundle.run.setup.gauntletProtocol) pending.bundle.run.setup.gauntletProtocol.nextRunId = game.runId;
    pendingGauntletReplayRef.current = null;
    void submitRunReplay(pending.bundle);
  }, [activeGauntletRoute, game]);
  useEffect(() => {
    if (!briefed) game.recorder.recordControl(METRIC_EVENTS.BRIEFING_VIEW);
  }, [briefed, game]);
  useEffect(() => {
    if (!sideOpen || game.phase !== 'build') return;
    const key = `${game.runId}:${game.wave + 1}`;
    if (previewViewRef.current === key) return;
    previewViewRef.current = key;
    game.recorder.recordWavePreview('view');
  }, [game, game.phase, game.wave, sideOpen]);
  // Coach advancement — checked on the normal ~8Hz UI tick; each gate is the
  // real action, not a "next" click.
  useEffect(() => {
    if (!coachStage) return;
    if (coachStage === 'place' && game.towers.length > 0) {
      setCoachStage('launch');
    } else if (coachStage === 'launch' && game.wave >= 1) {
      setCoachStage('upgrade');
    } else if (coachStage === 'upgrade' && game.towers.some((t) => t.tierA + t.tierB > 0)) {
      setCoachStage(null);
      progress.tutorialSeen = true;
      game.recorder.recordCustom('tutorial_coach_complete', game.telemetryState(), { wave: game.wave });
    }
  });
  const dismissCoach = () => {
    game.recorder.recordCustom('tutorial_coach_skip', game.telemetryState(), { stage: coachStage });
    setCoachStage(null);
    progress.tutorialSeen = true;
    sfx.click();
  };
  useEffect(() => {
    if (cloakTip) game.recorder.recordControl(METRIC_EVENTS.CLOAK_TIP_VIEW);
  }, [cloakTip, game]);
  useEffect(() => {
    if (!veteranDeployUnlocked && veteranDeploy) setVeteranDeploy(false);
  }, [veteranDeploy, veteranDeployUnlocked]);
  useEffect(() => {
    setTouchPreview(null);
  }, [placing?.id]);

  // returning players already earned earlier towers — mark them seen silently so
  // the unlock modal only celebrates genuinely new unlocks during this run.
  useEffect(() => {
    if (PERF_MAP !== null || DEMO_MODE || dailySeed) return;
    const banked = progress.record.kills;
    for (const d of TOWERS_BY_UNLOCK) {
      if (d.unlockAt > 0 && d.unlockAt <= banked) progress.markUnlockSeen(d.id);
    }
  }, [dailySeed, game]);

  useEffect(() => {
    const notePointer = () => game.recorder.noteInput('pointer');
    const noteKey = () => game.recorder.noteInput('keyboard');
    const noteTouch = () => game.recorder.noteInput('touch');
    const noteVisibility = () => game.recorder.noteVisibility(document.hidden);
    window.addEventListener('pointerdown', notePointer);
    window.addEventListener('keydown', noteKey);
    window.addEventListener('touchstart', noteTouch);
    document.addEventListener('visibilitychange', noteVisibility);
    noteVisibility();
    return () => {
      window.removeEventListener('pointerdown', notePointer);
      window.removeEventListener('keydown', noteKey);
      window.removeEventListener('touchstart', noteTouch);
      document.removeEventListener('visibilitychange', noteVisibility);
    };
  }, [game]);

  // Re-assert beginRun in an effect so it runs AFTER the previous run's endRun cleanup.
  // (The Game constructor also calls beginRun during render, but on RETRY that ran before
  // the old run's cleanup, leaving the new run inactive and dropping its app-metrics.)
  useEffect(() => {
    appMetrics.beginRun(game.map.id, game.diff.id);
    return () => appMetrics.endRun();
  }, [game]);

  // sector ambience while deployed
  useEffect(() => {
    playSectorTheme(map.music ?? map.id);
    return () => playSectorTheme(null);
  }, [map.id, map.music]);

  // anonymous run-end telemetry (one event per run, terminal phases only)
  const loggedRunRef = useRef(false);
  useEffect(() => { loggedRunRef.current = false; }, [run]);
  const checkpointSeqRef = useRef(0);
  const checkpointBusyRef = useRef(false);
  const checkpointWaveRef = useRef(game.wave);
  const replayStreamSeqRef = useRef(0);
  const replayStreamAckRef = useRef(0);
  const replayStreamBusyRef = useRef(false);
  useEffect(() => {
    checkpointSeqRef.current = 0;
    checkpointBusyRef.current = false;
    checkpointWaveRef.current = game.wave;
    replayStreamSeqRef.current = 0;
    replayStreamAckRef.current = 0;
    replayStreamBusyRef.current = false;
  }, [game, run]);

  const submitCheckpointNow = useCallback(async (reason: RunCheckpointReason) => {
    if (PERF_MAP !== null || DEMO_MODE) return false;
    const callsign = (progress.playerName.trim() || 'WARDEN').slice(0, 20);
    const doc = game.buildRunCheckpointDoc(callsign, progress.uid, TELEMETRY_BUILD, checkpointSeqRef.current++, reason);
    return submitRunCheckpoint(doc);
  }, [game]);

  const flushRunCheckpoint = useCallback((reason: RunCheckpointReason) => {
    if (checkpointBusyRef.current) return;
    checkpointBusyRef.current = true;
    void submitCheckpointNow(reason).finally(() => { checkpointBusyRef.current = false; });
  }, [submitCheckpointNow]);

  const flushReplayStreamBoundary = useCallback(() => {
    if (PERF_MAP !== null || DEMO_MODE || replayStreamBusyRef.current) return;
    const chunk = game.recorder.buildReplayActionStreamChunk(replayStreamAckRef.current, replayStreamSeqRef.current);
    if (!chunk) return;
    replayStreamBusyRef.current = true;
    void streamRunReplayChunk(chunk, TELEMETRY_BUILD)
      .then((ok) => {
        if (!ok) return;
        replayStreamAckRef.current += chunk.actions.count;
        replayStreamSeqRef.current++;
      })
      .finally(() => { replayStreamBusyRef.current = false; });
  }, [game]);

  const requestPortalAdBreak = useCallback(async (type: AdBreakType, placement: AdBreakPlacement): Promise<AdBreakResult> => {
    if (!portal.isPortal) return skippedAdBreak(type, 'no_portal');
    if (type === 'rewarded' && !REWARDED_AD_BREAKS_ENABLED) return skippedAdBreak(type, 'rewarded_disabled');

    const payload = { adType: type, portal: portal.portalId, placement };
    appMetrics.recordAdBreak('requested');
    game.recorder.recordCustom(METRIC_EVENTS.AD_BREAK_REQUESTED, game.telemetryState(), payload);

    const recordResult = (result: AdBreakResult) => {
      const completed = result.status === 'completed';
      appMetrics.recordAdBreak(completed ? 'completed' : 'skipped');
      game.recorder.recordCustom(completed ? METRIC_EVENTS.AD_BREAK_COMPLETED : METRIC_EVENTS.AD_BREAK_SKIPPED, game.telemetryState(), {
        ...payload,
        status: result.status,
        adStarted: result.adStarted,
        error: result.error ?? '',
      });
    };

    if (ageBand() === 'under13') {
      const result = skippedAdBreak(type, 'under13');
      recordResult(result);
      return result;
    }
    if (adBreakBusyRef.current) {
      const result = skippedAdBreak(type, 'busy');
      recordResult(result);
      return result;
    }

    adBreakBusyRef.current = true;
    const wasPaused = game.paused;
    const wasMuted = isMuted();
    const wasMusicOn = isMusicOn();
    game.paused = true;
    portal.gameplayStop();
    setMuted(true);
    setMusic(false);
    setMutedState(true);
    window.__NVD_PORTAL_TRACE__?.('adBreakGuardStart', {
      ...payload,
      paused: game.paused,
      muted: true,
      musicOff: true,
    });
    setTick((tick) => tick + 1);

    try {
      const result = await withAdBreakTimeout(portal.requestAdBreak(type), type);
      recordResult(result);
      return result;
    } finally {
      setMuted(wasMuted);
      setMusic(wasMusicOn);
      setMutedState(wasMuted);
      game.paused = wasPaused;
      adBreakBusyRef.current = false;
      window.__NVD_PORTAL_TRACE__?.('adBreakGuardEnd', {
        ...payload,
        paused: game.paused,
        muted: wasMuted,
        musicOff: !wasMusicOn,
      });
      setTick((tick) => tick + 1);
      if (!wasPaused && placement !== 'return_to_menu' && game.phase !== 'gameover' && game.phase !== 'victory') {
        portal.gameplayStart();
      }
    }
  }, [game]);

  useEffect(() => {
    const flushHidden = () => {
      if (document.hidden) flushRunCheckpoint('visibility');
    };
    const flushPageHide = () => flushRunCheckpoint('visibility');
    document.addEventListener('visibilitychange', flushHidden);
    window.addEventListener('pagehide', flushPageHide);
    return () => {
      document.removeEventListener('visibilitychange', flushHidden);
      window.removeEventListener('pagehide', flushPageHide);
    };
  }, [flushRunCheckpoint]);

  const gameplayActive = briefed && !game.paused && game.phase !== 'gameover' && game.phase !== 'victory';
  useEffect(() => {
    if (!portal.isPortal) return;
    if (gameplayActive) portal.gameplayStart();
    else portal.gameplayStop();
    return () => portal.gameplayStop();
  }, [game, gameplayActive]);

  useEffect(() => {
    if (!portal.isPortal) return;
    if (game.phase === 'build' && game.wave > 0 && game.wave > happyWaveRef.current && isMilestoneWave(game.wave)) {
      happyWaveRef.current = game.wave;
      portal.happyTime();
    }
    if (game.phase === 'victory' && victoryHappyRef.current !== game.runId) {
      victoryHappyRef.current = game.runId;
      portal.happyTime();
    }
    if (game.phase === 'gameover' && terminalAdRef.current !== game.runId) {
      terminalAdRef.current = game.runId;
      void requestPortalAdBreak('midgame', 'gameover');
    }
  }, [game, game.phase, game.runId, game.wave, requestPortalAdBreak]);

  // main loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let uiTimer = 0;
    if (PERF_MAP !== null && !botRef.current) {
      game.setSpeed(4);
      game.autoNext = true;
      botRef.current = new Bot(game, 'expert');
    }
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      // adaptive render quality: ease the FX detail down when the frame rate sags on a
      // packed late-game board, and back up when it recovers (hysteresis avoids flicker).
      if (dt > 0 && dt < 0.5) {
        const q = qualRef.current;
        q.fps = q.fps * 0.9 + (1 / dt) * 0.1;
        if (!q.lite && q.fps < 45) { q.lite = true; appMetrics.recordQualityChange(true); setRenderQuality(true); }
        else if (q.lite && q.fps > 55) { q.lite = false; appMetrics.recordQualityChange(false); setRenderQuality(false); }
      }
      game.recorder.observeAttention(dt, {
        hidden: document.hidden,
        paused: game.paused,
        speed: game.speed,
        panel: sideOpenRef.current ? (selectedRef.current ? 'upgrade' : 'shop') : 'none',
        overlay: blockingOverlayRef.current,
        widgetOpen: utilityWidgetOpen(),
        fps: qualRef.current.fps,
        enemyCount: game.enemies.length,
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        userAgent: navigator.userAgent,
      });
      if (botRef.current) {
        botRef.current.act(game.time);
        if (game.phase === 'victory') game.enterFreeplay('standard');
        // auto-launch: give the bot ~1.5s real-time to build, then start the wave
        if (game.phase === 'build') {
          perfIdleRef.current += dt;
          if (perfIdleRef.current > 1.5) { perfIdleRef.current = 0; game.startWave(); }
        }
        const f = fpsRef.current;
        f.frames++;
        if (dt > 0) f.worst = Math.min(f.worst, 1 / dt);
        if (now - f.t > 1000) { f.fps = f.frames; f.frames = 0; f.t = now; }
      }
      game.update(dt);
      // Combine Bestiary: drain first-sighting reveals (skip bot/demo runs)
      if (game.newHostiles.length) {
        if (PERF_MAP === null && !DEMO_MODE) {
          for (const d of game.newHostiles) {
            if (progress.discoverEnemy(d.id)) hostileQueueRef.current.push(d);
          }
        }
        game.newHostiles.length = 0;
      }
      if (!hostileRevealRef.current && hostileQueueRef.current.length) {
        const d = hostileQueueRef.current.shift()!;
        hostileRevealRef.current = d; setHostileReveal(d);
        revealElapsedRef.current = 0;
      }
      // dismiss the reveal toast after ~3.8s, but only count real time while unpaused
      // (so a player who pauses to read it keeps it on screen)
      if (hostileRevealRef.current && !game.paused) {
        revealElapsedRef.current += dt;
        if (revealElapsedRef.current > 3.8) { hostileRevealRef.current = null; setHostileReveal(null); }
      }
      // Checkpoint only on MILESTONE build phases (opener + every 10th wave), not every
      // wave + every 30s — that was ~60-90 Firestore writes/run. submitRunCheckpoint
      // additionally self-gates on consent + per-run sampling, so most runs write none.
      if (PERF_MAP === null && !DEMO_MODE && game.phase === 'build' && game.wave > checkpointWaveRef.current) {
        checkpointWaveRef.current = game.wave;
        flushReplayStreamBoundary();
        if (isMilestoneWave(game.wave)) flushRunCheckpoint('wave');
      }
      // fire one anonymous telemetry event when a run ends (skip perf bot runs)
      if (PERF_MAP === null && !DEMO_MODE && !loggedRunRef.current &&
          (game.phase === 'gameover' || game.phase === 'victory')) {
        loggedRunRef.current = true;
        void submitCheckpointNow('terminal');
        logTelemetry({
          kind: game.phase, map: game.map.id, diff: game.diff.id,
          wave: game.wave, kills: game.totalKills, cash: Math.round(game.runStats.cashEarned),
          won: game.phase !== 'gameover', freeplay: game.freeplay, durationS: Math.round(game.time),
          leaks: game.runStats.leaks, coresLeft: game.lives,
          // tower types fielded this run (standing + any that fired before being sold)
          towers: [...new Set([...game.towers.map((t) => t.def.id), ...Object.keys(game.runStats.dmg)])].join(','),
          // top-3 damage contributors as "id:pct" — causal "which tower carried"
          dmg: (() => {
            const e = Object.entries(game.runStats.dmg).sort((a, b) => b[1] - a[1]);
            const total = e.reduce((s, [, v]) => s + v, 0) || 1;
            return e.slice(0, 3).map(([id, v]) => `${id}:${Math.round((v / total) * 100)}`).join(',');
          })(),
          abilities: game.runStats.abilitiesCast,
        });
        void submitRunAnalytics(game.buildRunAnalyticsDoc(progress.playerName || 'WARDEN', progress.uid, TELEMETRY_BUILD));
        // credit the meta layer (XP/salvage/quests) — cosmetic only; reads engine values, never mutates the Game
        const reward = meta.creditRun(game.runId, {
          wave: game.wave, kills: game.totalKills, cashEarned: game.runStats.cashEarned,
          won: game.phase !== 'gameover', freeplay: game.freeplay, diffId: game.diff.id,
          isDailyChallenge: game.isDailyChallenge, dailyId: game.dailyMeta().daily || undefined, outcome: game.phase as 'victory' | 'gameover',
          bonusSalvage: game.runStats.bonusSalvage, yakkob: isYakkob(game.dailyChallenge),
        }, {
          towerKindsUsed: new Set([...game.towers.map((t) => t.def.id), ...Object.keys(game.runStats.dmg)]).size,
          abilitiesCast: game.runStats.abilitiesCast,
        });
        if (reward.xp || reward.salvage) setMetaReward(reward);
      }
      const ctx = ctxRef.current ?? (ctxRef.current = canvasRef.current?.getContext('2d') ?? null);
      if (ctx) {
        const hover = hoverRef.current;
        const pl = placingRef.current;
        const projection = pl && veteranDeployActiveRef.current ? projectedVeteranDeploy(game, pl) : null;
        const placingTiers = projection ? { a: projection.tierA, b: projection.tierB } : null;
        const placingLabel = projection
          ? (projection.upgrades > 0
            ? `베테랑 A${projection.tierA}/B${projection.tierB} - ${projection.totalCost}크레딧`
            : `${projection.baseCost}크레딧`)
          : null;
        render(ctx, game, {
          hover,
          placing: pl,
          canPlaceHere: !!(hover && pl) && game.canPlace(hover!) && game.credits >= game.cost(pl!),
          placingTiers,
          placingRange: projection?.range,
          placingLabel,
          keyboardCursor: keyboardPlacementRef.current,
          selected: selectedRef.current,
          aimingStrike: aimingRef.current,
        });
        // perf harness: a synchronous frame for CPU-cost timing immune to rAF throttle
        if (PERF_MAP !== null) {
          (window as unknown as { __frame?: (d: number) => void }).__frame = (d: number) => {
            game.update(d);
            render(ctx, game, { hover: null, placing: null, canPlaceHere: false, selected: null, aimingStrike: false });
          };
        }
      }
      uiTimer += dt;
      if (uiTimer > 0.12) {
        uiTimer = 0;
        setTick((t) => t + 1);
        // first-cloaked-hull explainer — a non-blocking toast (does NOT pause the wave)
        if (game.cloakTipPending) {
          game.cloakTipPending = false;
          progress.cloakTipSeen = true;
          setCloakTip(true);
          window.setTimeout(() => setCloakTip(false), 14000);
        }
        // tower-unlock modal (BTD-style): first time a tower's kill threshold is crossed.
        // Only during BUILD — a kill threshold is almost always crossed mid-combat, and a
        // full-screen pause-modal yanking the player out of an active wave is jarring; it
        // pops at the next build phase instead.
        if (PERF_MAP === null && !DEMO_MODE && !game.isDailyFreeplay && !game.paused && !overlayRef.current && game.phase === 'build') {
          const k = progress.record.kills + game.totalKills;
          const just = TOWERS_BY_UNLOCK.find((d) => d.unlockAt > 0 && d.unlockAt <= k && !progress.unlockSeen(d.id));
          if (just) {
            game.recorder.recordUnlockViewed(just.id);
            progress.markUnlockSeen(just.id);
            game.paused = true;
            setUnlockModal(just);
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game, flushRunCheckpoint, submitCheckpointNow]);

  const toCanvas = useCallback((ev: { clientX: number; clientY: number }): Vec => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    // account for object-fit: contain letterboxing
    const scale = Math.min(r.width / W, r.height / H);
    const ox = r.left + (r.width - W * scale) / 2;
    const oy = r.top + (r.height - H * scale) / 2;
    return { x: (ev.clientX - ox) / scale, y: (ev.clientY - oy) / scale };
  }, []);

  const coarsePointer = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const selectTowerAt = (pos: Vec, radius = coarsePointer() ? 32 : 20): Tower | null => {
    for (const t of game.towers) {
      if (Math.hypot(t.pos.x - pos.x, t.pos.y - pos.y) <= radius) return t;
    }
    return null;
  };

  const findKeyboardStart = (): Vec => {
    const path = game.map.path;
    const center = path[Math.floor(path.length / 2)] ?? { x: W / 2, y: H / 2 };
    for (let radius = KEYBOARD_GRID; radius <= 384; radius += KEYBOARD_GRID) {
      for (let dy = -radius; dy <= radius; dy += KEYBOARD_GRID) {
        for (let dx = -radius; dx <= radius; dx += KEYBOARD_GRID) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const pos = clampCursor({ x: center.x + dx, y: center.y + dy });
          if (game.canPlace(pos)) return pos;
        }
      }
    }
    return clampCursor({ x: W / 2, y: H / 2 });
  };

  const setPlacementMode = (def: TowerDef | null, keyboard = false) => {
    const wasKeyboardPlacement = keyboardPlacementRef.current;
    setPlacing(def);
    setSelectedUid(null);
    setAiming(false);
    setTouchPreview(null);
    keyboardPlacementRef.current = keyboard && !!def;
    if (keyboard && def) {
      const pos = keyboardCursorRef.current ?? findKeyboardStart();
      keyboardCursorRef.current = pos;
      hoverRef.current = pos;
      game.announce(`${def.name}: 화살표 키로 이동, Enter는 건설, Esc는 취소`);
    } else if (!def) {
      keyboardCursorRef.current = null;
      if (wasKeyboardPlacement) hoverRef.current = null;
    }
    setTick((t) => t + 1);
  };

  const placeSelectedTower = (def: TowerDef, pos: Vec): Tower | null => {
    const tower = game.placeTower(def, pos);
    if (!tower) return null;
    const bought = veteranDeployActiveRef.current ? applyVeteranDeploy(game, tower) : 0;
    if (bought > 0) {
      game.announce(`${tower.def.name} 베테랑 배치 A${tower.tierA}/B${tower.tierB}`);
    } else {
      game.announce(`${tower.def.name} 배치됨`);
    }
    setTick((t) => t + 1);
    return tower;
  };

  const focusSelectedUpgradePanel = () => {
    if (!selectedRef.current) return;
    if (!sideOpenRef.current) setSideOpen(true);
    requestAnimationFrame(() => {
      const first = document.querySelector<HTMLButtonElement>('.tower-detail .upgrade-btn:not(:disabled), .tower-detail .sell-btn');
      first?.focus();
    });
  };

  const cycleBuiltTower = (dir: 1 | -1) => {
    if (game.towers.length === 0) {
      game.announce('확인할 배치된 타워가 없습니다');
      return;
    }
    const current = selectedRef.current;
    const currentIndex = current ? game.towers.findIndex((tower) => tower.uid === current.uid) : keyboardTowerIndexRef.current;
    const nextIndex = (Math.max(-1, currentIndex) + dir + game.towers.length) % game.towers.length;
    keyboardTowerIndexRef.current = nextIndex;
    const tower = game.towers[nextIndex];
    setPlacementMode(null);
    setSelectedUid(tower.uid);
    if (!sideOpenRef.current) setSideOpen(true);
    game.announce(`${tower.def.name} 선택됨. Enter를 눌러 업그레이드.`);
    sfx.click();
  };

  const castStrikeAt = (pos: Vec) => {
    const cast = game.castAbility('strike', pos);
    setAiming(false);
    setTouchPreview(null);
    if (!cast) {
      setShakeAbility(null);
      requestAnimationFrame(() => setShakeAbility('strike'));
    }
    return cast;
  };

  // Touch placement is deliberate in portal/mobile embeds: first tap previews the
  // ghost/range, second tap in the same neighborhood confirms the build.
  const onCanvasTouch = (ev: React.TouchEvent) => {
    const t = ev.touches[0];
    if (t) hoverRef.current = toCanvas(t);
  };
  const onCanvasTouchEnd = (ev: React.TouchEvent) => {
    const t = ev.changedTouches[0];
    if (!t) return;
    ev.preventDefault();
    suppressMouseUntilRef.current = Date.now() + 450;
    const pos = toCanvas(t);
    hoverRef.current = pos;
    if (aiming) {
      castStrikeAt(pos);
      return;
    }
    if (game.collectPickup(pos)) return;
    if (placing) {
      const previewMatches = touchPreview?.towerId === placing.id
        && Math.hypot(touchPreview.x - pos.x, touchPreview.y - pos.y) <= 36;
      if (!previewMatches) {
        setTouchPreview({ towerId: placing.id, x: pos.x, y: pos.y });
        setTick((v) => v + 1);
        sfx.click();
        return;
      }
      const placed = placeSelectedTower(placing, pos);
      if (placed) {
        setPlacementMode(null);
        setTouchPreview(null);
      } else {
        sfx.error();
      }
      return;
    }
    const found = selectTowerAt(pos, 34);
    setSelectedUid(found ? found.uid : null);
    if (found) { if (!sideOpenRef.current) setSideOpen(true); sfx.click(); }
  };

  const onCanvasMove = (ev: React.MouseEvent) => {
    keyboardPlacementRef.current = false;
    hoverRef.current = toCanvas(ev);
  };
  const onCanvasLeave = () => {
    if (!keyboardPlacementRef.current) hoverRef.current = null;
  };
  const onCanvasClick = (ev: React.MouseEvent) => {
    if (Date.now() < suppressMouseUntilRef.current) return;
    const pos = toCanvas(ev);
    if (aiming) {
      castStrikeAt(pos);
      return;
    }
    if (game.collectPickup(pos)) return;
    if (placing) {
      const t = placeSelectedTower(placing, pos);
      if (t && !ev.shiftKey) setPlacementMode(null);
      return;
    }
    // select tower under cursor
    const found = selectTowerAt(pos);
    setSelectedUid(found ? found.uid : null);
    if (found) { if (!sideOpenRef.current) setSideOpen(true); sfx.click(); }
  };
  const onContext = (ev: React.MouseEvent) => {
    ev.preventDefault();
    if (placing) game.recorder.recordControl(METRIC_EVENTS.PLACEMENT_CANCEL);
    if (aiming) game.recorder.recordControl(METRIC_EVENTS.ABILITY_AIM_CANCEL);
    setPlacementMode(null);
    setSelectedUid(null);
    setAiming(false);
  };

  const useAbility = (id: typeof ABILITIES[number]['id']) => {
    const a = ABILITIES.find((x) => x.id === id)!;
    if (!game.abilityReady(id)) { sfx.error(); setShakeAbility(null); requestAnimationFrame(() => setShakeAbility(id)); return; }
    if (a.targeted) {
      if (aiming) game.recorder.recordControl(METRIC_EVENTS.ABILITY_AIM_CANCEL);
      const next = !aiming;
      // setPlacementMode(null) resets aiming to false, so toggle aiming *after* it
      // or the entering-aim state is immediately clobbered in the same batch.
      setPlacementMode(null);
      setSelectedUid(null);
      setAiming(next);
      game.announce(next ? `${a.name}: 폭격 지점을 선택하세요` : `${a.name} 조준 취소됨`);
      sfx.click();
    } else {
      game.castAbility(id);
    }
  };
  const useAbilityRef = useRef(useAbility);
  useAbilityRef.current = useAbility;

  useEffect(() => {
    const pauseForWidgets = () => {
      if (utilityWidgetOpen()) game.paused = true;
    };
    window.addEventListener(WIDGET_OPEN_EVENT, pauseForWidgets);
    pauseForWidgets();
    return () => window.removeEventListener(WIDGET_OPEN_EVENT, pauseForWidgets);
  }, [game]);

  // While the phone-portrait "rotate for command view" overlay covers the
  // board, waves must not keep running unseen. Pause on match; resume on
  // rotate-back only if THIS effect paused (a player's own pause sticks).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px) and (orientation: portrait)');
    let pausedByRotate = false;
    const apply = () => {
      if (mq.matches) {
        if (!game.paused) {
          game.paused = true;
          pausedByRotate = true;
        }
      } else if (pausedByRotate) {
        pausedByRotate = false;
        if (!utilityWidgetOpen()) game.paused = false;
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [game]);

  useLayoutEffect(() => {
    document.body.classList.add('game-active');
    document.body.classList.toggle('game-sidebar-open', sideOpen);
    document.body.classList.toggle('game-sidebar-collapsed', !sideOpen);
    document.body.classList.toggle('game-blocking-overlay', blockingOverlay);
    return () => {
      document.body.classList.remove('game-active', 'game-sidebar-open', 'game-sidebar-collapsed', 'game-blocking-overlay');
    };
  }, [sideOpen, blockingOverlay]);

  useEffect(() => {
    if (!abortConfirm) return;
    const id = window.setTimeout(() => setAbortConfirm(false), 3500);
    return () => window.clearTimeout(id);
  }, [abortConfirm]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (isTypingTarget(ev.target)) return;
      // 'm' mutes from anywhere — even behind a pausing modal (unlock/cloak/relic), so a
      // player can always kill unexpected audio without dismissing the overlay first.
      if (ev.key.toLowerCase() === 'm' && !utilityWidgetOpen()) {
        const m = !muted; setMuted(m); setMutedState(m); appMetrics.recordSoundToggle('sound');
        return;
      }
      if (utilityWidgetOpen() || blockingOverlayRef.current) return;
      if (isControlTarget(ev.target) && ev.key !== 'Escape') return;
      if (ev.key === 'Escape') {
        if (placingRef.current) game.recorder.recordControl(METRIC_EVENTS.PLACEMENT_CANCEL);
        if (aimingRef.current) game.recorder.recordControl(METRIC_EVENTS.ABILITY_AIM_CANCEL);
        setPlacementMode(null); setSelectedUid(null); setAiming(false);
        return;
      }
      if (placingRef.current && keyboardPlacementRef.current) {
        if (ev.key.startsWith('Arrow')) {
          ev.preventDefault();
          const current = keyboardCursorRef.current ?? findKeyboardStart();
          const next = clampCursor({
            x: current.x + (ev.key === 'ArrowLeft' ? -KEYBOARD_GRID : ev.key === 'ArrowRight' ? KEYBOARD_GRID : 0),
            y: current.y + (ev.key === 'ArrowUp' ? -KEYBOARD_GRID : ev.key === 'ArrowDown' ? KEYBOARD_GRID : 0),
          });
          keyboardCursorRef.current = next;
          hoverRef.current = next;
          setTick((t) => t + 1);
          return;
        }
        if (ev.key === 'Enter') {
          ev.preventDefault();
          const def = placingRef.current;
          const pos = keyboardCursorRef.current ?? findKeyboardStart();
          if (!def) return;
          const tower = placeSelectedTower(def, pos);
          if (tower) setPlacementMode(null);
          return;
        }
      }
      if (!placingRef.current && (ev.key === 'Tab' || ev.key.startsWith('Arrow'))) {
        if (game.towers.length > 0) {
          ev.preventDefault();
          cycleBuiltTower(ev.shiftKey || ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 1);
          return;
        }
      }
      if (!placingRef.current && selectedRef.current && ev.key === 'Enter') {
        ev.preventDefault();
        focusSelectedUpgradePanel();
        return;
      }
      if (ev.key === ' ') {
        ev.preventDefault();
        if (game.phase === 'build') {
          game.recorder.recordControl(METRIC_EVENTS.WAVE_LAUNCH_KEY);
          game.startWave();
        } else {
          game.paused = !game.paused;
          game.recorder.recordControl(METRIC_EVENTS.FIRST_PAUSE, game.time);
        }
      }
      const ab = { q: 'strike', w: 'chrono', e: 'overdrive', r: 'salvage', t: 'cascade', y: 'mirror', u: 'recalibrate' } as const;
      const k = ev.key.toLowerCase() as keyof typeof ab;
      if (ab[k]) useAbilityRef.current(ab[k]);
      const n = ev.key === '0' ? 10 : parseInt(ev.key);
      if (n >= 1 && n <= TOWERS_BY_UNLOCK.length) {
        const def = TOWERS_BY_UNLOCK[n - 1];
        if (!towerAvailable(game, def)) {
          game.recorder.recordTowerShopSelect(def, 'locked');
          sfx.error();
          game.announce(towerLockText(game, def));
          return;
        }
        game.recorder.recordTowerShopSelect(def, game.credits >= game.cost(def) ? 'selected' : 'unaffordable');
        setPlacementMode(placingRef.current?.id === def.id ? null : def, true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, muted]);

  const selected = selectedRef.current;
  const abortRisk = game.phase !== 'build' || game.wave > 0 || game.towers.length > 0 || game.totalKills > 0;
  const exitToMenu = useCallback(() => {
    void requestPortalAdBreak('midgame', 'return_to_menu').finally(onExit);
  }, [onExit, requestPortalAdBreak]);

  const requestAbort = () => {
    if (abortRisk && !abortConfirm) {
      setAbortConfirm(true);
      game.paused = true;
      game.recorder.recordControl(METRIC_EVENTS.ABORT_ARMED);
      game.announce('중단 준비 완료 - 확인을 눌러 이 실행을 종료하세요.');
      sfx.error();
      return;
    }
    if (abortRisk) game.recorder.recordControl(METRIC_EVENTS.ABORT_CONFIRMED);
    if (abortRisk && game.phase !== 'gameover' && game.phase !== 'victory') {
      game.abandonRun('abort');
      if (PERF_MAP === null && !DEMO_MODE) {
        void submitCheckpointNow('abort');
        void submitRunAnalytics(game.buildRunAnalyticsDoc(progress.playerName || 'WARDEN', progress.uid, TELEMETRY_BUILD));
      }
    }
    exitToMenu();
  };

  useEffect(() => {
    if (checkpointState !== 'busy') setCheckpointState('idle');
  }, [game.wave]);

  const chooseContract = (id: FreeplayContractId) => {
    loggedRunRef.current = false;
    game.enterFreeplay(id);
    game.paused = false;
    setContractOpen(false);
    setTick((t) => t + 1);
    sfx.click();
  };

  const chooseRelic = (id: FreeplayRelicId) => {
    game.chooseRelic(id);
    setTick((t) => t + 1);
    sfx.upgrade();
  };

  const openGauntletDraft = () => {
    if (!activeGauntletRoute || !game.gauntletProtocol || gauntletLeg >= 3) return;
    const offer = gauntletProtocolDraftOffer(game.seed, (gauntletLeg + 1) as 2 | 3, gauntletRelicIds);
    const callsign = (progress.playerName.trim() || 'WARDEN').slice(0, 20);
    pendingGauntletReplayRef.current = { leg: gauntletLeg as 1 | 2, bundle: game.buildRunUploadBundle(callsign, TELEMETRY_BUILD) };
    setGauntletLegRunIds((ids) => {
      const next = [...ids];
      next[gauntletLeg - 1] = game.runId;
      return next;
    });
    setGauntletCredits(nextGauntletCredits(game.credits));
    setGauntletCores(game.lives);
    setGauntletDraft(offer);
    sfx.click();
  };

  const chooseGauntletDraft = (id: FreeplayRelicId) => {
    const picked = gauntletDraft?.find((relic) => relic.id === id);
    if (!picked || gauntletLeg >= 3) return;
    setGauntletRelicIds((ids) => [...ids, picked.id]);
    setGauntletDraft(null);
    setSelectedUid(null);
    setPlacementMode(null);
    setGauntletLeg((leg) => Math.min(3, leg + 1) as 1 | 2 | 3);
    setRun((r) => r + 1);
    sfx.upgrade();
  };

  const acceptRisk = (id: RiskWaveId) => {
    if (game.acceptRisk(id)) {
      setTick((t) => t + 1);
      sfx.upgrade();
    }
  };

  const declineRisk = () => {
    game.declineRisk();
    setTick((t) => t + 1);
    sfx.click();
  };

  const bankFreeplayCheckpoint = async () => {
    if (!game.canBankFreeplay() || checkpointState === 'busy' || DEMO_MODE) return;
    const n = (progress.playerName.trim() || 'WARDEN').slice(0, 20);
    const prevCheckpoint = game.freeplayState.lastCheckpointWave;
    setCheckpointState('busy');
    game.markFreeplayCheckpoint();
    await submitCheckpointNow('bank');
    game.recorder.recordScoreSubmitAttempt(game.telemetryState());
    const meta = game.freeplayMeta();
    const replay = await submitRunReplay(game.buildRunUploadBundle(n, TELEMETRY_BUILD));
    game.recorder.recordReplaySubmitResult(replay.ok);
    if (!replay.ok) {
      game.freeplayState.lastCheckpointWave = prevCheckpoint;
      game.recorder.recordScoreSubmitResult(false);
      void submitRunAnalytics(game.buildRunAnalyticsDoc(n, progress.uid, TELEMETRY_BUILD));
      setCheckpointState('err');
      sfx.error();
      setTick((t) => t + 1);
      return;
    }
    const scoreEntry = {
      name: n,
      cash: Math.round(game.runStats.cashEarned),
      kills: game.totalKills,
      wave: game.wave,
      freeplay: true,
      ts: Date.now(),
      runId: replay.runId,
      replayToken: replay.replayToken,
      meta: meta.summary,
      daily: meta.daily || undefined,
      checkpoint: true,
    };
    const ok = meta.daily
      ? await submitDailyScore(meta.daily, scoreEntry)
      : await submitScore(boardId(map.id, diff.id, true), scoreEntry);
    game.recorder.recordScoreSubmitResult(ok);
    void submitRunAnalytics(game.buildRunAnalyticsDoc(n, progress.uid, TELEMETRY_BUILD));
    if (ok) {
      setCheckpointState('done');
      sfx.upgrade();
    } else {
      game.freeplayState.lastCheckpointWave = prevCheckpoint;
      setCheckpointState('err');
      sfx.error();
    }
    setTick((t) => t + 1);
  };

  const nextWaveNumber = game.wave + 1;
  const nextWaveGroups = game.phase === 'build' ? game.previewWave(nextWaveNumber) : [];
  const nextWavePreview = summarizeWave(nextWaveGroups);
  const hasNextWaveCloak = nextWaveGroups ? hasCloakedWave(nextWaveGroups) : false;
  const displayedWaveLimit = activeGauntletRoute ? gauntletProtocolWaveCount(gauntletLeg) : activeDiff.waves;
  const adaptationType = game.adaptation.type;
  const adaptationResist = Math.round(game.adaptation.resist * 100);
  const recordWavePreviewHover = () => {
    const key = `${game.runId}:${nextWaveNumber}`;
    if (previewHoverRef.current === key) return;
    previewHoverRef.current = key;
    game.recorder.recordWavePreview('hover');
  };

  return (
    <div className={`game-root ${sideOpen ? 'sidebar-open' : 'sidebar-collapsed'}`} data-testid="game-root">
      <div className="rotate-device" data-testid="rotate-device">
        <div className="rotate-device-icon" aria-hidden="true">&#8635;</div>
        <b>명령 뷰를 보려면 회전</b>
        <span>가로 모드는 라인, 아스날, 웨이브 조작에 더 여유로운 공간을 제공합니다.</span>
      </div>
      {AI_HELP_ENABLED && (
        <AIHelpWidget
          placement="game"
          blocked={blockingOverlay}
          sideOpen={sideOpen}
          getContext={() => buildAIHelpContext({ screen: 'game', map, diff, game, selectedTower: selectedRef.current })}
        />
      )}
      <FeedbackWidget ctx="game" blocked={blockingOverlay} sideOpen={sideOpen} />
      <div className="topbar" aria-label="런 상태 및 조작">
        <button
          className={`tb-btn exit ${abortConfirm ? 'confirm' : ''}`}
          aria-label={abortConfirm ? '실행 중단 확인' : '실행 중단'}
          title={abortRisk ? '한 번 눌러 중단을 준비하고 다시 확인하세요.' : '메인 메뉴로 돌아가기'}
          onClick={() => requestAbort()}
        >
          {abortConfirm ? '확인' : '✕ 중단'}
        </button>
        <div className="tb-stat lives" title="원자로 코어 - 생명입니다. 모두 잃으면 등대가 함락됩니다." aria-label={`원자로 코어 ${game.lives}`}>
          <span className="tb-glyph" aria-hidden="true">⬢</span> <span className="tb-stat-num no-shift-counter">{game.lives}</span><span className="tb-tag">코어</span>
        </div>
        <div className="tb-stat credits" title="크레딧 - 격파 시 획득, 타워와 업그레이드에 사용." aria-label={`크레딧 ${Math.floor(game.credits)}`}>
          <span className="tb-glyph" aria-hidden="true">⌬</span> <span className="tb-stat-num no-shift-counter">{Math.floor(game.credits)}</span><span className="tb-tag">크레딧</span>
        </div>
        <div className="tb-stat wave" aria-label={`웨이브 ${game.wave}${game.phase === 'build' ? ` / ${game.freeplay ? '무한' : displayedWaveLimit}` : ''}`}>
          웨이브 <span className="tb-stat-num no-shift-counter">{game.wave}</span>{game.phase === 'build' ? <> / <span className="tb-stat-num no-shift-counter">{game.freeplay ? '∞' : displayedWaveLimit}</span></> : ''}
        </div>
        {game.dailyChallenge && (
          <div className="tb-stat daily-strip" title={game.dailyMeta().summary} aria-label={`${game.dailyMeta().label} 변이: ${game.dailyMeta().summary}`}>
            {game.isWeeklyChallenge ? '위클리' : '데일리'} <span>{game.dailyMeta().modifiers.join(' / ')}</span>
          </div>
        )}
        {!game.freeplay && !game.isDailyChallenge && (
          <BotGhostHud curves={ghostCurvesForMap(GHOST_CURVES, activeMap.id)} matchedDiffId={activeDiff.id} wave={game.wave} cores={game.lives} currentStartingLives={game.startingLives} phase={game.phase} />
        )}
        {PERF_MAP !== null && (
          <div className="tb-stat" style={{ color: '#7bed9f' }} title="성능 측정: 베테랑 봇, 4배속, 자동 프리플레이">
            ⏱ {fpsRef.current.fps}fps · {game.enemies.length}E {game.particles.length}P {game.projectiles.length}J
          </div>
        )}
        <div
          key={`${adaptationType || 'reserved'}-${Math.floor(game.wave / 10)}`}
          className={`tb-stat tb-adapt tb-adapt-slot ${adaptationType ? 'active' : ''}`}
          style={{ color: '#ff9f43' }}
          title={adaptationType ? `적응 프로토콜: 합동군이 향후 10웨이브 ${adaptationType} 데미지에 대한 장갑을 강화했습니다 - 데미지 타입을 바꾸세요` : undefined}
          aria-label={adaptationType ? `경고: ${adaptationType} 데미지가 ${adaptationResist}% 저항됩니다` : undefined}
          aria-hidden={!adaptationType}
        >
          ⛨ <span className="tb-adapt-type">{adaptationType || 'energy'}</span> −<span className="no-shift-counter">{adaptationType ? adaptationResist : 0}</span>%
        </div>
        <div className="tb-spacer" />
        <div className="tb-stat kills" title="격파한 적" aria-label={`격파한 적 수 ${game.totalKills}`}>
          <span className="tb-glyph" aria-hidden="true">☠</span> <span className="tb-stat-num no-shift-counter">{game.totalKills}</span><span className="tb-tag">격파</span>
        </div>
        <button
          className={`tb-btn ${game.autoNext ? 'on' : ''}`}
          title="다음 웨이브 자동 시작"
          aria-label="다음 웨이브 자동 시작 토글"
          onClick={() => { game.autoNext = !game.autoNext; game.recorder.recordControl(METRIC_EVENTS.AUTO_TOGGLE, game.autoNext); sfx.click(); }}
        >자동</button>
        {[1, 2, 4].map((s) => (
          <button key={s} className={`tb-btn ${game.speed === s ? 'on' : ''}`}
            title={`게임 속도를 ${s}x로 설정`}
            aria-label={`게임 속도를 ${s}x로 설정`}
          onClick={() => { game.setSpeed(s); progress.preferredSpeed = s; game.recorder.recordControl(METRIC_EVENTS.SPEED_CHANGE, s); sfx.click(); }}>{s}×</button>
        ))}
        <button className={`tb-btn ${game.paused ? 'on' : ''}`}
          title={game.paused ? '게임 재개' : '게임 일시정지'}
          aria-label={game.paused ? '게임 재개' : '게임 일시정지'}
          onClick={() => { game.paused = !game.paused; game.recorder.recordControl(METRIC_EVENTS.FIRST_PAUSE, game.time); sfx.click(); }}>
          {game.paused ? '▶' : '⏸'}
        </button>
        <MusicButton />
        <button className={`tb-btn ${muted ? '' : 'on'}`} title="효과음 및 음성 켜기/끄기" aria-label="효과음 및 음성 토글"
          onClick={() => { const m = !muted; setMuted(m); setMutedState(m); appMetrics.recordSoundToggle('sound'); sfx.click(); }}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      <div className={`game-body ${terminalPhase ? 'terminal' : ''}`}>
        <div className="canvas-wrap">
          <canvas
            data-testid="game-canvas"
            ref={canvasRef} width={W} height={H}
            onMouseMove={onCanvasMove} onMouseLeave={onCanvasLeave}
            onClick={onCanvasClick} onContextMenu={onContext}
            onTouchStart={onCanvasTouch} onTouchMove={onCanvasTouch} onTouchEnd={onCanvasTouchEnd}
            style={{ cursor: aiming || placing ? 'crosshair' : 'default', touchAction: 'none' }}
          />
          {touchPreview && placing && (
            <div className="touch-place-hint">{placing.name} 배치를 위해 한 번 더 탭</div>
          )}
          {/* commander abilities */}
          <div className="ability-bar">
            {game.abilities.map((a, i) => {
              const locked = game.wave < a.def.unlockWave;
              const ready = !locked && game.abilityReady(a.def.id);
              const pct = Math.min(1, a.cd / a.def.cooldown);
              return (
                <button
                  key={a.def.id}
                  className={`ability-btn ${ready ? 'ready' : ''} ${!locked && !ready ? 'cooling' : ''} ${aiming && a.def.id === 'strike' ? 'aiming' : ''} ${shakeAbility === a.def.id ? 'shake' : ''}`}
                  onAnimationEnd={(e) => { if (e.animationName === 'ability-shake') setShakeAbility((s) => (s === a.def.id ? null : s)); }}
                  disabled={locked}
                  aria-label={locked
                    ? `${a.def.name} 웨이브 ${a.def.unlockWave}에서 해제`
                    : `${a.def.name} 능력, ${ABILITY_KEYS[i]}`}
                  title={locked
                    ? `${a.def.name} — 웨이브 ${a.def.unlockWave}에서 사용 가능`
                    : `${a.def.name} (${ABILITY_KEYS[i]}) — ${a.def.desc}\n\n${ABILITY_LORE[a.def.id] ?? ''}`}
                  onClick={() => useAbility(a.def.id)}
                >
                  <span className="ability-icon">{locked ? '🔒' : <AbilityArt id={a.def.id} fallback={a.def.icon} />}</span>
                  <span className="ability-key">{ABILITY_KEYS[i]}</span>
                  {a.cd > 0 && <span className="ability-cd" style={{ height: `${pct * 100}%` }} />}
                  {a.cd > 0 && <span className="ability-cd-num">{Math.ceil(a.cd)}</span>}
                </button>
              );
            })}
          </div>

          {/* threat advisories */}
          {game.noticeTimer > 0 && (
            <div className="notice" role="status" aria-live="polite" aria-atomic="true">
              {game.notice}
            </div>
          )}
          <NewHostileReveal def={hostileReveal} />

          {game.freeplay && game.phase === 'build' && (
            <FreeplayBuildPanel
              game={game}
              checkpointState={checkpointState}
              onAcceptRisk={acceptRisk}
              onDeclineRisk={declineRisk}
              onBank={bankFreeplayCheckpoint}
            />
          )}

          {game.phase === 'build' && (
            <button className="wave-btn" data-testid="launch-wave" disabled={relicOfferOpen} onClick={() => { game.recorder.recordControl(METRIC_EVENTS.WAVE_LAUNCH_CLICK); game.startWave(); setTick((t) => t + 1); }}>
              ▶ 웨이브 {game.wave + 1} 시작
            </button>
          )}
          {game.paused && <div className="overlay-label">일시정지</div>}
          {coachStage && briefed && (
            <div className="coach-chip" role="status" aria-live="polite" data-testid="coach-chip">
              <span className="coach-step" aria-hidden="true">{coachStage === 'place' ? '1/3' : coachStage === 'launch' ? '2/3' : '3/3'}</span>
              <span className="coach-text">
                {coachStage === 'place' && <>에서 터렛 선택: <b>아스날</b>, 그 다음 라인 옆 빈 공간을 탭하세요.</>}
                {coachStage === 'launch' && <>방어 준비 완료 — 준비되면 <b>▶ 웨이브 시작</b>(또는 SPACE)을 누르세요.</>}
                {coachStage === 'upgrade' && <>터렛을 탭하고 구매: <b>업그레이드</b> — 두 갈래 중 하나를 선택하세요.</>}
              </span>
              <button className="coach-skip" onClick={dismissCoach}>가이드 건너뛰기</button>
            </div>
          )}
          {!veteranIntroDone && (
            <VeteranIntro
              onDone={() => { progress.veteranIntroSeen = true; setVeteranIntroDone(true); sfx.click(); }}
            />
          )}
          {!briefed && veteranIntroDone && (
            <BriefingOverlay
              lines={BRIEFING}
              portrait="/art/briefing.webp"
              audio="/audio/briefing.mp3"
              onDone={() => { setBriefed(true); sfx.waveStart(); }}
            />
          )}
          {game.phase === 'gameover' && (
            <Overlay title="그리드 오프라인" color="#ff4757" art="/art/defeat.webp" report={<EndReport game={game} map={activeMap} diff={activeDiff} reward={metaReward} gauntletProtocolRunIds={activeGauntletRoute ? [...gauntletLegRunIds.slice(0, gauntletLeg - 1), game.runId] : undefined} />}
              lines={[`합동군이 웨이브 ${game.wave}에서 돌파했습니다.`, `적 ${game.totalKills}대를 격파했습니다.`]}
              buttons={[
                { label: '↻ 섹터 재시도', fn: () => { sfx.click(); setSelectedUid(null); setPlacementMode(null); setRun((r) => r + 1); } },
                { label: '메인 메뉴', fn: exitToMenu },
              ]}
            />
          )}
          {cloakTip && (
            <div className="cloak-toast" role="status" aria-live="polite">
              <button className="cloak-toast-x" aria-label="닫기" onClick={() => { setCloakTip(false); sfx.click(); }}>✕</button>
              <div className="cloak-toast-title" style={{ color: '#ff6ec7' }}>⚠ 위상 은신 함선 출현</div>
              <p>
                빛나는 반투명한 함선들은 <b>위상 은신</b> 상태입니다 — 센서 범위 밖에서는 타워가 조준할 수 없으며,
                그대로 방어선을 통과합니다.
              </p>
              <p>
                대응: <b style={{ color: '#54a0ff' }}>EMP 스파이어</b>(주변의 은신을 노출),
                또는 센서 타워: <b style={{ color: '#ffa8a8' }}>레일건 포스트 · 스포터 업링크</b>,{' '}
                <b style={{ color: '#8ef5d9' }}>드론 캐리어 · 센서 스위트</b>, 그리고 <b style={{ color: '#9ffff5' }}>별빛 칸토르</b>.
              </p>
            </div>
          )}
          {unlockModal && (
            <Modal
              onClose={() => { setUnlockModal(null); game.paused = false; sfx.click(); }}
              overlayClass="cutscene-overlay" boxClass="cutscene-box unlock-modal" labelledBy="unlock-name-title"
              style={{ borderColor: unlockModal.color, ['--bc' as string]: unlockModal.glow }}
            >
              <div className="unlock-eyebrow">◆ 새 무기 해제 ◆</div>
              <div className="unlock-head">
                <div className="unlock-badge" style={{ ['--tc' as string]: unlockModal.color, ['--tg' as string]: unlockModal.glow }}>
                  <TowerIcon def={unlockModal} />
                </div>
                <div>
                  <div className="unlock-name" id="unlock-name-title" style={{ color: unlockModal.glow }}>{unlockModal.name}</div>
                  <div className="unlock-type">{unlockModal.base.damageType} · ⌬{unlockModal.cost}</div>
                </div>
              </div>
              <p className="tip-text">{unlockModal.desc}</p>
              <p className="unlock-lore">"{unlockModal.lore}"</p>
              <p className="hint-dim">아스날에서 확인하세요 — 두 갈래 업그레이드 경로, 최종 티어의 위력을 위해 한쪽을 선택하세요.</p>
              <button className="start-btn small" onClick={() => { setUnlockModal(null); game.paused = false; sfx.click(); }}>배치 ▸</button>
            </Modal>
          )}
          {contractOpen && <FreeplayContractModal onSelect={chooseContract} onCancel={() => { setContractOpen(false); game.paused = false; sfx.click(); }} />}
          {relicOfferOpen && <FreeplayRelicModal game={game} onSelect={chooseRelic} />}
          {game.phase === 'victory' && (
            <Overlay title={activeGauntletRoute && gauntletLeg < 3 ? `레그 ${gauntletLeg} 확보` : '섹터 확보'} color="#2ed573" art="/art/victory.webp" report={<EndReport game={game} map={activeMap} diff={activeDiff} reward={metaReward} gauntletProtocolRunIds={activeGauntletRoute ? [...gauntletLegRunIds.slice(0, gauntletLeg - 1), game.runId] : undefined} />}
              lines={[`${activeMap.name}에서 ${activeGauntletRoute ? gauntletProtocolWaveCount(gauntletLeg) : activeDiff.waves}개 웨이브를 모두 격퇴했습니다.`, `적 ${game.totalKills}대를 격파했습니다.`]}
              buttons={activeGauntletRoute
                ? [
                    gauntletLeg < 3
                      ? { label: '유물 초안', fn: openGauntletDraft }
                      : { label: '메인 메뉴', fn: exitToMenu },
                    { label: '메인 메뉴', fn: exitToMenu },
                  ]
                : [
                    { label: '프리플레이 계속', fn: () => chooseContract('standard') },
                    { label: '메인 메뉴', fn: exitToMenu },
                  ]}
            />
          )}
          {gauntletDraft && <GauntletRelicModal offer={gauntletDraft} onSelect={chooseGauntletDraft} leg={gauntletLeg + 1} />}
        </div>

        <div className={`sidebar ${sideOpen ? '' : 'collapsed'}`} data-testid="game-sidebar">
          {sideOpen ? (
            <div className="side-body">
              {selected ? (
                <UpgradePanel game={game} tower={selected}
                  sig={`${Math.floor(game.credits)}|${selected.tierA}|${selected.tierB}|${selected.committed}|${selected.invested}|${selected.kills}|${selected.target}|${selected.targetFilters.join(',')}|${selected.rateBuff.toFixed(2)}|${selected.rangeBuff.toFixed(2)}`}
                  onSold={() => setSelectedUid(null)} onCollapse={() => { game.recorder.recordControl(METRIC_EVENTS.SIDE_PANEL_COLLAPSE); setSideOpen(false); sfx.click(); }} />
              ) : (
                <Shop game={game} placing={placing}
                  sig={`${Math.floor(game.credits)}|${game.totalKills}|${game.isDailyChallenge ? [...(game.dailyTowerIds ?? [])].join(',') : 'campaign'}|${veteranDeployActive ? 'veteran' : 'standard'}`}
                  veteranDeploy={veteranDeployActive}
                  veteranDeployUnlocked={veteranDeployUnlocked}
                  onVeteranDeployChange={(next) => { setVeteranDeploy(next); progress.veteranDeploy = next; sfx.click(); }}
                  setPlacing={(d) => setPlacementMode(d)} onCollapse={() => { game.recorder.recordControl(METRIC_EVENTS.SIDE_PANEL_COLLAPSE); setSideOpen(false); sfx.click(); }} />
              )}
              {game.phase === 'build' && (
                <WavePreviewPanel wave={nextWaveNumber} items={nextWavePreview} onHover={recordWavePreviewHover} hasCloakedIncoming={hasNextWaveCloak} />
              )}
            </div>
          ) : (
            <button className="side-rail" title="패널 펼치기" aria-label="아스날 패널 펼치기" onClick={() => { game.recorder.recordControl(METRIC_EVENTS.SIDE_PANEL_EXPAND); setSideOpen(true); sfx.click(); }}>
              <span className="side-rail-arrow">⟨</span>
              <span className="side-rail-label">아스날</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FreeplayBuildPanel({
  game,
  checkpointState,
  onAcceptRisk,
  onDeclineRisk,
  onBank,
}: {
  game: Game;
  checkpointState: 'idle' | 'busy' | 'done' | 'err';
  onAcceptRisk: (id: RiskWaveId) => void;
  onDeclineRisk: () => void;
  onBank: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const fp = game.freeplayState;
  const nextWave = game.wave + 1;
  const nextRival = rivalForWave(nextWave, fp.daily);
  const meta = game.freeplayMeta();
  const risk = fp.riskOffer;
  const bankTarget = fp.daily ? '데일리' : '프리플레이';
  const bankLabel = checkpointState === 'busy' ? '기록 중...' : checkpointState === 'done' ? '기록됨' : checkpointState === 'err' ? '다시 시도' : `${bankTarget} 기록 저장`;
  if (collapsed) {
    return (
      <button className="freeplay-reopen" onClick={() => setCollapsed(false)} title="프리플레이 사령부 표시">
        ◂ 프리플레이 {risk ? '⚠' : `${meta.scoreMult.toFixed(2)}x`}
      </button>
    );
  }
  return (
    <div className="freeplay-build-panel">
      <div className="freeplay-panel-head">
        <span>프리플레이 사령부</span>
        <b>{meta.scoreMult.toFixed(2)}x</b>
        <button className="freeplay-close" aria-label="프리플레이 사령부 숨기기" title="숨기기" onClick={() => setCollapsed(true)}>✕</button>
      </div>
      <div className="freeplay-chip-row">
        <span className="freeplay-chip contract">{fp.contract?.short ?? '미정'}</span>
        {fp.daily && <span className="freeplay-chip daily">데일리</span>}
        {fp.relics.slice(-3).map((r) => <span key={r.id} className="freeplay-chip">{r.name}</span>)}
      </div>
      <div className="freeplay-next-grid">
        <div>
          <span>다음 변이</span>
          <b>{fp.nextMutators.length ? fp.nextMutators.map((m) => m.name).join(' + ') : '표준 압박'}</b>
        </div>
        <div className="freeplay-rival-cell">
          {nextRival && <img className="freeplay-rival-face" src={art(`/art/rival-${nextRival.id.toLowerCase()}.webp`)} alt="" draggable={false} loading="lazy" decoding="async" title={nextRival.desc} />}
          <div>
            <span>라이벌</span>
            <b>{nextRival ? nextRival.name : nextWave % 10 === 0 ? '신호 형성 중' : '없음'}</b>
          </div>
        </div>
      </div>
      {risk && (
        <div className="risk-offer">
          <div>
            <span>적색 경보 제안</span>
            <b>{risk.name}</b>
            <p>{risk.desc} {risk.reward}</p>
          </div>
          <div className="risk-actions">
            <button className="tb-btn on" onClick={() => onAcceptRisk(risk.id)}>수락</button>
            <button className="tb-btn" onClick={() => onDeclineRisk()}>건너뛰기</button>
          </div>
        </div>
      )}
      <button className="freeplay-bank-btn" disabled={!game.canBankFreeplay() || checkpointState === 'busy' || DEMO_MODE} onClick={onBank}>
        {bankLabel}
      </button>
      <div className="freeplay-bank-note">
        {game.canBankFreeplay()
          ? `웨이브 ${game.wave}을(를) 기록하고 계속 플레이하세요.`
          : `다음 기록은 웨이브 ${fp.lastCheckpointWave} 이후에 해제됩니다.`}
      </div>
    </div>
  );
}

function FreeplayContractModal({ onSelect, onCancel }: { onSelect: (id: FreeplayContractId) => void; onCancel: () => void }) {
  return (
    <Modal onClose={onCancel} overlayClass="cutscene-overlay" boxClass="cutscene-box freeplay-modal" labelledBy="freeplay-contract-title">
      <div className="cutscene-title" id="freeplay-contract-title">명성 계약</div>
      <p className="tip-text">끝없는 공성전의 점수 방식을 선택하세요. 승수가 높을수록 프리플레이 전체에 실제 제약이 추가됩니다.</p>
      <div className="contract-grid">
        {FREEPLAY_CONTRACTS.map((c) => (
          <button key={c.id} className="contract-card" onClick={() => onSelect(c.id)}>
            <span className="contract-mult">{c.multiplier.toFixed(2)}x</span>
            <b>{c.name}</b>
            <p>{c.desc}</p>
          </button>
        ))}
      </div>
      <button className="tb-btn" onClick={onCancel}>뒤로</button>
    </Modal>
  );
}

function FreeplayRelicModal({ game, onSelect }: { game: Game; onSelect: (id: FreeplayRelicId) => void }) {
  const offer = game.freeplayState.nextRelicOffer;
  // a forced draft — no backdrop/Esc dismiss; you must pick one
  return (
    <Modal onClose={() => {}} overlayClass="cutscene-overlay" boxClass="cutscene-box freeplay-modal" labelledBy="freeplay-relic-title" closeOnBackdrop={false} closeOnEsc={false}>
      <div className="cutscene-title" id="freeplay-relic-title">유물 초안</div>
      <p className="tip-text">런 수정자 하나를 선택하세요. 유물은 영구적이고 강력하며 약간 위험합니다.</p>
      <div className="relic-grid">
        {offer.map((r) => (
          <button key={r.id} className="relic-card" onClick={() => onSelect(r.id)}>
            <span className="contract-mult">{r.scoreMult.toFixed(2)}x</span>
            <b>{r.name}</b>
            <p>{r.desc}</p>
            <em>{r.downside}</em>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function GauntletRelicModal({ offer, onSelect, leg }: { offer: ReturnType<typeof gauntletProtocolDraftOffer>; onSelect: (id: FreeplayRelicId) => void; leg: number }) {
  return (
    <Modal onClose={() => {}} overlayClass="cutscene-overlay gauntlet-draft-overlay" boxClass="cutscene-box freeplay-modal" labelledBy="gauntlet-relic-title" closeOnBackdrop={false} closeOnEsc={false}>
      <div className="cutscene-title" id="gauntlet-relic-title">건틀릿 유물 초안</div>
      <p className="tip-text">레그 {leg}에 사용할 수정자 하나를 선택하세요. 코어는 유지, 크레딧은 60% 유지, 타워는 초기화됩니다.</p>
      <div className="relic-grid">
        {offer.map((r) => (
          <button key={r.id} className="relic-card" onClick={() => onSelect(r.id)}>
            <span className="contract-mult">{r.scoreMult.toFixed(2)}x</span>
            <b>{r.name}</b>
            <p>{r.desc}</p>
            <em>{r.downside}</em>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function BriefingOverlay({ onDone, lines, portrait, audio }: { onDone: () => void; lines: string[]; portrait: string; audio: string }) {
  const stopRef = useRef<() => void>(() => {});
  useEffect(() => {
    stopRef.current = playBriefing(audio);
    return () => stopRef.current();
  }, [audio]);
  const finish = () => { stopRef.current(); onDone(); };
  return (
    <Modal onClose={finish} boxClass="overlay-box briefing" labelledBy="briefing-title" style={{ borderColor: 'var(--accent)' }} testId="briefing-overlay">
      <img className="brief-portrait" src={portrait} alt="통신" decoding="async" />
      <h2 id="briefing-title" style={{ color: 'var(--accent)' }}>신호 수신</h2>
      {lines.map((l, i) => <p key={i} className="brief-line">{l}</p>)}
      <div className="overlay-btns">
        <button className="start-btn small" onClick={finish}>수신 완료 ▸</button>
      </div>
    </Modal>
  );
}

// One-time briefing on the first Veteran deploy. Recruit → Veteran is not an HP
// wall (difficulty HP already ramps in over the first 25 waves); the real
// step-change is phase-cloaks and a tighter economy. Name them up front.
function VeteranIntro({ onDone }: { onDone: () => void }) {
  const points: { icon: string; title: string; body: ReactNode }[] = [
    { icon: '📡', title: '은신 웨이브 접근 중', body: <>어디선가 <b>웨이브 14</b>쯤부터 함선이 <b>은신 상태</b>로 등장합니다 — 감지기가 보기 전까지는 보이지 않습니다. <b>레일건 포스트 · 스포터 업링크</b>, <b>드론 캐리어 · 센서 스위트</b>, 또는 <b>EMP 스파이어</b>를 배치해 그들이 빠져나가지 못하게 하세요.</> },
    { icon: '🛡️', title: '적응 합동군', body: <>런이 깊어질수록 계속 강화되는 더 강한 함선들. 한 가지 교리만으로는 막히므로, 데미지 타입을 섞고 업그레이드 경로를 확정하세요.</> },
    { icon: '⌬', title: '더 빠듯한 경제', body: <>더 적은 코어, 더 빠듯한 크레딧, 더 비싼 타워. 모든 빌드는 그 자리를 값해야 합니다 — 신중히 쓰고, 가치가 떨어진 것은 팔아치우세요.</> },
  ];
  return (
    <Modal onClose={onDone} overlayClass="cutscene-overlay" boxClass="cutscene-box veteran-intro" labelledBy="veteran-intro-title" testId="veteran-intro">
      <div className="unlock-eyebrow" style={{ color: 'var(--gold)' }}>◆ 베테랑 출격 ◆</div>
      <h2 id="veteran-intro-title" className="cutscene-title" style={{ color: 'var(--gold)' }}>합동군이 적응합니다</h2>
      <p className="tip-text">캠페인을 돌파했습니다 — 사령부는 진짜 공성전을 맡깁니다. 세 가지가 달라집니다:</p>
      <ul className="veteran-intro-points">
        {points.map((p) => (
          <li key={p.title}>
            <span className="veteran-intro-icon" aria-hidden="true">{p.icon}</span>
            <span><b>{p.title}.</b> {p.body}</span>
          </li>
        ))}
      </ul>
      <div className="overlay-btns">
        <button className="start-btn small" onClick={onDone} data-testid="veteran-intro-ack">이해했습니다 ▸</button>
      </div>
    </Modal>
  );
}

function MusicButton() {
  const [on, setOn] = useState(isMusicOn());
  return (
    <button className={`tb-btn ${on ? 'on' : ''}`} title="음악 켜기/끄기" aria-label="음악 토글"
      onClick={() => { const v = !on; setMusic(v); setOn(v); appMetrics.recordSoundToggle('music'); }}>♪</button>
  );
}

// Run-end report: a balanced 2-column layout (reward + after-action on the left,
// score submit + dossier + leaderboard on the right) instead of one tall stack.
function EndReport({ game, map, diff, reward, gauntletProtocolRunIds }: { game: Game; map: GameMap; diff: DifficultyDef; reward: RunMetaReward | null; gauntletProtocolRunIds?: string[] }) {
  const submitEligible = game.phase === 'victory' ||
    (game.phase === 'gameover' && (game.freeplay || game.isDailyChallenge || game.isGauntletProtocol));
  // Unlocks banked during the final combat never reach another build phase, so the
  // mid-run unlock modal misses them — and the next run's silent back-fill would
  // swallow the reveal entirely. Celebrate them here. The engine banks kills at run
  // end, so progress.record.kills already includes this run.
  const [freshUnlocks] = useState(() => (PERF_MAP !== null || DEMO_MODE) ? [] : TOWERS_BY_UNLOCK.filter(
    (d) => d.unlockAt > 0 && d.unlockAt <= progress.record.kills && !progress.unlockSeen(d.id)));
  useEffect(() => {
    for (const d of freshUnlocks) progress.markUnlockSeen(d.id);
  }, [freshUnlocks]);
  const clearedWaves = game.isGauntletProtocol && game.gauntletProtocol
    ? gauntletProtocolWaveCount(game.gauntletProtocol.leg)
    : diff.waves;
  const stats = [
    { label: game.phase === 'victory' && !game.freeplay ? '클리어한 웨이브' : '도달 웨이브', value: game.phase === 'victory' && !game.freeplay ? `${clearedWaves}` : `${game.wave}` },
    { label: '격파한 함선', value: game.totalKills.toLocaleString() },
    { label: game.lives > 0 ? '남은 코어' : '잃은 코어', value: game.lives > 0 ? game.lives.toLocaleString() : game.runStats.leaks.toLocaleString() },
    { label: '획득한 크레딧', value: Math.round(game.runStats.cashEarned).toLocaleString() },
  ];
  // Mastery routing: a dominant Recruit clear (kept most cores, not freeplay) means
  // the player has outgrown the tutorial protocol — nudge them up to Veteran rather
  // than letting them farm easy. Reward mastery by routing, not by nerfing.
  const masteredRecruit = diff.id === 'easy' && game.phase === 'victory' && !game.freeplay
    && game.startingLives > 0 && game.lives >= Math.ceil(game.startingLives * 0.7)
    && !progress.best(map.id, 'normal');
  return (
    <div className={`debrief-layout ${submitEligible ? 'has-submit' : ''}`}>
      <div className="debrief-main">
        <div className="debrief-stat-strip" aria-label="런 요약 통계">
          {stats.map((item) => (
            <div className="debrief-stat" key={item.label}>
              <span>{item.label}</span>
              <b>{item.value}</b>
            </div>
          ))}
        </div>
        {masteredRecruit && (
          <div className="debrief-nudge" data-testid="debrief-veteran-nudge">
            <span className="debrief-nudge-icon" aria-hidden="true">▲</span>
            <span>
              <b>코어를 여유 있게 남긴 채 섹터를 지켰습니다.</b> 신병 단계를 졸업했습니다 — <b>베테랑</b>이 기다립니다:
              더 단단한 적응 합동군, 위상 은신, 더 빠듯한 경제. 출격 단계에서 <b>베테랑</b>을 선택하세요.
            </span>
          </div>
        )}
        {freshUnlocks.length > 0 && (
          <div className="debrief-unlocks" data-testid="debrief-unlocks">
            <div className="debrief-section-title">
              ◆ 해제된 새 무기 {freshUnlocks.length}종 ◆
            </div>
            <div className="debrief-unlock-icons">
              {freshUnlocks.map((d) => (
                <span
                  className="debrief-unlock-chip"
                  key={d.id}
                  title={`${d.name} — ${d.base.damageType} · ⌬${d.cost}\n${d.desc}`}
                  aria-label={`${d.name}, ${d.base.damageType}, 비용 ${d.cost}`}
                >
                  <span className="debrief-unlock-badge" style={{ ['--tc' as string]: d.color, ['--tg' as string]: d.glow }}>
                    <TowerIcon def={d} />
                  </span>
                  <i className="debrief-unlock-name" style={{ color: d.glow }}>{d.name}</i>
                </span>
              ))}
            </div>
          </div>
        )}
        <MetaReward reward={reward} />
        <AfterAction game={game} />
      </div>
      {submitEligible && <div className="debrief-submit"><SubmitScore game={game} map={map} diff={diff} gauntletProtocolRunIds={gauntletProtocolRunIds} /></div>}
    </div>
  );
}

// Non-blocking first-encounter banner — drives the Combine Bestiary discovery.
function NewHostileReveal({ def }: { def: EnemyDef | null }) {
  if (!def) return null;
  return (
    <div className="hostile-reveal" key={def.id}>
      <EnemyPortrait def={def} className="hostile-reveal-art" />
      <div className="hostile-reveal-text">
        <div className="hostile-reveal-eyebrow">{def.id === 'elite' ? '엘리트 변형 식별됨' : def.boss ? '⚠ 대형 함선 식별됨' : '새로운 적 식별됨'}</div>
        <div className="hostile-reveal-name" style={{ color: def.glow }}>{def.name}</div>
        <div className="hostile-reveal-lore">{def.lore}</div>
      </div>
    </div>
  );
}

function MetaReward({ reward }: { reward: RunMetaReward | null }) {
  if (!reward || (!reward.xp && !reward.salvage)) return null;
  const rank = meta.rank;
  return (
    <div className="meta-reward" data-testid="meta-reward">
      <div className="debrief-section-title">운영 보상</div>
      <div className="meta-reward-head">
        <span className="meta-reward-xp">+{reward.xp.toLocaleString()} XP</span>
        <span className="meta-reward-salvage">+<i className="ico-diamond" aria-hidden="true" />{reward.salvage.toLocaleString()} 잔해</span>
      </div>
      <div className="meta-reward-rank">
        <span>{rank.title}</span>
        <span className="meta-reward-bar"><span className="meta-reward-fill" style={{ width: `${rank.pct * 100}%` }} /></span>
      </div>
    </div>
  );
}

function AfterAction({ game }: { game: Game }) {
  const s = game.runStats;
  const dmg = Object.entries(s.dmg).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxDmg = dmg[0]?.[1] ?? 1;
  const kills = Object.entries(s.kills).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const name = (id: string) => TOWERS.find((t) => t.id === id)?.name ?? ENEMIES[id]?.name ?? id;
  return (
    <div className="aar">
      <div className="debrief-section-title">전투 결과 보고서</div>
      <div className="aar-cols">
        <div className="aar-col">
          <div className="aar-head">무기별 데미지</div>
          {dmg.length === 0 && <div className="aar-row"><span>발사한 샷 없음</span></div>}
          {dmg.map(([id, v]) => (
            <div key={id} className="aar-row" title={`${Math.round(v)} 데미지`}>
              <span>{name(id)}</span>
              <div className="aar-bar"><div style={{ width: `${(v / maxDmg) * 100}%`, background: TOWERS.find((t) => t.id === id)?.glow ?? '#4bcffa' }} /></div>
            </div>
          ))}
        </div>
        <div className="aar-col">
          <div className="aar-head">격파한 함선</div>
          {kills.map(([id, v]) => (
            <div key={id} className="aar-row">
              <span>{name(id)}</span><b>{v}</b>
            </div>
          ))}
          <div className="aar-row dim"><span>누수로 잃은 코어</span><b>{s.leaks}</b></div>
          <div className="aar-row dim"><span>사용한 능력</span><b>{s.abilitiesCast}</b></div>
        </div>
      </div>
    </div>
  );
}


function SubmitScore({ game, map, diff, gauntletProtocolRunIds }: { game: Game; map: GameMap; diff: DifficultyDef; gauntletProtocolRunIds?: string[] }) {
  const [name, setName] = useState(progress.playerName);
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  const [top, setTop] = useState<ScoreEntry[] | null>(null);
  const [dossier, setDossier] = useState<DossierInput | null>(null);
  const [sharedRunId, setSharedRunId] = useState<string | undefined>(undefined);
  const eligible = game.phase === 'victory' ||
    (game.phase === 'gameover' && (game.freeplay || game.isDailyChallenge || game.isGauntletChallenge));
  useEffect(() => {
    if (eligible && !DEMO_MODE) game.recorder.recordLeaderboardOpen();
  }, [eligible, game]);
  if (!eligible) return null;

  // THE YAKKOB is a local-ranked special edition — it must never touch the public
  // replay/score boards (Firestore rejects its fixed id → "insufficient permissions").
  // Its wave is already banked on-device via meta.creditRun({ yakkob }); show that
  // local ranking instead of the global submit form. No network write happens here.
  if (isYakkob(game.dailyChallenge)) {
    const bestWave = Math.max(meta.bestYakkobWave, game.wave);
    return (
      <div className="submit-score demo-score-disabled" data-testid="yakkob-local-rank">
        <div className="debrief-section-title">YAKKOB · 로컬 랭킹</div>
        <div className="submit-score-preview" aria-label={`베스트 야콥 웨이브 ${bestWave}, 이번 실행은 웨이브 ${game.wave} 도달, 격파 ${game.totalKills}`}>
          <span><b>최고 웨이브</b> W{bestWave}</span>
          <span><b>이번 실행</b> W{game.wave}</span>
          <span><b>격파</b> {game.totalKills.toLocaleString()}</span>
        </div>
        <p className="submit-hint">특별 에디션 — 이 기기에서 로컬로만 랭킹되며, 공개 글로벌 보드에는 절대 전송되지 않습니다.</p>
      </div>
    );
  }

  const board = boardId(map.id, diff.id, game.freeplay);
  const freeplayMeta = game.freeplay ? game.freeplayMeta() : null;
  const dailyMeta = game.isDailyChallenge ? game.dailyMeta() : null;
  const dailyId = dailyMeta?.daily || freeplayMeta?.daily || '';
  const weeklyId = game.isWeeklyChallenge ? dailyMeta?.weekly || '' : '';
  const gauntletWeek = game.gauntletChallenge?.week ?? '';
  const gauntletProtocolWeek = game.gauntletProtocol?.week ?? '';
  const leaderboardTitle = gauntletProtocolWeek
    ? `건틀릿 프로토콜 - ${gauntletProtocolWeek}`
    : gauntletWeek
    ? `건틀릿 리더보드 - ${gauntletWeek}`
    : weeklyId
      ? `위클리 리더보드 - ${weeklyId}`
      : dailyId
    ? `데일리 리더보드 - ${dailyId}`
    : `글로벌 리더보드 - ${map.name} / ${diff.name}${game.freeplay ? ' / 프리플레이' : ''}`;

  if (DEMO_MODE) {
    return (
      <div className="submit-score demo-score-disabled">
        <div className="debrief-section-title">리크루터 데모 실행</div>
        <p>데모 모드에서는 리더보드 제출이 비활성화되어 실시간 점수 데이터의 깨끗함이 유지됩니다.</p>
      </div>
    );
  }

  if (!canSubmitScore()) {
    return (
      <div className="submit-score demo-score-disabled">
        <div className="debrief-section-title">안전 모드</div>
        <p>리더보드 콜사인, 공개 리플레이, 피드백 메시지가 비활성화되어 이 기기 밖으로 개인 정보가 전송되지 않습니다.</p>
      </div>
    );
  }

  const submit = async () => {
    const n = (name.trim() || 'WARDEN').slice(0, 20);
    progress.playerName = n;
    setState('busy');
    game.recorder.recordScoreSubmitAttempt(game.telemetryState());
    const replay = await submitRunReplay(game.buildRunUploadBundle(n, TELEMETRY_BUILD));
    game.recorder.recordReplaySubmitResult(replay.ok);
    if (!replay.ok) {
      game.recorder.recordScoreSubmitResult(false);
      void submitRunAnalytics(game.buildRunAnalyticsDoc(n, progress.uid, TELEMETRY_BUILD));
      setState('err');
      sfx.error();
      return;
    }
    const scoreEntry = {
      name: n,
      cash: Math.round(game.runStats.cashEarned),
      kills: game.totalKills,
      wave: game.wave,
      freeplay: game.freeplay,
      ts: Date.now(),
      runId: replay.runId,
      replayToken: replay.replayToken,
      meta: dailyMeta?.summary ?? freeplayMeta?.summary,
      daily: dailyId || undefined,
      weekly: weeklyId || undefined,
      gauntlet: gauntletWeek || gauntletProtocolWeek || undefined,
      checkpoint: false,
    };
    const ok = gauntletProtocolWeek
      ? await submitGauntletProtocolScore(gauntletProtocolWeek, scoreEntry, gauntletProtocolRunIds ?? [game.runId])
      : gauntletWeek
      ? await submitGauntletScore(gauntletWeek, scoreEntry)
      : weeklyId
        ? await submitWeeklyScore(weeklyId, scoreEntry)
        : dailyId
      ? await submitDailyScore(dailyId, scoreEntry)
      : await submitScore(board, scoreEntry);
    game.recorder.recordScoreSubmitResult(ok);
    void submitRunAnalytics(game.buildRunAnalyticsDoc(n, progress.uid, TELEMETRY_BUILD));
    if (ok) {
      setTop(gauntletProtocolWeek
        ? await fetchGauntletProtocolTop(gauntletProtocolWeek)
        : gauntletWeek
        ? await fetchGauntletTop(gauntletWeek)
        : weeklyId
          ? await fetchWeeklyTop(weeklyId)
          : dailyId ? await fetchDailyTop(dailyId) : await fetchTop(board));
      try { setDossier(buildDossierInputFromGame(game, n)); } catch (e) { console.warn('dossier build failed', e); }
      setSharedRunId(replay.runId);
      setState('done');
      sfx.upgrade();
    } else {
      setState('err');
    }
  };

  return (
    <div className="submit-score">
      <div className="debrief-section-title">{leaderboardTitle}</div>
      {state !== 'done' && (
        <>
          <div className="submit-score-preview" aria-label={`획득 크레딧 ${Math.round(game.runStats.cashEarned)}, 격파 ${game.totalKills}${(game.freeplay || game.isDailyChallenge) ? `, 웨이브 ${game.wave}` : ''}`}>
            <span><b>크레딧</b> {Math.round(game.runStats.cashEarned).toLocaleString()}</span>
            <span><b>격파</b> {game.totalKills.toLocaleString()}</span>
            {(game.freeplay || game.isDailyChallenge) && <span><b>웨이브</b> {game.wave}</span>}
          </div>
          <div className="submit-row">
            <input className="name-input" maxLength={20} placeholder="콜사인" aria-label="리더보드 콜사인"
              value={name} onChange={(e) => setName(e.target.value)} />
            <button className="start-btn small" disabled={state === 'busy'} onClick={submit}>
              {state === 'busy' ? '…' : state === 'err' ? '재시도' : '제출'}
            </button>
          </div>
          <p className="submit-hint">{gauntletProtocolWeek ? '건틀릿 프로토콜' : gauntletWeek ? '건틀릿' : weeklyId ? '위클리' : dailyId ? '데일리' : '글로벌'} 리더보드에 콜사인과 점수가 공개 표시됩니다.</p>
        </>
      )}
      {state === 'done' && (
        <p className="submit-hint success">점수가 업로드되었습니다. 현재 보드 스냅샷:</p>
      )}
      {state === 'done' && top && (
        <div className="lb-table">
          {top.slice(0, 6).map((r, i) => (
            <div key={i} className={`lb-row ${r.name === name.trim() ? 'me' : ''}`}>
              <span className="lb-rank">{i + 1}</span>
              <span className="lb-name">{r.name}</span>
              <span className="lb-cash">크레딧 {r.cash.toLocaleString()}</span>
              <span className="lb-kills">격파 {r.kills.toLocaleString()}</span>
              {(r.freeplay || dailyId || weeklyId || gauntletWeek || gauntletProtocolWeek) && <span className="lb-wave">W{r.wave}</span>}
            </div>
          ))}
        </div>
      )}
      {state === 'done' && dossier && <DossierShare input={dossier} runId={sharedRunId} compact />}
    </div>
  );
}

function Overlay(props: { title: string; color: string; lines: string[]; buttons: { label: string; fn: () => void }[]; art?: string; report?: ReactNode }) {
  const style = { '--overlay-accent': props.color } as React.CSSProperties;
  // run-end is a decision screen: no backdrop dismiss AND no Esc-to-close. The callsign input
  // autofocuses here, so Esc-to-exit would kick a player typing their name back to the menu and
  // lose the unsubmitted score. Players leave via the explicit buttons (onClose is unreachable).
  return (
    <Modal onClose={() => {}} closeOnBackdrop={false} closeOnEsc={false} boxClass={`overlay-box ${props.report ? 'result' : ''}`} labelledBy="result-overlay-title" style={style}>
      <div className="result-hero">
        {props.art && <img className="overlay-art" src={props.art} alt="" />}
        <h2 id="result-overlay-title">{props.title}</h2>
        <div className="overlay-copy">
          {props.lines.map((l, i) => <p key={i}>{l}</p>)}
        </div>
      </div>
      {props.report}
      <div className="overlay-btns">
        {props.buttons.map((b) => (
          <button key={b.label} className="start-btn small" onClick={b.fn}>{b.label}</button>
        ))}
      </div>
    </Modal>
  );
}

function WavePreviewPanel({
  wave,
  items,
  onHover,
  hasCloakedIncoming,
}: {
  wave: number;
  items: ReturnType<typeof summarizeWave>;
  onHover: () => void;
  hasCloakedIncoming: boolean;
}) {
  const hasBoss = items.some((item) => item.boss);
  return (
    <div className="wave-preview-panel" data-testid="wave-preview" onMouseEnter={onHover} onFocus={onHover}>
      <div className="wave-preview-head">
        <span>다음 웨이브 {wave}</span>
        <div className="wave-preview-flags">
          {hasCloakedIncoming && <b className="cloak">은신 웨이브 접근 중</b>}
          {hasBoss && <b className="boss">보스</b>}
        </div>
      </div>
      <div className="wave-preview-list" aria-label={`다음 웨이브 ${wave} 구성`}>
        {items.map((item) => {
          const seen = progress.enemiesSeen.includes(item.id);
          const label = seen ? item.def.name : '미확인 적';
          return (
            <div key={item.id} className={`wave-preview-enemy ${item.cloaked ? 'cloaked' : ''} ${item.boss ? 'boss' : ''}`}
              title={`${label} x${item.count}${item.cloaked ? ' (은신)' : ''}${item.boss ? ' (보스)' : ''}`}>
              <EnemyPortrait def={item.def} unknown={!seen} className="wave-preview-portrait" />
              <span className="wave-preview-count">x{item.count}</span>
              {!seen && <span className="wave-preview-unknown">?</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Shop ----------------

// Memoized: the loop re-renders GameScreen ~8x/s, but the shop only needs to
// repaint when affordability (credits) or the unlock bar (kills) actually move.
// `sig` snapshots those so React.memo can skip otherwise-identical renders (the
// inline callbacks change identity every parent render, so the comparator ignores
// them — they close over stable useState setters, so old closures stay correct).
const Shop = memo(function Shop({ game, placing, setPlacing, veteranDeploy, veteranDeployUnlocked, onVeteranDeployChange, onCollapse }: {
  game: Game;
  placing: TowerDef | null;
  setPlacing: (d: TowerDef | null) => void;
  veteranDeploy: boolean;
  veteranDeployUnlocked: boolean;
  onVeteranDeployChange: (next: boolean) => void;
  onCollapse?: () => void;
  /** render signature: floor(credits)|totalKills — see comparator below */
  sig: string;
}) {
  // lifetime kills (banked at run end) + this run's kills so the bar fills live
  const kills = liveUnlockKills(game);
  const dailyMode = game.isDailyChallenge;
  const yakkobMode = isYakkob(game.dailyChallenge);
  // the next tower the player will unlock, for the BTD-style progress bar
  const next = dailyMode ? undefined : TOWERS_BY_UNLOCK.find((d) => d.unlockAt > kills);
  const prevThreshold = TOWERS_BY_UNLOCK.filter((d) => d.unlockAt <= kills).reduce((m, d) => Math.max(m, d.unlockAt), 0);
  useEffect(() => { game.recorder.recordShopOpen(); }, [game]);
  return (
    <div className="panel panel-grow">
      <div className="panel-head">
        <div className="panel-title">아스날</div>
        {onCollapse && <button className="panel-collapse" title="패널 접기" aria-label="아스날 패널 접기" onClick={onCollapse}>⟩</button>}
      </div>
      {veteranDeployUnlocked && (
        <div className="shop-mode-tabs" role="tablist" aria-label="출격 모드">
          <button type="button" role="tab" className={veteranDeploy ? '' : 'on'} aria-selected={!veteranDeploy}
            onClick={() => onVeteranDeployChange(false)}>스탠다드</button>
          <button type="button" role="tab" className={veteranDeploy ? 'on' : ''} aria-selected={veteranDeploy}
            onClick={() => onVeteranDeployChange(true)}>베테랑</button>
        </div>
      )}
      <div className="shop-grid" data-testid="shop-grid">
        {TOWERS_BY_UNLOCK.map((def, i) => {
          const lockedBy = def.unlockAt - kills;
          const available = towerAvailable(game, def);
          if (!available) {
            const lockText = towerLockText(game, def);
            return (
              <button key={def.id} type="button" className="shop-item shop-locked" data-testid={`tower-${def.id}`} title={lockText} aria-disabled="true" aria-label={lockText}
                onClick={() => { game.recorder.recordTowerShopSelect(def, 'locked'); sfx.error(); }}>
                <div className="shop-lock-icon">🔒</div>
                <div className="shop-name">{def.name}</div>
                <div className="shop-cost">{dailyMode ? '데일리 풀' : `격파 ${lockedBy}`}</div>
              </button>
            );
          }
          const projection = veteranDeploy ? projectedVeteranDeploy(game, def) : null;
          const baseCost = projection?.baseCost ?? game.cost(def);
          const displayCost = projection && projection.upgrades > 0 ? projection.totalCost : baseCost;
          const afford = game.credits >= baseCost;
          return (
            <button
              key={def.id}
              className={`shop-item ${placing?.id === def.id ? 'active' : ''} ${afford ? '' : 'poor'}`}
              data-testid={`tower-${def.id}`}
              style={{ ['--tc' as string]: def.color, ['--tg' as string]: def.glow }}
              onClick={() => { sfx.click(); game.recorder.recordTowerShopSelect(def, afford ? 'selected' : 'unaffordable'); setPlacing(placing?.id === def.id ? null : def); }}
              title={def.desc}
            >
              <TowerIcon def={def} squish={yakkobMode && isYakkobSquishedTower(def.id)} />
              <div className="shop-name">{def.name}</div>
              <div className="shop-foot">
                <span className="shop-cost">⌬{displayCost}</span>
                {projection && projection.upgrades > 0 && (
                  <span className="shop-veteran-tier">A{projection.tierA}/B{projection.tierB}</span>
                )}
                <span className={`shop-type t-${def.base.damageType}`}>{def.base.damageType}</span>
              </div>
              {i < 10 && <div className="shop-key">{(i + 1) % 10}</div>}
            </button>
          );
        })}
      </div>
      {next && (
        <div className="unlock-track" title={`${kills.toLocaleString()} / ${next.unlockAt.toLocaleString()} 격파`}>
          <div className="unlock-bar">
            <div className="unlock-fill" style={{ width: `${Math.min(100, ((kills - prevThreshold) / (next.unlockAt - prevThreshold)) * 100)}%` }} />
          </div>
          <div className="unlock-label">다음: {next.name} · {kills.toLocaleString()} / {next.unlockAt.toLocaleString()} 격파</div>
        </div>
      )}
      {dailyMode && (
        <div className="unlock-track daily-arsenal" title="데일리의 아스날은 이 시드에 고정">
          <div className="unlock-label">데일리 아스날: {game.dailyTowerIds?.size ?? 0}개 고정 무기</div>
        </div>
      )}
      {placing ? (
        <div className="placing-hint">
          <b style={{ color: placing.glow }}>{placing.name}</b>
          <p>{placing.desc}</p>
        </div>
      ) : (
        <p className="hint-dim pad">1–0 으로 처음 10개 선택 · 지도 클릭으로 건설 · Space 는 웨이브 시작</p>
      )}
    </div>
  );
}, (a, b) => a.sig === b.sig && a.placing === b.placing);

// `squish` is THE YAKKOB's signature quirk: the two available towers come back from the
// vault at 0.75× height, full width — they look short. Scaled about the body's center (y=24
// in the 1.25× space) so the icon stays put and just squashes vertically.
function TowerIcon({ def, squish = false }: { def: TowerDef; squish?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.scale(1.25, 1.25);
    if (squish) { ctx.translate(0, 24); ctx.scale(1, 0.75); ctx.translate(0, -24); }
    drawTowerBody(ctx, { x: 24, y: 24 }, def, -Math.PI / 2, 0, 0, 1, 0, 1);
    ctx.restore();
  }, [def, squish]);
  return <canvas ref={ref} width={60} height={60} className={`tower-icon${squish ? ' tower-icon-squished' : ''}`} />;
}

// ---------------- Upgrade panel ----------------

function TrackColumn({ game, tower, track }: { game: Game; tower: Tower; track: 0 | 1 }) {
  const tr = tower.def.tracks[track];
  const tier = game.tierOf(tower, track);
  const state = game.upgradeState(tower, track);
  const next = tier < 6 ? tr.upgrades[tier] : null;
  const cost = game.upgradeCost(tower, track);
  const isBonusNext = tier >= 4;
  // buying a bonus tier with no track committed locks the OTHER track's bonuses forever
  const willCommit = isBonusNext && tower.committed === null;
  const otherTrack = tower.def.tracks[track === 0 ? 1 : 0];
  const [armed, setArmed] = useState(false);
  // never carry an armed confirm across a different tower / tier
  useEffect(() => { setArmed(false); }, [tower.uid, track, tier]);
  const buy = () => {
    // on touch (no hover to read the warning) require a confirming second tap before committing
    const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    if (willCommit && coarse && !armed) { setArmed(true); sfx.click(); return; }
    game.upgradeTower(tower, track);
    setArmed(false);
  };
  return (
    <div className={`track-col ${track === 1 ? 'track-b' : ''}`}>
      <div className="track-name">{tr.name}</div>
      <div className="tier-track">
        {tr.upgrades.map((up, i) => (
          <div key={up.name} className={`tier-pip ${i < tier ? 'owned' : ''} ${i >= 4 ? 'bonus' : ''}`} title={`${up.name} — ${up.desc}`} />
        ))}
      </div>
      {state === 'maxed' && <div className="maxed small-max">★ 최대 ★</div>}
      {state === 'locked' && <div className="track-locked">{tower.def.tracks[tower.committed!].name}에 확정됨</div>}
      {state === 'ok' && next && (
        <button
          className={`upgrade-btn track-btn ${game.credits >= cost ? '' : 'poor'} ${isBonusNext ? 'bonus-up' : ''} ${armed ? 'armed' : ''}`}
          data-testid={`upgrade-${tower.def.id}-${track === 0 ? 'a' : 'b'}`}
          title={willCommit ? '보너스 티어 — 구매 시 이 경로로 확정됩니다!' : next.desc}
          onClick={buy}
        >
          <div className="up-name"><UpgradeIcon k={upgradeIconKey(next.name, next.desc, isBonusNext)} /> {armed ? '한 번 더 탭하여 확정' : next.name}</div>
          <div className="up-desc">{armed ? `다른 경로(${otherTrack.name})의 보너스 티어가 영구히 잠깁니다` : next.desc}</div>
          {willCommit && <div className="commit-flag">⚠ {tr.name.toUpperCase()}(으)로 확정</div>}
          <div className="up-cost">⌬{cost}</div>
        </button>
      )}
    </div>
  );
}

// Memoized like Shop: repaints only when the selected tower's shown state changes
// (tiers/commit/invested/kills/target/buffs) or affordability (credits).
const UpgradePanel = memo(function UpgradePanel({ game, tower, onSold, onCollapse }: {
  game: Game; tower: Tower; onSold: () => void; onCollapse?: () => void; sig: string;
}) {
  const def = tower.def;
  const s = tower.stats;
  const rank = Game.rankOf(tower);
  useEffect(() => { game.recorder.recordUpgradePanelOpen(tower); }, [game, tower]);
  return (
    <div className="panel tower-detail panel-grow" style={{ borderColor: def.color }}>
      <div className="panel-head">
        <button className="back-btn" onClick={() => { onSold(); sfx.click(); }}>← 모든 타워</button>
        {onCollapse && <button className="panel-collapse" title="패널 접기" aria-label="업그레이드 패널 접기" onClick={onCollapse}>⟩</button>}
      </div>
      <div className="panel-title" style={{ color: def.glow }}>
        {def.name}
        {(tower.tierA >= 5 || tower.tierB >= 5) && <span className="rank-stars"> ✦완전체</span>}
        {rank > 0 && (
          <span className="rank-stars" title={`베테랑 등급 ${rank}: 데미지 +${rank * 6}% (격파로 획득)`}>
            {' '}{'★'.repeat(rank)}
          </span>
        )}
      </div>
      <div className="stat-rows">
        <Stat label="데미지" value={s.damage > 0 ? `${s.damage} ${s.damageType}` : '—'} />
        <Stat label="발사 속도" value={s.fireRate > 0 ? `${(s.fireRate * tower.rateBuff).toFixed(2)}/s` : '오라'} />
        <Stat label="사거리" value={s.range > 2000 ? '∞' : Math.round(s.range * tower.rangeBuff).toString()} />
        {s.pierce > 1 && s.pierce < 90 && <Stat label="관통" value={`${s.pierce}`} />}
        {s.splash > 0 && <Stat label="폭발" value={`${Math.round(s.splash)}`} />}
        {s.slowPower > 0 && <Stat label="감속" value={`${Math.round(s.slowPower * 100)}%`} />}
        {s.detection && <Stat label="센서" value="은신 감지" />}
        <Stat label="격파" value={`${tower.kills}`} />
        <Stat label="투자" value={`⌬${tower.invested}`} />
      </div>
      <p className="lore-line">"{def.lore}"</p>

      <div className="track-row">
        <TrackColumn game={game} tower={tower} track={0} />
        <TrackColumn game={game} tower={tower} track={1} />
      </div>
      {tower.committed === null && (tower.tierA >= 4 || tower.tierB >= 4) && (
        <p className="hint-dim">✦ 보너스 티어는 배타적입니다 — 먼저 사는 것이 다른 경로의 보너스를 잠가버립니다.</p>
      )}

      <div className="panel-title small">타겟팅</div>
      <div className="target-row">
        {TARGET_MODES.map((m) => (
          <button key={m} className={`tb-btn ${tower.target === m ? 'on' : ''}`}
            onClick={() => { game.setTargetMode(tower, m); sfx.click(); }}>
            {TARGET_MODE_LABELS[m]}
          </button>
        ))}
      </div>
      <div className="target-filter-row" role="group" aria-label="타겟 필터">
        {TARGET_FILTER_LABELS.map(([filter, label]) => {
          const on = tower.targetFilters.includes(filter);
          return (
            <button
              key={filter}
              type="button"
              className={`filter-chip ${on ? 'on' : ''}`}
              aria-pressed={on}
              title={`${label} 대상 선호`}
              data-testid={`target-filter-${filter}`}
              onClick={() => { game.setTargetFilter(tower, filter, !on); sfx.click(); }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <button className="sell-btn" onClick={() => { game.sellTower(tower); onSold(); }}>
        ⌬{sellValue(tower.invested)}에 판매
      </button>
      <p className="hint-dim pad">Esc 또는 우클릭으로 선택 해제.</p>
    </div>
  );
}, (a, b) => a.tower === b.tower && a.sig === b.sig);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <span className="stat-val">{value}</span>
    </div>
  );
}

// ---------------- Archive ----------------

// INTEL panel (Archive + Threat Codex) temporarily removed from the sidebar.
// The ArchivePanel / Codex components were here — recover from git history when re-adding.
