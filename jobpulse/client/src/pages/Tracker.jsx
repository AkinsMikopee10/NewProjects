import { useState, useRef, useEffect, useCallback } from "react";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { useApplications } from "../context/ApplicationsContext";
import { useAuth } from "../context/AuthContext";
import BottomNav from "../components/BottomNav";
import DesktopNav from "../components/DesktopNav";

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

// Days 15–16: tab definitions — "all" is a meta-tab, rest match status values
const TABS = [
  { key: "all", label: "All" },
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interview" },
  { key: "rejected", label: "Rejected" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function colFor(status) {
  return COLUMNS.find((c) => c.status === status) || COLUMNS[0];
}

// Day 17: "Applied 5 days ago" format
function appliedAgo(dateApplied) {
  if (!dateApplied) return null;
  return `Applied ${formatDistanceToNow(new Date(dateApplied), { addSuffix: true })}`;
}

// Day 18: stale if applied > 7 days ago and still in applied status
function isStale(app) {
  if (app.status !== "applied") return false;
  const days = differenceInDays(
    new Date(),
    new Date(app.dateApplied || app.createdAt),
  );
  return days >= 7;
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function AppCardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/8 rounded-xl p-4 animate-pulse">
      <div className="h-4 w-3/4 bg-white/10 rounded-lg mb-2" />
      <div className="h-3 w-1/2 bg-white/5 rounded-lg mb-3" />
      <div className="flex gap-1 mb-3">
        <div className="h-4 w-12 bg-white/5 rounded-lg" />
        <div className="h-4 w-10 bg-white/5 rounded-lg" />
      </div>
      <div className="flex justify-between mt-3">
        <div className="h-4 w-16 bg-white/5 rounded-full" />
        <div className="h-4 w-12 bg-white/5 rounded-lg" />
      </div>
    </div>
  );
}

function ListRowSkeleton() {
  return (
    <tr className="border-b border-white/5">
      <td className="py-3 px-4">
        <div className="h-4 w-48 bg-white/10 rounded-lg mb-1" />
        <div className="h-3 w-32 bg-white/5 rounded-lg" />
      </td>
      <td className="py-3 px-4 hidden sm:table-cell">
        <div className="h-4 w-20 bg-white/5 rounded-lg" />
      </td>
      <td className="py-3 px-4">
        <div className="h-6 w-20 bg-white/5 rounded-lg" />
      </td>
      <td className="py-3 px-4 hidden md:table-cell">
        <div className="h-3 w-28 bg-white/5 rounded-lg" />
      </td>
      <td className="py-3 px-4 hidden sm:table-cell">
        <div className="h-3 w-16 bg-white/5 rounded-lg" />
      </td>
      <td className="py-3 px-4" />
    </tr>
  );
}

// ─── Inline notes (Day 17) ────────────────────────────────────────────────────
// Auto-saves on blur — no modal, no save button

function InlineNotes({ applicationId, initialNotes, onSave }) {
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSavedOk] = useState(false);
  const prevRef = useRef(initialNotes || "");

  // Sync if parent updates (e.g. after rollback)
  useEffect(() => {
    setNotes(initialNotes || "");
  }, [initialNotes]);

  async function handleBlur() {
    if (notes === prevRef.current) return; // nothing changed
    setSaving(true);
    try {
      await onSave(applicationId, notes);
      prevRef.current = notes;
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 1500);
    } catch {
      setNotes(prevRef.current); // revert on error
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative mt-2">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        placeholder="Add notes…"
        rows={2}
        className="w-full bg-white/[0.03] border border-white/5 hover:border-white/10 focus:border-primary/40 rounded-lg px-2.5 py-2 text-white/60 text-xs placeholder-white/20 outline-none transition-colors resize-none leading-relaxed"
      />
      {saving && (
        <span className="absolute bottom-1.5 right-2 text-[10px] text-white/25">
          saving…
        </span>
      )}
      {saved && !saving && (
        <span className="absolute bottom-1.5 right-2 text-[10px] text-accent">
          saved ✓
        </span>
      )}
    </div>
  );
}

// ─── Follow-up nudge (Day 18) ─────────────────────────────────────────────────

function FollowUpBadge() {
  return (
    <div className="flex items-center gap-1 text-amber-400 text-[10px] font-semibold mb-2">
      <svg
        className="w-3 h-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      Follow up
    </div>
  );
}

// ─── AppCard ──────────────────────────────────────────────────────────────────

function AppCard({ app, onStatusChange, onSaveNotes, onDelete }) {
  const job = app.jobId;
  const col = colFor(app.status);
  const prev = STATUS_ORDER[STATUS_ORDER.indexOf(app.status) - 1];
  const next = STATUS_ORDER[STATUS_ORDER.indexOf(app.status) + 1];
  const stale = isStale(app);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!job) return null;

  const appliedLabel = appliedAgo(app.dateApplied || app.createdAt);

  return (
    <div
      className={`
      group bg-white/5 hover:bg-white/[0.07] border rounded-xl p-4 transition-all
      ${stale ? "border-amber-500/30" : "border-white/8"}
    `}
    >
      {/* Follow-up nudge */}
      {stale && <FollowUpBadge />}

      {/* Title + company + context menu */}
      <div className="mb-2 pr-6 relative">
        <h4 className="text-white text-sm font-semibold leading-snug line-clamp-2">
          {job.title}
        </h4>
        <p className="text-white/40 text-xs mt-0.5 truncate">{job.company}</p>

        <div className="absolute top-0 right-0" ref={menuRef}>
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
            <div className="absolute right-0 top-7 z-20 w-40 bg-[#111827] border border-white/10 rounded-xl overflow-hidden shadow-xl">
              <button
                onClick={() => {
                  setShowNotes((o) => !o);
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
                {showNotes ? "Hide notes" : "Edit notes"}
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
              <div className="border-t border-white/5" />
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

      {/* Tags */}
      {job.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
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

      {/* Inline notes (Day 17) */}
      {(showNotes || app.notes) && (
        <InlineNotes
          applicationId={app._id}
          initialNotes={app.notes}
          onSave={onSaveNotes}
        />
      )}

      {/* Footer: status pill + dateApplied (Day 17) + time */}
      <div className="flex items-center justify-between mt-3">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ backgroundColor: col.bg, color: col.color }}
        >
          {col.label}
        </span>
        <span className="text-white/25 text-[10px]">{appliedLabel || ""}</span>
      </div>

      {/* Quick-move arrows */}
      <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        {prev && (
          <button
            onClick={() => onStatusChange(app._id, prev)}
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

// ─── AppRow (list view) ───────────────────────────────────────────────────────

function AppRow({ app, onStatusChange, onSaveNotes, onDelete }) {
  const job = app.jobId;
  const col = colFor(app.status);
  const stale = isStale(app);
  const [editingNotes, setEditingNotes] = useState(false);

  if (!job) return null;

  return (
    <tr
      className={`group border-b border-white/5 transition-colors ${stale ? "bg-amber-500/[0.03]" : "hover:bg-white/[0.03]"}`}
    >
      <td className="py-3 px-4">
        <div className="flex items-start gap-2">
          {stale && (
            <svg
              className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          )}
          <div className="min-w-0">
            <p className="text-white text-sm font-medium line-clamp-1">
              {job.title}
            </p>
            <p className="text-white/40 text-xs mt-0.5">{job.company}</p>
          </div>
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
        {/* Day 17: status dropdown — card moves to correct tab on change */}
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
      <td className="py-3 px-4 hidden md:table-cell min-w-[180px]">
        {editingNotes ? (
          <InlineNotes
            applicationId={app._id}
            initialNotes={app.notes}
            onSave={async (id, notes) => {
              await onSaveNotes(id, notes);
              setEditingNotes(false);
            }}
          />
        ) : (
          <button
            onClick={() => setEditingNotes(true)}
            className="text-left w-full text-white/30 text-xs hover:text-white/60 transition-colors"
          >
            {app.notes ? (
              <span className="text-white/50 line-clamp-1">{app.notes}</span>
            ) : (
              <span className="italic text-white/20">Add notes…</span>
            )}
          </button>
        )}
      </td>
      <td className="py-3 px-4 text-white/25 text-xs whitespace-nowrap hidden sm:table-cell">
        {/* Day 17: dateApplied */}
        {app.dateApplied
          ? formatDistanceToNow(new Date(app.dateApplied), { addSuffix: true })
          : "—"}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

// ─── Empty column ─────────────────────────────────────────────────────────────

function EmptyColumn({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-3">
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

// ─── Tracker ──────────────────────────────────────────────────────────────────

export default function Tracker() {
  const { user, logout } = useAuth();
  const { applications, loading, changeStatus, saveNotes, removeApplication } =
    useApplications();

  // Days 15–16: active tab filter
  const [activeTab, setActiveTab] = useState("all");
  const [view, setView] = useState("kanban");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filter applications by active tab — O(n) on in-memory array, fast
  const filtered =
    activeTab === "all"
      ? applications
      : applications.filter((a) => a.status === activeTab);

  const total = applications.length;
  const staleCount = applications.filter(isStale).length;

  const stats = COLUMNS.map((col) => ({
    ...col,
    count: applications.filter((a) => a.status === col.status).length,
  }));

  const firstName = user?.email?.split("@")[0] ?? "there";

  return (
    <div className="min-h-screen bg-bg text-white">
      {/* Topbar */}
      <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-display font-bold text-lg text-white tracking-tight">
            Job<span className="text-primary">Pulse</span>
          </span>
          <DesktopNav />
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setView("kanban")}
                title="Kanban"
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
                title="List"
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

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary uppercase">
                    {firstName[0]}
                  </span>
                </div>
                <svg
                  className={`w-3 h-3 text-white/30 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-[#111827] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-xs text-white/40">Signed in as</p>
                    <p className="text-xs text-white/80 truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-28 sm:pb-8">
        {/* Heading */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Application Tracker
            </h1>
            {/* Day 18: global stale nudge if any follow-ups needed */}
            {staleCount > 0 && (
              <span className="flex items-center gap-1 text-amber-400 text-xs font-semibold bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                {staleCount} to follow up
              </span>
            )}
          </div>
          <p className="text-white/40 text-sm mt-1">
            {total > 0
              ? `${total} application${total !== 1 ? "s" : ""} tracked`
              : "Save jobs to start tracking"}
          </p>
        </div>

        {/* Stats strip */}
        {total > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {stats.map((s) => (
              <button
                key={s.status}
                onClick={() => setActiveTab(s.status)}
                className="rounded-2xl border p-4 text-center transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: s.bg,
                  borderColor:
                    activeTab === s.status ? s.color : `${s.color}30`,
                  boxShadow:
                    activeTab === s.status ? `0 0 0 1px ${s.color}` : "none",
                }}
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
              </button>
            ))}
          </div>
        )}

        {/* Days 15–16: Segmented tabs */}
        {total > 0 && (
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 mb-6 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => {
              const count =
                tab.key === "all"
                  ? total
                  : applications.filter((a) => a.status === tab.key).length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${
                      activeTab === tab.key
                        ? "bg-primary/20 text-primary"
                        : "text-white/40 hover:text-white"
                    }
                  `}
                >
                  {tab.label}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                    ${activeTab === tab.key ? "bg-primary/20 text-primary" : "bg-white/8 text-white/30"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Loading skeletons (Days 15–16) */}
        {loading && view === "kanban" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map((col) => (
              <div key={col.status} className="flex flex-col">
                <div className="h-8 bg-white/5 rounded-xl mb-3 animate-pulse" />
                <div className="flex flex-col gap-3">
                  {[1, 2].map((i) => (
                    <AppCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && view === "list" && (
          <div className="rounded-2xl border border-white/8 overflow-hidden">
            <table className="w-full">
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <ListRowSkeleton key={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {!loading && total === 0 && (
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

        {/* Empty filtered tab state */}
        {!loading && total > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-white/40 text-sm">
              No {activeTab} applications yet.
            </p>
            {activeTab !== "all" && (
              <button
                onClick={() => setActiveTab("all")}
                className="text-primary text-xs mt-2 hover:underline"
              >
                View all
              </button>
            )}
          </div>
        )}

        {/* ── Kanban view ───────────────────────────────────────────────────── */}
        {!loading && filtered.length > 0 && view === "kanban" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(activeTab === "all"
              ? COLUMNS
              : COLUMNS.filter((c) => c.status === activeTab)
            ).map((col) => {
              const colApps = filtered.filter((a) => a.status === col.status);
              return (
                <div key={col.status} className="flex flex-col">
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
                  <div className="flex flex-col gap-3">
                    {colApps.length === 0 ? (
                      <EmptyColumn label={col.label} />
                    ) : (
                      colApps.map((app) => (
                        <AppCard
                          key={app._id}
                          app={app}
                          onStatusChange={changeStatus}
                          onSaveNotes={saveNotes}
                          onDelete={removeApplication}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── List view ──────────────────────────────────────────────────────── */}
        {!loading && filtered.length > 0 && view === "list" && (
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
                    Applied
                  </th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => (
                  <AppRow
                    key={app._id}
                    app={app}
                    onStatusChange={changeStatus}
                    onSaveNotes={saveNotes}
                    onDelete={removeApplication}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
