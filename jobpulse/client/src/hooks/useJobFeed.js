import { useState, useEffect, useCallback } from "react";
import { fetchJobs, fetchRecentCount } from "../api/jobs";
import { useAuth } from "../context/AuthContext";
import { fetchMeta } from "../api/meta";

const PAGE_SIZE = 20;

export function useJobFeed(type) {
  const { user, refreshLastCheckedAt } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [seenIds, setSeenIds] = useState(new Set());
  const [newCount, setNewCount] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeTags, setActiveTags] = useState([]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(search);
      setPage(1);
      setJobs([]);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // New jobs banner
  useEffect(() => {
    if (!user?.lastCheckedAt) return;
    fetchRecentCount(user.lastCheckedAt)
      .then(({ count }) => setNewCount(count))
      .catch(() => {});
  }, [user?.lastCheckedAt]);

  async function loadSeenIds(jobList) {
    if (!jobList.length) return;
    try {
      const metas = await fetchMeta(jobList.map((j) => j._id));
      const seen = new Set(
        metas.filter((m) => m.seen).map((m) => String(m.jobId)),
      );
      setSeenIds((prev) => new Set([...prev, ...seen]));
    } catch {
      /* non-fatal */
    }
  }

  const fetchPage = useCallback(
    async (pageNum, append = false) => {
      try {
        const params = { type, page: pageNum, limit: PAGE_SIZE };
        if (debouncedQ) params.search = debouncedQ;
        if (activeTags.length) params.tags = activeTags.join(",");

        const data = await fetchJobs(params);
        setJobs((prev) => (append ? [...prev, ...data.jobs] : data.jobs));
        setHasMore(data.pagination.hasMore);
        setTotal(data.pagination.total);
        setError(false);

        await loadSeenIds(data.jobs);

        if (!append && pageNum === 1) {
          refreshLastCheckedAt().catch(() => {});
        }
      } catch {
        setError(true);
      }
    },
    [type, debouncedQ, activeTags, refreshLastCheckedAt],
  );

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setJobs([]);
    fetchPage(1, false).finally(() => setLoading(false));
  }, [debouncedQ, activeTags, type]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMore() {
    const next = page + 1;
    setLoadingMore(true);
    setPage(next);
    await fetchPage(next, true);
    setLoadingMore(false);
  }

  function toggleTag(tag) {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
    setPage(1);
    setJobs([]);
  }

  function retry() {
    setLoading(true);
    setError(false);
    fetchPage(1, false).finally(() => setLoading(false));
  }

  return {
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
    clearTags: () => setActiveTags([]),
    loadMore,
    retry,
  };
}
