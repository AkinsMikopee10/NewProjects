import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useApplications } from "../context/ApplicationsContext";
import { incrementView, incrementApply } from "../api/jobs";
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
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

const JobCard = ({ job, isSeen = false, onOpenDetail }) => {
  const { user } = useAuth();
  const { isSaved, isApplied, saveJob, unsaveJob, applyJob } =
    useApplications();

  const viewedRef = useRef(false);
  const saved = isSaved(job._id);
  const applied = isApplied(job._id);

  const [saveLoading, setSaveLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [copied, setCopied] = useState(false);
  const [seen, setSeen] = useState(isSeen);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    incrementView(job._id).catch(() => {});
    if (!seen && user) {
      markSeen(job._id)
        .then(() => setSeen(true))
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e) {
    e.stopPropagation();
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

  function handleApply(e) {
    e.stopPropagation();
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

  async function handleCopy(e) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(job.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* unavailable */
    }
  }

  const badge = SOURCE_BADGE[job.source] || {
    label: job.source,
    color: "#888",
  };
  const isNew = !seen;

  return (
    <>
      <div
        onClick={() => onOpenDetail?.(job)}
        className={`
          group relative bg-white/5 hover:bg-white/[0.08] border rounded-2xl p-5
          cursor-pointer transition-all duration-200
          ${
            isNew
              ? "border-primary/40 shadow-[0_0_0_1px_rgba(108,99,255,0.15)]"
              : "border-white/8 hover:border-white/15"
          }
        `}
      >
        {/* NEW chip */}
        {isNew && !applied && (
          <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest bg-primary/20 text-primary px-2 py-0.5 rounded-full">
            New
          </span>
        )}

        {/* Applied chip */}
        {applied && (
          <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest bg-accent/20 text-accent px-2 py-0.5 rounded-full">
            Applied ✓
          </span>
        )}

        {/* Source badge + time */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${badge.color}22`, color: badge.color }}
          >
            {badge.label}
          </span>
          <span className="text-white/30 text-xs">{timeAgo(job.postedAt)}</span>
        </div>

        {/* Title + company */}
        <h3 className="font-display font-bold text-white text-base leading-snug mb-0.5 pr-12 group-hover:text-primary transition-colors line-clamp-2">
          {job.title}
        </h3>
        <p className="text-white/50 text-sm mb-3 truncate">{job.company}</p>

        {/* Location */}
        {job.location && job.location !== "Remote" && (
          <p className="text-white/35 text-xs mb-3 flex items-center gap-1">
            <svg
              className="w-3 h-3 flex-shrink-0"
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
          </p>
        )}

        {/* Tags */}
        {job.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="text-[11px] bg-white/5 text-white/50 px-2 py-0.5 rounded-lg border border-white/5"
              >
                {tag}
              </span>
            ))}
            {job.tags.length > 5 && (
              <span className="text-[11px] text-white/30 px-1">
                +{job.tags.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleSave}
            disabled={saveLoading}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-150
              ${saved ? "bg-primary/20 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white"}
              ${saveLoading ? "opacity-50 cursor-wait" : ""}
            `}
          >
            <svg
              className="w-3.5 h-3.5"
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
            {saved ? "Saved" : "Save"}
          </button>

          <button
            onClick={handleApply}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-150
              ${applied ? "bg-accent/15 border-accent/25 text-accent/70" : "bg-accent/10 border-accent/20 text-accent hover:bg-accent/20"}
            `}
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
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            {applied ? "Applied" : "Apply"}
          </button>

          <button
            onClick={handleCopy}
            className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-all duration-150 text-xs"
          >
            {copied ? (
              <svg
                className="w-3.5 h-3.5 text-accent"
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
                className="w-3.5 h-3.5"
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
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {showToast && (
        <ApplyToast
          onConfirm={handleApplyConfirm}
          onUndo={() => setShowToast(false)}
          onDismiss={() => setShowToast(false)}
        />
      )}
    </>
  );
};

export default JobCard;
