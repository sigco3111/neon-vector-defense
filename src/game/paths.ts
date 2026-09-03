// Base-aware URL helpers — GitHub Pages 데모는 /neon-vector-defense/ 서브패스에서
// 서빙되므로, 코드에 하드코딩된 루트 절대경로("/art/...", "/sw.js" 등)는 404가 된다.
// public 에셋·링크는 반드시 이 헬퍼를 거쳐 import.meta.env.BASE_URL 기준으로 해결한다.
// (데이터에 저장된 원시 경로 "/art/x" 형태는 그대로 두고, 사용하는 시점에 감싼다.)

export function baseUrl(): string {
  // import.meta.env는 Vite 빌드에서만 존재 — node/tsx 테스트에서는 undefined일 수 있음
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const b = env?.BASE_URL ?? '/';
  return b.endsWith('/') ? b : `${b}/`;
}

/** "/art/x.webp" 같은 루트 상대 public 경로를 배포 base 하위로 해결한다. */
export function asset(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl()}${p}`;
}

/** "?run=" 리플레이 딥링크 — 서브패스에서도 동작하도록 base를 붙인다. */
export function runUrl(runId: string): string {
  return `${baseUrl()}?run=${encodeURIComponent(runId)}`;
}

export function homeUrl(): string {
  return baseUrl();
}

/** base를 벗겨낸 현재 pathname ("/neon-vector-defense/admin" → "/admin"). */
export function pathnameUnderBase(): string {
  if (typeof location === 'undefined') return '/';
  const base = baseUrl();
  let p = location.pathname;
  if (base !== '/' && base.length > 1) {
    const prefix = base.slice(0, -1);
    if (p === prefix) p = '/';
    else if (p.startsWith(`${prefix}/`)) p = p.slice(prefix.length) || '/';
  }
  return p.replace(/\/+$/, '') || '/';
}
