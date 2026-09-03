import { useEffect, useState } from 'react';
import { boardId, fetchTopResult, fetchGlobalTopResult, fetchDailyTop, fetchWeeklyTop, fetchGauntletTop, type ScoreEntry, type RankedScoreEntry } from '../game/leaderboard';
import { dailyChallenge, type DailyChallenge } from '../game/dailyChallenge';
import { weeklyChallenge, type WeeklyChallenge, type WeeklyGauntletDoc } from '../game/weeklyChallenge';
import { cachedServerUid } from '../game/anonAuth';
import { progress } from '../game/storage';
import { appMetrics } from '../game/metrics';
import { sfx } from '../game/sound';
import { runUrl } from '../game/paths';
import type { GameMap, DifficultyDef } from '../game/types';
import { isRunId } from '../appShared';

// Shared leaderboard cells — the callsign (name + YOU + freeplay meta tags) and the WATCH
// deep-link render identically in the global and local boards.
function BoardName({ r, mine, fp }: { r: ScoreEntry; mine: boolean; fp: boolean }) {
  return (
    <span className="board-name">
      <span>{r.name}</span>
      {mine && <em className="board-you">나</em>}
      {fp && (r.meta || r.daily || r.checkpoint) && (
        <span className="board-meta-tags">
          {r.checkpoint && <b>체크포인트</b>}
          {r.daily && <b>데일리</b>}
          {r.meta && <em>{r.meta}</em>}
        </span>
      )}
    </span>
  );
}
function WatchCell({ runId }: { runId?: string }) {
  return (
    <span className="board-watch">
      {isRunId(runId) ? <a className="watch-btn" href={runUrl(runId)} title="이 배틀플랜 관전">▶ 관전</a> : null}
    </span>
  );
}

type LeaderboardMode = 'campaign' | 'freeplay' | 'daily' | 'weekly' | 'gauntlet';

export function LeaderboardTab({
  map,
  diff,
  daily = dailyChallenge(),
  weekly = weeklyChallenge(),
  gauntlet = null,
  initialMode = 'campaign',
}: {
  map: GameMap;
  diff: DifficultyDef;
  daily?: DailyChallenge;
  weekly?: WeeklyChallenge;
  gauntlet?: WeeklyGauntletDoc | null;
  initialMode?: LeaderboardMode;
}) {
  const [mode, setMode] = useState<LeaderboardMode>(initialMode);
  const [globalRows, setGlobalRows] = useState<RankedScoreEntry[] | null>(null);
  const [localRows, setLocalRows] = useState<ScoreEntry[] | null>(null);
  const [ritualRows, setRitualRows] = useState<ScoreEntry[] | null>(null);
  const [globalError, setGlobalError] = useState(false);
  const [localError, setLocalError] = useState(false);
  const fp = mode === 'freeplay';
  const board = boardId(map.id, diff.id, fp);
  // Server rows carry the authenticated anonymous uid; the local uid fallback
  // only covers browsers that read boards before anonymous sign-in has warmed.
  const myUid = cachedServerUid() ?? progress.uid;
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);
  useEffect(() => {
    let live = true;
    setGlobalRows(null);
    setLocalRows(null);
    setRitualRows(null);
    setGlobalError(false);
    setLocalError(false);
    if (mode === 'daily' || mode === 'weekly' || mode === 'gauntlet') {
      const load = mode === 'daily'
        ? fetchDailyTop(daily.id, 20)
        : mode === 'weekly'
          ? fetchWeeklyTop(weekly.id, 20)
          : gauntlet ? fetchGauntletTop(gauntlet.week, 20) : Promise.resolve([]);
      load.then((rows) => { if (live) setRitualRows(rows); }).catch(() => {
        if (live) { setRitualRows([]); setGlobalError(true); }
      });
      return () => { live = false; };
    }
    Promise.all([fetchGlobalTopResult(fp, 20), fetchTopResult(board, 5)]).then(([global, local]) => {
      if (!live) return;
      setGlobalRows(global.rows);
      setLocalRows(local.rows);
      setGlobalError(global.error);
      setLocalError(local.error);
    });
    return () => { live = false; };
  }, [board, daily.id, fp, gauntlet, mode, weekly.id]);
  const ritualTitle = mode === 'daily' ? '데일리' : mode === 'weekly' ? '주간 변이' : mode === 'gauntlet' ? '건틀릿' : '';
  const ritualEmpty = mode === 'daily'
    ? '아직 데일리 기록이 없습니다 - 챌린지에 출격하여 첫 기록을 세워보세요.'
    : mode === 'weekly'
      ? '아직 주간 변이 기록이 없습니다 - 출격하여 기록을 세워보세요.'
      : gauntlet
        ? '아직 건틀릿 도전 기록이 없습니다 - 첫 도전자가 되어보세요.'
        : '아직 주간 챔피언 건틀릿 우승자가 없습니다.';
  return (
    <div className="board-tab">
      <div className="board-head">
        <div className="board-title">글로벌 리더보드 <span>{ritualTitle || (fp ? '프리플레이' : '캠페인')}</span></div>
        <div className="board-modes">
          <button className={mode === 'campaign' ? 'on' : ''} onClick={() => { appMetrics.recordLeaderboardMode(false); setMode('campaign'); sfx.click(); }}>캠페인</button>
          <button className={mode === 'freeplay' ? 'on' : ''} onClick={() => { appMetrics.recordLeaderboardMode(true); setMode('freeplay'); sfx.click(); }}>프리플레이</button>
          <button className={mode === 'daily' ? 'on' : ''} onClick={() => { setMode('daily'); sfx.click(); }}>데일리</button>
          <button className={mode === 'weekly' ? 'on' : ''} onClick={() => { setMode('weekly'); sfx.click(); }}>위클리</button>
          <button className={mode === 'gauntlet' ? 'on' : ''} onClick={() => { setMode('gauntlet'); sfx.click(); }}>건틀릿</button>
        </div>
      </div>
      {(mode === 'daily' || mode === 'weekly' || mode === 'gauntlet') ? (
        <div className="board-list board-global fp daily-board-mode" data-testid="daily-leaderboard-mode">
          <div className="board-row board-row-head">
            <span className="board-rank">#</span>
            <span className="board-name">콜사인</span>
            <span className="board-wave">웨이브</span>
            <span className="board-kills">함선</span>
            <span className="board-cash">크레딧</span>
            <span className="board-watch">리플레이</span>
          </div>
          {ritualRows === null ? (
            <div className="board-empty">{ritualTitle} 보드 확인 중...</div>
          ) : globalError ? (
            <div className="board-empty">{ritualTitle} 리더보드 연결 실패 - 잠시 후 다시 시도하세요.</div>
          ) : ritualRows.length === 0 ? (
            <div className="board-empty">{ritualEmpty}</div>
          ) : ritualRows.map((r, i) => (
            <div key={`${r.runId || r.name}-${i}`} className={`board-row ${r.uid === myUid ? 'me' : ''}`}>
              <span className="board-rank">{i + 1}</span>
              <BoardName r={r} mine={r.uid === myUid} fp />
              <span className="board-wave">{r.wave}</span>
              <span className="board-kills">{r.kills.toLocaleString()}</span>
              <span className="board-cash">{`\u232c${r.cash.toLocaleString()}`}</span>
              <WatchCell runId={r.runId} />
            </div>
          ))}
        </div>
      ) : (
        <>
      <div className={`board-list board-global ${fp ? 'fp' : ''}`}>
        <div className="board-row board-row-head">
          <span className="board-rank">#</span>
          <span className="board-name">콜사인</span>
          <span className="board-context">섹터</span>
          <span className="board-context">프로토콜</span>
          {fp && <span className="board-wave">웨이브</span>}
          <span className="board-kills">함선</span>
          <span className="board-cash">크레딧</span>
          <span className="board-watch">리플레이</span>
        </div>
        {globalRows === null ? (
          <div className="board-empty">연결 중...</div>
        ) : globalError ? (
          <div className="board-empty">리더보드 연결 실패 - 네트워크 상태를 확인하고 다시 시도하세요.</div>
        ) : globalRows.length === 0 ? (
          <div className="board-empty">아직 글로벌 기록이 없습니다 - 출격하여 정상에 올라보세요.</div>
        ) : (
          globalRows.map((r, i) => (
            <div key={`${r.board}-${i}`} className={`board-row ${r.uid === myUid ? 'me' : ''}`}>
              <span className="board-rank">{i + 1}</span>
              <BoardName r={r} mine={r.uid === myUid} fp={fp} />
              <span className="board-context">{r.mapName}</span>
              <span className="board-context">{r.diffName}</span>
              {fp && <span className="board-wave">{r.wave}</span>}
              <span className="board-kills">{r.kills.toLocaleString()}</span>
              <span className="board-cash">{`\u232c${r.cash.toLocaleString()}`}</span>
              <WatchCell runId={r.runId} />
            </div>
          ))
        )}
      </div>
      <div className="board-local-head">
        <span>{map.name}</span>
        <b>{diff.name}</b>
      </div>
      <div className={`board-list board-local ${fp ? 'fp' : ''}`}>
        <div className="board-row board-row-head">
          <span className="board-rank">#</span>
          <span className="board-name">콜사인</span>
          {fp && <span className="board-wave">웨이브</span>}
          <span className="board-cash">크레딧</span>
          <span className="board-watch">리플레이</span>
        </div>
        {localRows === null ? (
          <div className="board-empty compact">로컬 보드 확인 중...</div>
        ) : localError ? (
          <div className="board-empty compact">이 섹터 보드를 불러오지 못했습니다. 잠시 후 다시 시도하세요.</div>
        ) : localRows.length === 0 ? (
          <div className="board-empty compact">이 섹터/프로토콜 기록이 아직 없습니다.</div>
        ) : (
          localRows.map((r, i) => (
            <div key={i} className={`board-row ${r.uid === myUid ? 'me' : ''}`}>
              <span className="board-rank">{i + 1}</span>
              <BoardName r={r} mine={r.uid === myUid} fp={fp} />
              {fp && <span className="board-wave">{r.wave}</span>}
              <span className="board-cash">{`\u232c${r.cash.toLocaleString()}`}</span>
              <WatchCell runId={r.runId} />
            </div>
          ))
        )}
      </div>
      <div className="board-foot">{fp ? '글로벌 프리플레이는 도달 웨이브 순위' : '글로벌 캠페인은 획득 크레딧 순위'} - 로컬 보드는 출격 섹터 선택을 따릅니다</div>
        </>
      )}
    </div>
  );
}
