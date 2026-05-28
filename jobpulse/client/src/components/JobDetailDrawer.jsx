import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useApplications } from "../context/ApplicationsContext";
import { incrementApply } from "../api/jobs";
import { markSeen } from "../api/meta";

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const SOURCE_BADGE = {
  remotive: { label: "Remotive", color: "#6c63ff" },
  remoteok: { label: "RemoteOK", color: "#00d4aa" },
  arbeitnow: { label: "Arbeitnow", color: "#3b82f6" },
};

function ApplyToast({ onConfirm, onUndo, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 animate-slide-up w-max">
      <div className="flex items-center gap-3 bg-[#1a2035] border border-white/10 rounded-2xl px-4 py-3 shadow-xl text-sm">
        <span className="text-white/70">Mark as applied?</span>
        <button
          onClick={onConfirm}
          className="bg-accent/20 text-accent hover:bg-accent/30 px-3 py-1 rounded-lg font-medium transition-colors"
        >
          Yes
        </button>
        <button
          onClick={onUndo}
          className="text-white/40 hover:text-white/70 transition-colors"
        >
          Undo
        </button>
      </div>
    </div>
  );
}

function JobDescription({ html }) {
  if (!html)
    return (
      <p className="text-white/30 text-sm italic">No description available.</p>
    );
  return (
    <div
      className="job-description text-white/70 text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-0.5">
      <span className="text-base leading-none">{icon}</span>
      <span className="text-white font-semibold text-sm">
        {(value ?? 0).toLocaleString()}
      </span>
      <span className="text-white/30 text-[10px]">{label}</span>
    </div>
  );
}

const JobDetailDrawer = ({ job, onClose }) => {
  const { user } = useAuth();
  const { isSaved, isApplied, saveJob, unsaveJob, applyJob } =
    useApplications();

  const seenRef = useRef(false);
  const drawerRef = useRef(null);
  const touchStartY = useRef(null);
  const touchStartX = useRef(null);

  const [visible, setVisible] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [copied, setCopied] = useState(false);

  const saved = job ? isSaved(job._id) : false;
  const applied = job ? isApplied(job._id) : false;

  useEffect(() => {
    if (job) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [job]);

  useEffect(() => {
    if (!job || seenRef.current) return;
    seenRef.current = true;
    if (user) markSeen(job._id).catch(() => {});
  }, [job, user]);

  useEffect(() => {
    seenRef.current = false;
    setShowToast(false);
    setCopied(false);
  }, [job?._id]);

  useEffect(() => {
    document.body.style.overflow = job ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [job]);

  useEffect(() => {
    function handler(e) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  function onTouchStart(e) {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e) {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX.current);
    if (deltaY > 80 && deltaX < 50) handleClose();
    touchStartY.current = null;
    touchStartX.current = null;
  }

  async function handleSave() {
    if (saveLoading) return;
    setSaveLoading(true);
    try {
      if (!saved) await saveJob(job._id);
      else await unsaveJob(job._id);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaveLoading(false);
    }
  }

  function handleApply() {
    window.open(job.url, "_blank", "noopener,noreferrer");
    incrementApply(job._id).catch(() => {});
    setShowToast(true);
  }

  async function handleApplyConfirm() {
    setShowToast(false);
    try {
      await applyJob(job._id);
    } catch (err) {
      console.error("Apply failed:", err);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(job.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* unavailable */
    }
  }

  if (!job) return null;
  const badge = SOURCE_BADGE[job.source] || {
    label: job.source,
    color: "#888",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={`
          fixed right-0 top-0 bottom-0 z-50
          w-full sm:w-[520px] lg:w-[580px]
          bg-[#0d1326] border-l border-white/8
          flex flex-col
          transition-transform duration-300 ease-out
          ${visible ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${badge.color}22`,
                color: badge.color,
              }}
            >
              {badge.label}
            </span>
            <span className="text-white/30 text-xs">
              {timeAgo(job.postedAt)}
            </span>
            {applied && (
              <span className="text-[10px] font-bold uppercase tracking-widest bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                Applied ✓
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-white/40 hover:text-white transition-all"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div>
            <h2 className="font-display font-bold text-white text-xl leading-snug mb-1">
              {job.title}
            </h2>
            <p className="text-white/50 text-sm mb-2">{job.company}</p>
            {job.location && (
              <div className="flex items-center gap-1.5 text-white/35 text-xs">
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {job.location}
                <span className="mx-1 text-white/15">·</span>
                <span className="capitalize">{job.type}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 py-3 px-4 bg-white/[0.03] border border-white/5 rounded-2xl">
            <Stat icon="👁" label="Views" value={job.views} />
            <div className="w-px h-6 bg-white/8" />
            <Stat icon="📤" label="Applies" value={job.applies} />
            <div className="w-px h-6 bg-white/8" />
            <Stat icon="⭐" label="Saves" value={job.saves} />
          </div>

          {/* Tags */}
          {job.tags?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
                Skills & Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-white/5 text-white/60 px-3 py-1 rounded-xl border border-white/8"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
              About the role
            </h3>
            <JobDescription html={job.description} />
          </div>

          <div className="h-4" />
        </div>

        {/* Sticky action bar */}
        <div
          className="flex-shrink-0 border-t border-white/8 px-6 py-4 relative"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          {showToast && (
            <ApplyToast
              onConfirm={handleApplyConfirm}
              onUndo={() => setShowToast(false)}
              onDismiss={() => setShowToast(false)}
            />
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={handleApply}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all active:scale-[0.98]"
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Apply now
            </button>

            <button
              onClick={handleSave}
              disabled={saveLoading}
              className={`
                w-12 h-12 rounded-2xl border flex items-center justify-center transition-all active:scale-[0.97]
                ${saved ? "bg-primary/20 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"}
                ${saveLoading ? "opacity-50 cursor-wait" : ""}
              `}
            >
              <svg
                className="w-5 h-5"
                fill={saved ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>

            <button
              onClick={handleCopy}
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 text-white/40 hover:text-white flex items-center justify-center transition-all active:scale-[0.97]"
            >
              {copied ? (
                <svg
                  className="w-5 h-5 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default JobDetailDrawer;
