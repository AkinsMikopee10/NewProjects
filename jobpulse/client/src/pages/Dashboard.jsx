import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useJobFeed } from "../hooks/useJobFeed";
import JobCard from "../components/JobCard";
import JobDetailDrawer from "../components/JobDetailDrawer";
import BottomNav from "../components/BottomNav";

const POPULAR_TAGS = [
  "React",
  "Node.js",
  "Python",
  "TypeScript",
  "Go",
  "AWS",
  "DevOps",
  "Figma",
  "Vue",
  "Django",
];

function JobSkeleton() {
  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-4 w-16 bg-white/10 rounded-full" />
        <div className="h-3 w-10 bg-white/5 rounded-full" />
      </div>
      <div className="h-5 w-3/4 bg-white/10 rounded-lg mb-2" />
      <div className="h-4 w-1/2 bg-white/5 rounded-lg mb-4" />
      <div className="flex gap-2 mb-4">
        {[60, 48, 52, 44].map((w, i) => (
          <div
            key={i}
            className="h-5 bg-white/5 rounded-lg"
            style={{ width: w }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-16 bg-white/5 rounded-xl" />
        <div className="h-8 w-16 bg-white/5 rounded-xl" />
      </div>
    </div>
  );
}

function ErrorState({ onRetry }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <p className="text-white/60 text-sm mb-4">
        Couldn't load jobs. Check your connection.
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-all"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState({ search, onClear }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-white/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <p className="text-white/50 text-sm mb-1">
        No jobs found{search ? ` for "${search}"` : ""}.
      </p>
      {search && (
        <button
          onClick={onClear}
          className="text-primary text-sm hover:underline mt-1"
        >
          Clear search
        </button>
      )}
    </div>
  );
}

function JobFeedShell({ type, label }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [detailJob, setDetailJob] = useState(null);

  const {
    jobs,
    loading,
    loadingMore,
    error,
    hasMore,
    total,
    seenIds,
    newCount,
    search,
    setSearch,
    activeTags,
    toggleTag,
    clearTags,
    loadMore,
    retry,
  } = useJobFeed(type);

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const firstName = user?.email?.split("@")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-bg text-white">
      {/* Topbar */}
      <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-display font-bold text-lg text-white tracking-tight">
            Job<span className="text-primary">Pulse</span>
          </span>

          {/* Desktop nav */}
          <DesktopNav />

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
              <span className="text-white/60 text-xs hidden sm:block max-w-[120px] truncate">
                {user?.email}
              </span>
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
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-28 sm:pb-8">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            {greeting}, <span className="text-primary">{firstName}</span> 👋
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {total > 0
              ? `${total.toLocaleString()} ${label.toLowerCase()} jobs available`
              : `Finding the best ${label.toLowerCase()} roles for you`}
          </p>
        </div>

        {/* New jobs banner */}
        {newCount > 0 && (
          <div className="mb-6 flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                {newCount} new {newCount === 1 ? "job" : "jobs"} since your last
                visit
              </p>
              <p className="text-white/40 text-xs mt-0.5">
                Last checked{" "}
                {new Date(user.lastCheckedAt).toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${label.toLowerCase()} jobs…`}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-10 py-3 text-white text-sm placeholder-white/25 outline-none focus:border-primary/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
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
          )}
        </div>

        {/* Tag chips — horizontally scrollable on mobile */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide">
          {POPULAR_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`
                flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
                ${
                  activeTags.includes(tag)
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "bg-white/5 border-white/8 text-white/50 hover:border-white/15 hover:text-white"
                }
              `}
            >
              {tag}
            </button>
          ))}
          {activeTags.length > 0 && (
            <button
              onClick={clearTags}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Job grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 9 }).map((_, i) => <JobSkeleton key={i} />)
          ) : error ? (
            <ErrorState onRetry={retry} />
          ) : jobs.length === 0 ? (
            <EmptyState search={search} onClear={() => setSearch("")} />
          ) : (
            jobs.map((job) => (
              <JobCard
                key={job._id}
                job={job}
                isSeen={seenIds.has(String(job._id))}
                onOpenDetail={(j) => setDetailJob(j)}
              />
            ))
          )}
        </div>

        {/* Load more */}
        {!loading && !error && hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm font-medium transition-all disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Loading…
                </>
              ) : (
                <>
                  Load more
                  <span className="text-white/30 text-xs">
                    ({total - jobs.length} remaining)
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {!loading && !error && jobs.length > 0 && !hasMore && (
          <p className="text-center text-white/20 text-xs mt-10">
            You've seen all {total.toLocaleString()} jobs
          </p>
        )}
      </main>

      <JobDetailDrawer job={detailJob} onClose={() => setDetailJob(null)} />

      <BottomNav />
    </div>
  );
}

// Desktop nav — reads current route to highlight active tab
function DesktopNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const tabs = [
    { label: "Remote", path: "/" },
    { label: "Contract", path: "/contract" },
    { label: "Tracker", path: "/tracker" },
  ];
  return (
    <nav className="hidden sm:flex items-center gap-1 bg-white/5 rounded-xl p-1">
      {tabs.map((tab) => (
        <button
          key={tab.path}
          onClick={() => tab.path !== "/tracker" && navigate(tab.path)}
          disabled={tab.path === "/tracker"}
          className={`
            px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${
              pathname === tab.path
                ? "bg-primary/20 text-primary"
                : tab.path === "/tracker"
                  ? "text-white/25 cursor-not-allowed"
                  : "text-white/50 hover:text-white"
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

// Export two named page components using the same shell
export default function RemoteDashboard() {
  return <JobFeedShell type="remote" label="Remote" />;
}

export function ContractDashboard() {
  return <JobFeedShell type="contract" label="Contract" />;
}
