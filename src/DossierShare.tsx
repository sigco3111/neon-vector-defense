import { useEffect, useMemo, useState } from 'react';
import { renderDossierCanvas, dossierBlob, dossierShareUrl, type DossierInput } from './game/dossier';
import { sfx } from './game/sound';
import { IS_PORTAL_BUILD } from './game/portal';


// Share row for a Mission Dossier. The PNG is the real shareable artifact (works with no
// server); the ?run= link is offered only when the run was actually uploaded (runId present).
// Every action is feature-detected and try/caught — it must never throw inside an overlay.
export default function DossierShare({ input, runId, compact }: { input: DossierInput; runId?: string; compact?: boolean }) {
  const shareInput = useMemo(() => IS_PORTAL_BUILD ? { ...input, runId: '' } : input, [input]);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Pre-render the preview image (full mode only; compact builds on first action).
  useEffect(() => {
    if (compact) return;
    let live = true;
    (async () => {
      try {
        const cv = await renderDossierCanvas(shareInput);
        if (!live) return;
        setPreview(cv.toDataURL('image/png'));
        cv.toBlob((b) => { if (live) setBlob(b); }, 'image/png');
      } catch (e) {
        console.warn('dossier render failed', e);
        if (live) setToast({ kind: 'err', text: '도시에 미리보기 불가.' });
      }
    })();
    return () => { live = false; };
  }, [shareInput, compact]);

  const flash = (text: string, kind: 'ok' | 'err' | 'info' = 'ok') => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 2200);
  };
  const fileName = `nvd-dossier-${shareInput.mapId}-w${shareInput.wave}.png`;
  const url = !IS_PORTAL_BUILD && runId ? dossierShareUrl(runId) : null;
  const getBlob = async () => blob ?? (await dossierBlob(shareInput));
  const hasShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const onShare = async () => {
    sfx.click();
    setBusy(true);
    try {
      const b = await getBlob(); if (!b) return flash('Render failed', 'err');
      const file = new File([b], fileName, { type: 'image/png' });
      const text = `웨이브 ${input.wave} · ${input.kills.toLocaleString()}척 격파 (${input.mapName})`;
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      const canFiles = typeof nav.canShare === 'function' && nav.canShare({ files: [file] });
      if (canFiles) {
        await navigator.share({ title: '랜턴 7호', text, files: [file], ...(url ? { url } : {}) });
      } else if (typeof nav.share === 'function') {
        await navigator.share({ title: '랜턴 7호', text, ...(url ? { url } : {}) });
      } else { return await onCopyCard(); }
      flash('공유 창 열림');
    } catch { flash('공유 취소 또는 사용 불가', 'info'); }
    finally { setBusy(false); }
  };
  const onCopyCard = async () => {
    sfx.click();
    setBusy(true);
    try {
      const b = await getBlob(); if (!b) return flash('렌더링 실패', 'err');
      const Item = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
      if (!Item || !navigator.clipboard?.write) {
        flash('클립보드 사용 불가, 대신 저장', 'info');
        return onDownload();
      }
      await navigator.clipboard.write([new Item({ 'image/png': b })]);
      flash('카드 복사됨');
    } catch {
      flash('클립보드 사용 불가, 대신 저장', 'info');
      await onDownload();
    } finally { setBusy(false); }
  };
  const onCopyLink = async () => {
    sfx.click();
    if (!url) return flash('리플레이 링크 사용 불가', 'err');
    setBusy(true);
    try { await navigator.clipboard.writeText(url); flash('링크 복사됨'); }
    catch { flash('복사 실패', 'err'); }
    finally { setBusy(false); }
  };
  const onDownload = async () => {
    sfx.click();
    setBusy(true);
    try {
      const b = await getBlob(); if (!b) return flash('렌더링 실패', 'err');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = fileName;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      flash('저장됨');
    } catch { flash('저장 실패', 'err'); }
    finally { setBusy(false); }
  };

  return (
    <div className={`dossier-share ${compact ? 'compact' : ''}`} aria-busy={busy}>
      {!compact && (preview
        ? <img className="dossier-preview" src={preview} alt="미션 도시에 카드" />
        : <div className="dossier-preview placeholder" role="status">도시에 렌더링 중…</div>)}
      <div className="dossier-actions">
        {hasShare && <button className="start-btn small no-shift-action" disabled={busy} onClick={onShare} aria-label="도시에 공유" title="도시에 공유">⤴ 공유</button>}
        <button className="start-btn small ghost no-shift-action" disabled={busy} onClick={onCopyCard} aria-label="도시에 카드 이미지 복사" title="카드 이미지 복사">⧉ 카드 복사</button>
        {url && <button className="start-btn small ghost no-shift-action" disabled={busy} onClick={onCopyLink} aria-label="리플레이 링크 복사" title="리플레이 링크 복사">🔗 링크 복사</button>}
        <button className="start-btn small ghost no-shift-action" disabled={busy} onClick={onDownload} aria-label="도시에 PNG 저장" title="PNG 저장">⭳ 저장</button>
        {toast && <span className={`dossier-toast ${toast.kind}`} role={toast.kind === 'err' ? 'alert' : 'status'} aria-live="polite">{toast.text}</span>}
      </div>
    </div>
  );
}
