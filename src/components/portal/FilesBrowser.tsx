'use client';

import { useState, useCallback, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface PortalFile {
  name: string;
  path: string;
  size?: number;
  fileType?: string;
  isImage?: boolean;
  thumbnailUrl?: string | null;
}

export interface PortalFolder {
  name: string;
  path: string;
}

interface FolderData {
  files: PortalFile[];
  folders: PortalFolder[];
}

interface Crumb {
  name: string;
  path: string;
}

interface FilesBrowserProps {
  rootPath: string;
  rootLabel: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fetchFolder(path: string): Promise<FolderData> {
  const res = await fetch(`/api/dropbox/folders?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error('Failed to load folder');
  return res.json();
}

async function fetchAllFilesInFolder(path: string): Promise<PortalFile[]> {
  const data = await fetchFolder(path);
  const files = [...data.files];
  for (const sub of data.folders) {
    const nested = await fetchAllFilesInFolder(sub.path);
    files.push(...nested);
  }
  return files;
}

function triggerUrlDownload(url: string, filename?: string) {
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.setAttribute('download', filename);
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function triggerDownload(file: PortalFile) {
  const url = `/api/dropbox/download?path=${encodeURIComponent(file.path)}`;
  triggerUrlDownload(url, file.name);
  await new Promise(r => setTimeout(r, 800));
}

// ── Icons ──────────────────────────────────────────────────────────────────────
function FileIcon({ fileType, className = '' }: { fileType?: string; className?: string }) {
  if (fileType === 'pdf')
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    );
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function FolderIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function DownloadIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function SpinnerIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M12 2a10 10 0 1 0 10 10" />
    </svg>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <span
      onClick={e => { e.stopPropagation(); onChange(); }}
      className={`w-4 h-4 shrink-0 border flex items-center justify-center transition-colors cursor-pointer ${
        checked ? 'border-[#B8956A] bg-[#B8956A]' : 'border-[#3A3530] hover:border-[#B8956A]/50'
      }`}
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-[#060606]" viewBox="0 0 10 8" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 4l3 3 5-6" />
        </svg>
      )}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function FilesBrowser({ rootPath, rootLabel }: FilesBrowserProps) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ name: rootLabel, path: rootPath }]);
  const [data, setData] = useState<FolderData>({ files: [], folders: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');

  // Load root folder on mount
  useEffect(() => {
    fetchFolder(rootPath)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [rootPath]);

  const currentPath = crumbs[crumbs.length - 1].path;

  const navigateTo = useCallback(async (folder: PortalFolder) => {
    setLoading(true);
    setSelected(new Set());
    try {
      const result = await fetchFolder(folder.path);
      setCrumbs(prev => [...prev, { name: folder.name, path: folder.path }]);
      setData(result);
    } catch { /* stay */ } finally {
      setLoading(false);
    }
  }, []);

  const navigateToCrumb = useCallback(async (idx: number) => {
    if (idx === crumbs.length - 1) return;
    const crumb = crumbs[idx];
    setLoading(true);
    setSelected(new Set());
    try {
      const result = await fetchFolder(crumb.path);
      setCrumbs(prev => prev.slice(0, idx + 1));
      setData(result);
    } catch { /**/ } finally {
      setLoading(false);
    }
  }, [crumbs]);

  useEffect(() => { setSelected(new Set()); }, [currentPath]);

  const allItems = [...data.folders.map(f => f.path), ...data.files.map(f => f.path)];
  const allSelected = allItems.length > 0 && selected.size === allItems.length;

  const toggle = useCallback((path: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(allItems));
  }, [allSelected, allItems]);

  const executeDownload = useCallback(async (paths: Set<string>, currentData: FolderData) => {
    setDownloading(true);
    setDownloadStatus('Preparing...');
    const filesToDownload: PortalFile[] = [];
    for (const path of paths) {
      const file = currentData.files.find(f => f.path === path);
      if (file) { filesToDownload.push(file); continue; }
      const folder = currentData.folders.find(f => f.path === path);
      if (folder) {
        setDownloadStatus(`Getting files from ${folder.name}…`);
        const nested = await fetchAllFilesInFolder(folder.path);
        filesToDownload.push(...nested);
      }
    }
    const count = filesToDownload.length;
    setDownloadStatus(`Downloading ${count} file${count === 1 ? '' : 's'}…`);
    for (let i = 0; i < filesToDownload.length; i++) {
      await triggerDownload(filesToDownload[i]);
      if (i < filesToDownload.length - 1) await new Promise(r => setTimeout(r, 500));
    }
    setDownloading(false);
    setDownloadStatus('');
    setSelected(new Set());
  }, []);

  const handleFolderDownload = useCallback(async (folder: PortalFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    setDownloadStatus(`Preparing ${folder.name}.zip…`);
    try {
      const res = await fetch(`/api/dropbox/download-url?path=${encodeURIComponent(folder.path)}`);
      if (res.ok) {
        const { url } = await res.json();
        setDownloadStatus(`Downloading ${folder.name}.zip…`);
        triggerUrlDownload(url, `${folder.name}.zip`);
        setTimeout(() => { setDownloading(false); setDownloadStatus(''); }, 3000);
        return;
      }
    } catch { /* fall through */ }
    const filesToDownload = await fetchAllFilesInFolder(folder.path);
    const count = filesToDownload.length;
    setDownloadStatus(`Downloading ${count} file${count === 1 ? '' : 's'}…`);
    for (let i = 0; i < filesToDownload.length; i++) {
      await triggerDownload(filesToDownload[i]);
      if (i < filesToDownload.length - 1) await new Promise(r => setTimeout(r, 500));
    }
    setDownloading(false);
    setDownloadStatus('');
  }, [downloading]);

  const handleDownloadAll = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    const folderName = crumbs[crumbs.length - 1].name;
    const folderPath = crumbs[crumbs.length - 1].path;
    setDownloadStatus(`Preparing ${folderName}.zip…`);
    try {
      const res = await fetch(`/api/dropbox/download-url?path=${encodeURIComponent(folderPath)}`);
      if (res.ok) {
        const { url } = await res.json();
        setDownloadStatus(`Downloading ${folderName}.zip…`);
        triggerUrlDownload(url, `${folderName}.zip`);
        setTimeout(() => { setDownloading(false); setDownloadStatus(''); }, 3000);
        return;
      }
    } catch { /* fall through */ }
    await executeDownload(new Set(allItems), data);
  }, [allItems, crumbs, data, downloading, executeDownload]);

  const handleDownload = useCallback(async () => {
    if (downloading) return;
    const folders = [...selected].map(p => data.folders.find(f => f.path === p)).filter(Boolean) as PortalFolder[];
    if (folders.length > 0 && folders.length === selected.size) {
      for (const folder of folders) {
        await handleFolderDownload(folder, { stopPropagation: () => {} } as React.MouseEvent);
        if (folders.length > 1) await new Promise(r => setTimeout(r, 1000));
      }
      setSelected(new Set());
      return;
    }
    await executeDownload(selected, data);
  }, [selected, data, downloading, executeDownload, handleFolderDownload]);

  const hasItems = data.files.length > 0 || data.folders.length > 0;

  return (
    <div className="space-y-8">

      {/* Breadcrumbs */}
      {crumbs.length > 1 && (
        <nav className="flex items-center gap-2 text-[11px] tracking-widest uppercase">
          {crumbs.map((crumb, idx) => (
            <span key={crumb.path} className="flex items-center gap-2">
              {idx > 0 && <span className="text-[#3A3530]">/</span>}
              {idx < crumbs.length - 1 ? (
                <button
                  onClick={() => navigateToCrumb(idx)}
                  className="text-[#6B6560] hover:text-[#B8956A] transition-colors"
                >
                  {crumb.name}
                </button>
              ) : (
                <span className="text-[#E8E4DF]/60">{crumb.name}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Toolbar */}
      {hasItems && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox checked={allSelected} onChange={toggleAll} />
              <span className="text-[11px] tracking-[0.15em] uppercase text-[#6B6560] group-hover:text-[#E8E4DF]/50 transition-colors select-none">
                {allSelected ? 'Deselect all' : 'Select all'}
              </span>
            </label>
            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase text-[#6B6560] hover:text-[#B8956A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <DownloadIcon className="w-3 h-3" />
              Download all
            </button>
          </div>
          <div className="flex items-center gap-1 border border-[#2A2520] p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 transition-colors ${view === 'grid' ? 'bg-[#B8956A]/10 text-[#B8956A]' : 'text-[#6B6560] hover:text-[#E8E4DF]/50'}`}
              title="Grid view"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                <rect x="1" y="1" width="6" height="6" rx="0.5" />
                <rect x="9" y="1" width="6" height="6" rx="0.5" />
                <rect x="1" y="9" width="6" height="6" rx="0.5" />
                <rect x="9" y="9" width="6" height="6" rx="0.5" />
              </svg>
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 transition-colors ${view === 'list' ? 'bg-[#B8956A]/10 text-[#B8956A]' : 'text-[#6B6560] hover:text-[#E8E4DF]/50'}`}
              title="List view"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                <line x1="5" y1="4" x2="15" y2="4" />
                <line x1="5" y1="8" x2="15" y2="8" />
                <line x1="5" y1="12" x2="15" y2="12" />
                <circle cx="2" cy="4" r="1" fill="currentColor" stroke="none" />
                <circle cx="2" cy="8" r="1" fill="currentColor" stroke="none" />
                <circle cx="2" cy="12" r="1" fill="currentColor" stroke="none" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-sm text-[#6B6560] py-12">
          <SpinnerIcon className="w-4 h-4 animate-spin" />
          Loading files…
        </div>
      )}

      {/* Empty */}
      {!loading && !hasItems && (
        <div className="py-16 text-center">
          <p className="text-[#6B6560] text-sm">No files available yet.</p>
        </div>
      )}

      {/* Grid view */}
      {!loading && hasItems && view === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.folders.map(folder => {
            const isSelected = selected.has(folder.path);
            return (
              <div
                key={folder.path}
                className={`group relative border transition-all ${
                  isSelected ? 'border-[#B8956A]/60 bg-[#B8956A]/5' : 'border-[#2A2520] hover:border-[#B8956A]/30'
                }`}
              >
                <div
                  className="aspect-square w-full flex flex-col items-center justify-center gap-3 cursor-pointer bg-[#E8E4DF]/[0.02] hover:bg-[#E8E4DF]/[0.04] transition-colors relative"
                  onClick={() => navigateTo(folder)}
                >
                  <FolderIcon className="w-12 h-12 text-[#B8956A]/40 group-hover:text-[#B8956A]/60 transition-colors" />
                  <span className="text-[9px] tracking-[0.15em] uppercase text-[#6B6560]/60 group-hover:text-[#6B6560] transition-colors select-none">
                    Browse
                  </span>
                  <button
                    onClick={e => handleFolderDownload(folder, e)}
                    disabled={downloading}
                    title={`Download ${folder.name}`}
                    className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-[#B8956A]/90 hover:bg-[#B8956A] text-[#060606] opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0 text-[9px] tracking-widest uppercase font-medium"
                  >
                    <DownloadIcon className="w-2.5 h-2.5" />
                    Download
                  </button>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2.5 border-t border-[#2A2520]">
                  <Checkbox checked={isSelected} onChange={() => toggle(folder.path)} />
                  <button
                    onClick={() => navigateTo(folder)}
                    className="text-[11px] text-[#E8E4DF]/70 truncate tracking-wide hover:text-[#E8E4DF] transition-colors text-left flex-1"
                  >
                    {folder.name}
                  </button>
                </div>
              </div>
            );
          })}

          {data.files.map(file => {
            const isSelected = selected.has(file.path);
            return (
              <div
                key={file.path}
                onClick={() => toggle(file.path)}
                className={`group relative cursor-pointer border transition-all ${
                  isSelected ? 'border-[#B8956A]/60 bg-[#B8956A]/5' : 'border-[#2A2520] hover:border-[#B8956A]/30'
                }`}
              >
                <div className="aspect-square w-full overflow-hidden bg-[#E8E4DF]/[0.03] flex items-center justify-center relative">
                  {file.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover" />
                  ) : (
                    <FileIcon fileType={file.fileType} className="w-10 h-10 text-[#E8E4DF]/20" />
                  )}
                  <div className={`absolute inset-0 transition-opacity ${isSelected ? 'bg-[#B8956A]/10' : 'opacity-0 group-hover:opacity-100 bg-black/10'}`} />
                  <div className={`absolute top-2 right-2 w-5 h-5 border flex items-center justify-center transition-all ${
                    isSelected ? 'border-[#B8956A] bg-[#B8956A] opacity-100' : 'border-white/60 bg-black/30 opacity-0 group-hover:opacity-100'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-[#060606]" viewBox="0 0 10 8" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 4l3 3 5-6" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[11px] text-[#E8E4DF]/70 truncate tracking-wide leading-snug group-hover:text-[#E8E4DF] transition-colors">
                    {file.name}
                  </p>
                  {file.size && (
                    <p className="text-[10px] text-[#6B6560]/60 mt-0.5 tracking-widest">{formatSize(file.size)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {!loading && hasItems && view === 'list' && (
        <div className="space-y-1.5">
          {data.folders.map(folder => {
            const isSelected = selected.has(folder.path);
            return (
              <div
                key={folder.path}
                className={`flex items-center gap-4 px-5 py-4 border transition-all ${
                  isSelected ? 'border-[#B8956A]/50 bg-[#B8956A]/5' : 'border-[#2A2520] hover:border-[#B8956A]/20'
                }`}
              >
                <Checkbox checked={isSelected} onChange={() => toggle(folder.path)} />
                <button
                  onClick={() => navigateTo(folder)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left group"
                >
                  <FolderIcon className="w-4 h-4 text-[#B8956A]/50 shrink-0 group-hover:text-[#B8956A] transition-colors" />
                  <span className="text-sm text-[#E8E4DF]/70 truncate tracking-wide group-hover:text-[#E8E4DF] transition-colors">
                    {folder.name}
                  </span>
                </button>
                <button
                  onClick={e => handleFolderDownload(folder, e)}
                  disabled={downloading}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[#B8956A]/30 text-[#B8956A]/70 hover:text-[#B8956A] hover:border-[#B8956A] hover:bg-[#B8956A]/5 text-[10px] tracking-widest uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <DownloadIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <svg
                  className="w-3.5 h-3.5 text-[#6B6560] shrink-0 cursor-pointer hover:text-[#B8956A] transition-colors"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                  onClick={() => navigateTo(folder)}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            );
          })}

          {data.files.map(file => {
            const isSelected = selected.has(file.path);
            return (
              <div
                key={file.path}
                onClick={() => toggle(file.path)}
                className={`flex items-center gap-4 px-5 py-4 border cursor-pointer transition-all ${
                  isSelected ? 'border-[#B8956A]/50 bg-[#B8956A]/5' : 'border-[#2A2520] hover:border-[#B8956A]/20'
                }`}
              >
                <Checkbox checked={isSelected} onChange={() => toggle(file.path)} />
                {file.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.thumbnailUrl} alt="" className="w-10 h-10 object-cover shrink-0 border border-[#2A2520]" />
                ) : (
                  <FileIcon fileType={file.fileType} className="w-5 h-5 text-[#E8E4DF]/25 shrink-0" />
                )}
                <span className="text-sm text-[#E8E4DF]/70 flex-1 truncate tracking-wide">
                  {file.name}
                </span>
                {file.size && (
                  <span className="text-[10px] text-[#6B6560] shrink-0 tracking-widest">{formatSize(file.size)}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Download bar */}
      {(selected.size > 0 || downloading) && (
        <div className="sticky bottom-6 flex justify-end pt-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-3 px-8 py-4 bg-[#B8956A] hover:bg-[#CDAA7E] text-[#060606] text-xs tracking-[0.2em] uppercase font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_4px_32px_rgba(0,0,0,0.5)]"
          >
            {downloading ? (
              <>
                <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
                {downloadStatus || 'Downloading...'}
              </>
            ) : (
              <>
                <DownloadIcon className="w-3.5 h-3.5" />
                Download {selected.size} {selected.size === 1 ? 'item' : 'items'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
