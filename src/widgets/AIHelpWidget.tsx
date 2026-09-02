import { useEffect, useState } from 'react';
import { askAIHelp } from '../game/aiHelp';
import type { AIHelpContext } from '../game/aiContext';
import { appMetrics } from '../game/metrics';
import { sfx } from '../game/sound';
import { WIDGET_OPEN_EVENT } from '../appShared';

// ---------------- AI help (menu-only, rate-limited server side) ----------------

type AIChatMessage = { role: 'assistant' | 'user'; content: string };

export function AIHelpWidget({
  getContext,
  placement = 'menu',
  blocked = false,
  sideOpen = false,
}: {
  getContext: () => AIHelpContext;
  placement?: 'menu' | 'game';
  blocked?: boolean;
  sideOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'busy'>('idle');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [turnsRemaining, setTurnsRemaining] = useState<number | null>(null);
  const [conversationsRemaining, setConversationsRemaining] = useState<number | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([
    { role: 'assistant', content: '타워, 웨이브, 숨겨진 함선, 해금, 조작, 최근 런에 대해 물어보세요.' },
  ]);

  const send = async () => {
    const q = text.trim();
    if (!q || state === 'busy') return;
    setText('');
    setState('busy');
    setMessages((m) => [...m, { role: 'user', content: q }]);
    appMetrics.recordAIQuestion('submit');
    try {
      const res = await askAIHelp(q, conversationId, getContext(), messages);
      setConversationId(res.conversationId);
      setTurnsRemaining(res.turnsRemaining);
      setConversationsRemaining(res.conversationsRemaining);
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
      appMetrics.recordAIQuestion('success');
      sfx.click();
    } catch (error) {
      appMetrics.recordAIQuestion(error instanceof Error && /quota|limit|turns|chats/i.test(error.message) ? 'quota' : 'error');
      setMessages((m) => [...m, {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'AI 연결을 사용할 수 없습니다.',
      }]);
    } finally {
      setState('idle');
    }
  };

  const startNew = () => {
    setConversationId(undefined);
    setTurnsRemaining(null);
    setMessages([{ role: 'assistant', content: '새 연결 준비 완료. 이번 런에서 무엇이 궁금하신가요?' }]);
    sfx.click();
  };
  useEffect(() => {
    if (blocked && open) setOpen(false);
  }, [blocked, open]);
  useEffect(() => {
    document.body.classList.toggle('ai-open', open);
    appMetrics.recordAIWidget(open, placement);
    window.dispatchEvent(new CustomEvent(WIDGET_OPEN_EVENT, { detail: { kind: 'ai', open } }));
    return () => {
      document.body.classList.remove('ai-open');
      window.dispatchEvent(new CustomEvent(WIDGET_OPEN_EVENT, { detail: { kind: 'ai', open: false } }));
    };
  }, [open, placement]);

  return (
    <div
      className={`ai-root ${placement === 'game' ? 'in-game' : 'on-menu'} ${placement === 'game' ? (sideOpen ? 'sidebar-open' : 'sidebar-collapsed') : ''} ${blocked ? 'widget-blocked' : ''}`}
      data-testid="ai-widget"
    >
      {open && (
        <div className="ai-panel">
          <div className="ai-head">
            <span>워든 AI</span>
            <div className="ai-head-actions">
              <button className="ai-new" aria-label="새 워든 AI 채팅 시작" onClick={startNew}>새 채팅</button>
              <button className="ai-x" aria-label="워든 AI 닫기" onClick={() => { setOpen(false); sfx.click(); }}>✕</button>
            </div>
          </div>
          <div className="ai-log">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}`}>{m.content}</div>
            ))}
            {state === 'busy' && <div className="ai-msg assistant">생각 중...</div>}
          </div>
          <form className="ai-form" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <input
              className="ai-input"
              maxLength={900}
              aria-label="게임에 대해 워든 AI에게 묻기"
              placeholder="게임에 대해 묻기..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="ai-send" aria-label="워든 AI에게 질문 보내기" disabled={!text.trim() || state === 'busy'}>보내기</button>
          </form>
          {(turnsRemaining !== null || conversationsRemaining !== null) && (
            <div className="ai-quota">
              {turnsRemaining !== null && <span>{turnsRemaining}회 대화 남음</span>}
              {conversationsRemaining !== null && <span>{conversationsRemaining}개 채팅 남음</span>}
            </div>
          )}
        </div>
      )}
      <button className="ai-toggle" title="워든 AI에게 묻기" aria-label="워든 AI에게 묻기" aria-expanded={open} onClick={() => { setOpen((o) => !o); sfx.click(); }}>
        AI
      </button>
    </div>
  );
}
