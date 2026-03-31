import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

export const WorkspaceBrowser: React.FC = () => {
  const { workspaceId } = useParams<'workspaceId'>();
  const hostRef = useRef<HTMLDivElement>(null);
  const [urlInput, setUrlInput] = useState('https://duckduckgo.com/');
  const [error, setError] = useState<string | null>(null);

  const pushBounds = () => {
    const el = hostRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    void window.pjais.browserSetBounds({
      x: Math.round(r.x),
      y: Math.round(r.y),
      width: Math.round(r.width),
      height: Math.round(r.height),
    });
  };

  useLayoutEffect(() => {
    if (!workspaceId) return;
    let ro: ResizeObserver | null = null;
    const run = async () => {
      try {
        await window.pjais.browserShow('https://duckduckgo.com/');
        pushBounds();
        const el = hostRef.current;
        if (el && typeof ResizeObserver !== 'undefined') {
          ro = new ResizeObserver(() => pushBounds());
          ro.observe(el);
        }
      } catch (e) {
        console.error(e);
        setError('Could not attach in-app browser.');
      }
    };
    void run();
    return () => {
      ro?.disconnect();
      void window.pjais.browserHide().catch(() => {});
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    const onResize = () => pushBounds();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [workspaceId]);

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      let u = urlInput.trim();
      if (!u) u = 'https://duckduckgo.com/';
      if (!/^https?:\/\//i.test(u)) {
        u = `https://${u}`;
      }
      await window.pjais.browserLoadURL(u);
      pushBounds();
    } catch (err) {
      console.error(err);
      setError('Invalid or blocked URL.');
    }
  };

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        No workspace selected.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">
          In-app <span className="text-brand-yellow">browser</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          A BrowserView managed by the main process is layered here. The AI overlay can later drive
          navigation via IPC; you keep full manual control.
        </p>
      </header>
      <form onSubmit={go} className="flex flex-wrap gap-2 items-center">
        <label htmlFor="browser-url" className="sr-only">
          URL
        </label>
        <input
          id="browser-url"
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          className="input-base flex-1 min-w-[200px] py-2 text-sm"
          placeholder="https://…"
          autoComplete="url"
        />
        <button type="submit" className="btn-primary px-4 py-2 text-sm">
          Go
        </button>
      </form>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <div
        ref={hostRef}
        className="min-h-[420px] flex-1 rounded-lg border-2 border-dashed border-surface-600 bg-surface-900/50"
        aria-label="Embedded browser viewport"
      />
    </div>
  );
};
