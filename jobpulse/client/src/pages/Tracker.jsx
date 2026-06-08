import { useState, useEffect, useOptimistic, useCallback } from "react";
import {
  fetchApplications,
  updateApplication,
  deleteApplication,
} from "../api/applications";
import DesktopNav from "../components/DesktopNav";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../context/AuthContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    status: "saved",
    label: "Saved",
    color: "#6c63ff",
    bg: "rgba(108,99,255,0.08)",
  },
  {
    status: "applied",
    label: "Applied",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.08)",
  },
  {
    status: "interview",
    label: "Interview",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
  },
  {
    status: "rejected",
    label: "Rejected",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
  },
];

const STATUS_ORDER = ["saved", "applied", "interview", "rejected"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function colFor(status) {
  return COLUMNS.find((c) => c.status === status) || COLUMNS[0];
}

// ─── Empty column ─────────────────────────────────────────────────────────────

function EmptyColumn({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-10 h-10 rounded-xl bg-white/3 border border-white/5 flex items-center justify-center mb-3">
        <svg
          className="w-4 h-4 text-white/20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <p className="text-white/25 text-xs">No {label.toLowerCase()} jobs</p>
    </div>
  );
}

// ─── Notes modal ─────────────────────────────────────────────────────────────

function NotesModal({ application, onSave, onClose }) {
  const [notes, setNotes] = useState(application.notes || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(application._id, notes);
    setSaving(false);
    onClose();
  }

  // Close on Escape
  useEffect(() => {
    function handler(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-[#0d1326] border border-white/10 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-white text-base leading-snug">
              {application.jobId?.title ?? "Job"}
            </h3>
            <p className="text-white/40 text-xs mt-0.5">
              {application.jobId?.company}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all ml-3 flex-shrink-0"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes — interview date, contact name, next steps…"
          rows={5}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 outline-none focus:border-primary/50 transition-colors resize-none"
        />
        <div className="flex items-center justify-end gap-2 mt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm bg-primary hover:bg-primary/90 text-white font-medium transition-all disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save notes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Application card (Kanban) ────────────────────────────────────────────────

function AppCard({ app, onStatusChange, onNotesOpen, onDelete }) {
  const job = app.jobId;
  const col = colFor(app.status);
  const prev = STATUS_ORDER[STATUS_ORDER.indexOf(app.status) - 1];
  const next = STATUS_ORDER[STATUS_ORDER.indexOf(app.status) + 1];
  const [menuOpen, setMenuOpen] = useState(false);

  if (!job) return null;

  return (
    <div className="group bg-white/5 hover:bg-white/[0.07] border border-white/8 rounded-xl p-4 transition-all">
      {/* Title + company */}
      <div className="mb-3 pr-6 relative">
        <h4 className="text-white text-sm font-semibold leading-snug line-clamp-2">
          {job.title}
        </h4>
        <p className="text-white/40 text-xs mt-0.5 truncate">{job.company}</p>

        {/* Context menu */}
        <div className="absolute top-0 right-0">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-7 z-20 w-40 bg-[#111827] border border-white/10 rounded-xl overflow-hidden shadow-xl"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                onClick={() => {
                  onNotesOpen(app);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit notes
              </button>
              {prev && (
                <button
                  onClick={() => {
                    onStatusChange(app._id, prev);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Move to {colFor(prev).label}
                </button>
              )}
              {next && (
                <button
                  onClick={() => {
                    onStatusChange(app._id, next);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  Move to {colFor(next).label}
                </button>
              )}
              <div className="border-t border-white/5 mt-1" />
              <button
                onClick={() => {
                  onDelete(app._id);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tags (up to 3) */}
      {job.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {job.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded-lg border border-white/5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Notes preview */}
      {app.notes && (
        <p className="text-white/35 text-xs italic line-clamp-2 mb-3 border-l-2 border-white/10 pl-2">
          {app.notes}
        </p>
      )}

      {/* Footer: status pill + time + move buttons */}
      <div className="flex items-center justify-between mt-auto">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ backgroundColor: col.bg, color: col.color }}
        >
          {col.label}
        </span>
        <span className="text-white/25 text-[10px]">
          {timeAgo(app.updatedAt)}
        </span>
      </div>

      {/* Quick-move arrows (always visible on touch, hover on desktop) */}
      <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        {prev && (
          <button
            onClick={() => onStatusChange(app._id, prev)}
            title={`Move to ${colFor(prev).label}`}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/5 border border-white/8 text-white/40 hover:text-white hover:border-white/15 text-[10px] transition-all"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {colFor(prev).label}
          </button>
        )}
        {next && (
          <button
            onClick={() => onStatusChange(app._id, next)}
            title={`Move to ${colFor(next).label}`}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/5 border border-white/8 text-white/40 hover:text-white hover:border-white/15 text-[10px] transition-all"
          >
            {colFor(next).label}
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── List row ─────────────────────────────────────────────────────────────────

function AppRow({ app, onStatusChange, onNotesOpen, onDelete }) {
  const job = app.jobId;
  const col = colFor(app.status);
  if (!job) return null;

  return (
    <tr className="group border-b border-white/5 hover:bg-white/[0.03] transition-colors">
      <td className="py-3 px-4">
        <div>
          <p className="text-white text-sm font-medium line-clamp-1">
            {job.title}
          </p>
          <p className="text-white/40 text-xs mt-0.5">{job.company}</p>
        </div>
      </td>
      <td className="py-3 px-4 hidden sm:table-cell">
        <div className="flex flex-wrap gap-1">
          {(job.tags || []).slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded-lg border border-white/5"
            >
              {t}
            </span>
          ))}
        </div>
      </td>
      <td className="py-3 px-4">
        <select
          value={app.status}
          onChange={(e) => onStatusChange(app._id, e.target.value)}
          className="text-xs rounded-lg px-2 py-1 border outline-none cursor-pointer transition-colors"
          style={{
            backgroundColor: col.bg,
            borderColor: `${col.color}44`,
            color: col.color,
          }}
        >
          {STATUS_ORDER.map((s) => (
            <option
              key={s}
              value={s}
              style={{ backgroundColor: "#0d1326", color: "#fff" }}
            >
              {colFor(s).label}
            </option>
          ))}
        </select>
      </td>
      <td className="py-3 px-4 hidden md:table-cell">
        <p className="text-white/30 text-xs max-w-[160px] truncate">
          {app.notes || <span className="italic text-white/15">No notes</span>}
        </p>
      </td>
      <td className="py-3 px-4 text-white/25 text-xs whitespace-nowrap hidden sm:table-cell">
        {timeAgo(app.updatedAt)}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onNotesOpen(app)}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
            title="Edit notes"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={() => onDelete(app._id)}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-white/40 hover:text-red-400 transition-all"
            title="Remove"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Tracker ──────────────────────────────────────────────────────────────────

export default function Tracker() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState("kanban"); // 'kanban' | 'list'
  const [notesApp, setNotesApp] = useState(null);

  // ── Load applications ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await fetchApplications();
      setApps(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Status change (optimistic) ─────────────────────────────────────────────
  async function handleStatusChange(id, status) {
    // Optimistically update
    setApps((prev) =>
      prev.map((a) =>
        a._id === id
          ? { ...a, status, updatedAt: new Date().toISOString() }
          : a,
      ),
    );
    try {
      await updateApplication(id, { status });
    } catch {
      // Roll back on failure
      load();
    }
  }

  // ── Save notes ─────────────────────────────────────────────────────────────
  async function handleSaveNotes(id, notes) {
    setApps((prev) => prev.map((a) => (a._id === id ? { ...a, notes } : a)));
    try {
      await updateApplication(id, { notes });
    } catch {
      load();
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    setApps((prev) => prev.filter((a) => a._id !== id));
    try {
      await deleteApplication(id);
    } catch {
      load();
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = COLUMNS.map((col) => ({
    ...col,
    count: apps.filter((a) => a.status === col.status).length,
  }));
  const total = apps.length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg text-white">
      {/* Topbar */}
      <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-display font-bold text-lg text-white tracking-tight">
            Job<span className="text-primary">Pulse</span>
          </span>
          <DesktopNav />;
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setView("kanban")}
                title="Kanban view"
                className={`w-8 h-7 rounded-lg flex items-center justify-center transition-all ${view === "kanban" ? "bg-primary/20 text-primary" : "text-white/30 hover:text-white"}`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                  />
                </svg>
              </button>
              <button
                onClick={() => setView("list")}
                title="List view"
                className={`w-8 h-7 rounded-lg flex items-center justify-center transition-all ${view === "list" ? "bg-primary/20 text-primary" : "text-white/30 hover:text-white"}`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-28 sm:pb-8">
        {/* Heading */}
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Application Tracker
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {total > 0
              ? `${total} application${total !== 1 ? "s" : ""} tracked`
              : "Save jobs to start tracking"}
          </p>
        </div>

        {/* Stats strip */}
        {total > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-8">
            {stats.map((s) => (
              <div
                key={s.status}
                className="rounded-2xl border p-4 text-center"
                style={{ backgroundColor: s.bg, borderColor: `${s.color}30` }}
              >
                <p
                  className="text-2xl font-display font-bold"
                  style={{ color: s.color }}
                >
                  {s.count}
                </p>
                <p className="text-xs mt-0.5" style={{ color: `${s.color}99` }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center py-24 gap-3">
            <p className="text-white/50 text-sm">
              Couldn't load your applications.
            </p>
            <button
              onClick={load}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white text-sm transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && total === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-5">
              <svg
                className="w-7 h-7 text-white/20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <p className="text-white/50 text-sm mb-1">No applications yet.</p>
            <p className="text-white/25 text-xs">
              Save or apply to jobs from the Remote or Contract feed.
            </p>
          </div>
        )}

        {/* ── Kanban view ──────────────────────────────────────────────────── */}
        {!loading && !error && total > 0 && view === "kanban" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map((col) => {
              const colApps = apps.filter((a) => a.status === col.status);
              return (
                <div key={col.status} className="flex flex-col">
                  {/* Column header */}
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-xl mb-3 border"
                    style={{
                      backgroundColor: col.bg,
                      borderColor: `${col.color}30`,
                    }}
                  >
                    <span
                      className="text-xs font-semibold"
                      style={{ color: col.color }}
                    >
                      {col.label}
                    </span>
                    <span
                      className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: `${col.color}25`,
                        color: col.color,
                      }}
                    >
                      {colApps.length}
                    </span>
                  </div>
                  {/* Cards */}
                  <div className="flex flex-col gap-3">
                    {colApps.length === 0 ? (
                      <EmptyColumn label={col.label} />
                    ) : (
                      colApps.map((app) => (
                        <AppCard
                          key={app._id}
                          app={app}
                          onStatusChange={handleStatusChange}
                          onNotesOpen={setNotesApp}
                          onDelete={handleDelete}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── List view ────────────────────────────────────────────────────── */}
        {!loading && !error && total > 0 && view === "list" && (
          <div className="overflow-x-auto rounded-2xl border border-white/8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left py-3 px-4 text-xs text-white/30 font-semibold uppercase tracking-wider">
                    Job
                  </th>
                  <th className="text-left py-3 px-4 text-xs text-white/30 font-semibold uppercase tracking-wider hidden sm:table-cell">
                    Tags
                  </th>
                  <th className="text-left py-3 px-4 text-xs text-white/30 font-semibold uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs text-white/30 font-semibold uppercase tracking-wider hidden md:table-cell">
                    Notes
                  </th>
                  <th className="text-left py-3 px-4 text-xs text-white/30 font-semibold uppercase tracking-wider hidden sm:table-cell">
                    Updated
                  </th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => (
                  <AppRow
                    key={app._id}
                    app={app}
                    onStatusChange={handleStatusChange}
                    onNotesOpen={setNotesApp}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Notes modal */}
      {notesApp && (
        <NotesModal
          application={notesApp}
          onSave={handleSaveNotes}
          onClose={() => setNotesApp(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}

// ── Desktop nav (same pattern as Dashboard) ───────────────────────────────────
