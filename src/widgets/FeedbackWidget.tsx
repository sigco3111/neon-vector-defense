import { useCallback, useEffect, useState } from 'react';
import {
  submitFeedback,
  fetchFeedbackReplies,
  type FeedbackReply,
  type FeedbackReceipt,
} from '../game/leaderboard';
import { canSubmitScore } from '../game/consent';
import { appMetrics } from '../game/metrics';
import { sfx } from '../game/sound';
import { PERF_MAP, WIDGET_OPEN_EVENT } from '../appShared';

// ---------------- Feedback (always available, anonymous) ----------------

const FEEDBACK_RECEIPTS_KEY = 'nvd-feedback-receipts-v2';
const FEEDBACK_READ_KEY = 'nvd-feedback-read-v1';
const FEEDBACK_DISMISSED_KEY = 'nvd-feedback-dismissed-v1';

function loadFeedbackReceipts(): FeedbackReceipt[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_RECEIPTS_KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((row): row is FeedbackReceipt => !!row
        && typeof row === 'object'
        && typeof row.id === 'string'
        && typeof row.token === 'string')
      .slice(-20);
  } catch {
    return [];
  }
}

function saveFeedbackReceipt(receipt: FeedbackReceipt) {
  const receipts = [...loadFeedbackReceipts().filter((x) => x.id !== receipt.id), receipt].slice(-20);
  try { localStorage.setItem(FEEDBACK_RECEIPTS_KEY, JSON.stringify(receipts)); } catch { /* non-fatal */ }
}

function feedbackReadAt(): number {
  try { return Number(localStorage.getItem(FEEDBACK_READ_KEY) ?? 0); } catch { return 0; }
}

function markFeedbackRead(ts: number) {
  try { localStorage.setItem(FEEDBACK_READ_KEY, String(ts)); } catch { /* non-fatal */ }
}

function loadDismissedReplyIds(): string[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_DISMISSED_KEY);
    return raw ? JSON.parse(raw).filter((id: unknown) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function saveDismissedReplyIds(ids: string[]) {
  try { localStorage.setItem(FEEDBACK_DISMISSED_KEY, JSON.stringify([...new Set(ids)].slice(-50))); } catch { /* non-fatal */ }
}

export function FeedbackWidget({ ctx, blocked = false, sideOpen = false }: { ctx: string; blocked?: boolean; sideOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'inbox' | 'send'>('send');
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  const [replies, setReplies] = useState<FeedbackReply[]>([]);
  const [readAt, setReadAt] = useState(() => feedbackReadAt());
  const [dismissedReplies, setDismissedReplies] = useState<string[]>(() => loadDismissedReplyIds());
  const [checkingReplies, setCheckingReplies] = useState(false);
  const MAX = 1000;
  const refreshReplies = useCallback(async () => {
    setCheckingReplies(true);
    const rows = await fetchFeedbackReplies(loadFeedbackReceipts());
    rows.sort((a, b) => b.replyTs - a.replyTs);
    setReplies(rows);
    setCheckingReplies(false);
  }, []);
  useEffect(() => {
    if (PERF_MAP !== null) return;
    const intervalMs = open ? 15000 : 60000;
    if (open || !document.body.classList.contains('game-active')) void refreshReplies();
    const id = window.setInterval(() => {
      if (document.hidden) return;
      if (!open && document.body.classList.contains('game-active')) return;
      void refreshReplies();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [open, refreshReplies]);
  useEffect(() => {
    if (!open || replies.length === 0) return;
    const newest = Math.max(...replies.map((r) => r.replyTs));
    if (newest > readAt) {
      appMetrics.recordFeedbackReplyViewed(replies.filter((r) => r.replyTs > readAt).length);
      markFeedbackRead(newest);
      setReadAt(newest);
    }
  }, [open, readAt, replies]);
  useEffect(() => {
    if (blocked && open) setOpen(false);
  }, [blocked, open]);
  useEffect(() => {
    document.body.classList.toggle('fb-open', open);
    appMetrics.recordFeedbackWidget(open, ctx);
    window.dispatchEvent(new CustomEvent(WIDGET_OPEN_EVENT, { detail: { kind: 'feedback', open } }));
    return () => {
      document.body.classList.remove('fb-open');
      window.dispatchEvent(new CustomEvent(WIDGET_OPEN_EVENT, { detail: { kind: 'feedback', open: false } }));
    };
  }, [ctx, open]);
  if (PERF_MAP !== null) return null; // not during perf runs
  const canSendFeedback = canSubmitScore();
  const send = async () => {
    const t = text.trim();
    if (!t || !canSendFeedback) return;
    setState('busy');
    const receipt = await submitFeedback(t, ctx);
    if (!receipt) {
      appMetrics.recordFeedbackSubmit(false);
      setState('err');
      sfx.error();
      return;
    }
    appMetrics.recordFeedbackSubmit(true);
    saveFeedbackReceipt({ ...receipt, text: t, ctx, ts: Date.now() });
    setState('done');
    setText('');
    void refreshReplies();
    setTab('inbox');
    setTimeout(() => setState('idle'), 2200);
  };
  const visibleReplies = replies.filter((r) => !dismissedReplies.includes(r.id));
  const unread = visibleReplies.filter((r) => r.replyTs > readAt).length;
  const dismissedCount = replies.length - visibleReplies.length;
  const sentCount = loadFeedbackReceipts().length;
  const dismissReply = (id: string) => {
    const next = [...dismissedReplies, id];
    setDismissedReplies(next);
    saveDismissedReplyIds(next);
    sfx.click();
  };
  const restoreReplies = () => {
    setDismissedReplies([]);
    saveDismissedReplyIds([]);
    sfx.click();
  };
  return (
    <div
      className={`fb-root ${ctx === 'menu' ? 'on-menu' : 'on-game'} ${ctx === 'game' ? (sideOpen ? 'sidebar-open' : 'sidebar-collapsed') : ''} ${blocked ? 'widget-blocked' : ''}`}
      data-testid="message-widget"
    >
      {open && (
        <div className="fb-panel">
          <div className="fb-head">
            <span>메시지</span>
            <button className="fb-x" aria-label="메시지 닫기" onClick={() => { setOpen(false); sfx.click(); }}>✕</button>
          </div>
          <div className="fb-tabs">
            <button className={tab === 'inbox' ? 'on' : ''} onClick={() => { setTab('inbox'); sfx.click(); }}>
              받은 메시지{unread > 0 ? ` ${unread}` : ''}
            </button>
            <button className={tab === 'send' ? 'on' : ''} onClick={() => { setTab('send'); sfx.click(); }}>보내기</button>
          </div>
          {tab === 'inbox' && <div className="fb-replies">
            <div className="fb-section-row">
              <div className="fb-section-title">관리자 답장</div>
              <button className="fb-check" aria-label="관리자 답장 확인" disabled={checkingReplies} onClick={() => { void refreshReplies(); sfx.click(); }}>
                {checkingReplies ? '확인 중' : '확인'}
              </button>
            </div>
            {visibleReplies.length > 0 ? (
              visibleReplies.slice(0, 4).map((r) => (
                <div key={r.id} className="fb-reply">
                  <div className="fb-reply-meta">
                    <span>{new Date(r.replyTs).toLocaleString()} / {r.ctx}</span>
                    <button className="fb-dismiss" title="답장 닫기" aria-label="관리자 답장 닫기" onClick={() => dismissReply(r.id)}>닫기</button>
                  </div>
                  <div className="fb-reply-body">{r.reply}</div>
                  {r.text && <div className="fb-reply-quote">나: {r.text}</div>}
                </div>
              ))
            ) : (
              <div className="fb-no-replies">
                {dismissedCount > 0
                  ? '이 브라우저의 모든 관리자 답장이 닫혔습니다.'
                  : sentCount === 0
                    ? '이 브라우저에서 보낸 메시지가 아직 없습니다.'
                    : '아직 관리자 답장이 없습니다. 답장이 도착하면 여기에 표시되며 메시지 아이콘이 켜집니다.'}
              </div>
            )}
            {dismissedCount > 0 && (
              <button className="fb-restore" onClick={restoreReplies}>닫은 답장 복원 ({dismissedCount})</button>
            )}
          </div>}
          {tab === 'send' && !canSendFeedback ? (
            <div className="fb-no-replies">
              안전 모드가 켜져 있어 자유 메시지는 비활성화되며 이 기기 밖으로 전송되지 않습니다.
            </div>
          ) : tab === 'send' && (state === 'done' ? (
            <div className="fb-thanks">전송 완료. 관리자 답장은 받은 메시지함에 표시됩니다.</div>
          ) : (
            <div className="fb-compose">
              <textarea className="fb-text" maxLength={MAX} value={text} autoFocus
                aria-label="개발자에게 보내는 메시지"
                placeholder="버그, 아이디어, 무엇이든 — 개발자에게 직접 전달됩니다."
                onChange={(e) => { setText(e.target.value); if (state === 'err') setState('idle'); }} />
              <div className={`fb-error ${state === 'err' ? '' : 'empty'}`} aria-hidden={state !== 'err'}>
                {state === 'err' ? '전송 실패. 작성 내용은 유지되어 있습니다. 다시 시도해 주세요.' : '피드백 상태 대기 중.'}
              </div>
              <div className="fb-foot">
                <span className="fb-count">{text.length}/{MAX}</span>
                <button className="fb-send no-shift-action" aria-label="개발자에게 메시지 보내기" disabled={!text.trim() || state === 'busy'} onClick={send}>
                  {state === 'busy' ? '…' : state === 'err' ? '재시도' : '보내기 ▸'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button className={`fb-toggle ${unread ? 'has-reply' : ''}`} title={unread ? `${unread}개의 관리자 답장` : '메시지'} aria-label={unread ? `${unread}개의 관리자 답장` : '메시지'} aria-expanded={open} onClick={() => { setOpen((o) => { const next = !o; if (next && unread > 0) setTab('inbox'); return next; }); sfx.click(); }}>
        {open ? '✕' : '✉'}
      </button>
    </div>
  );
}
