import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  fetchApplications,
  createApplication as apiCreate,
  updateApplication as apiUpdate,
  deleteApplication as apiDelete,
} from "../api/applications";
import { useAuth } from "./AuthContext";

const ApplicationsContext = createContext(null);

export function ApplicationsProvider({ children }) {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(false); // has first fetch completed?

  // ── Initial load ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchApplications();
      setApplications(data);
      setSynced(true);
    } catch (err) {
      console.error("[ApplicationsContext] load failed", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) load();
    else {
      setApplications([]);
      setSynced(false);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getByJobId(jobId) {
    return (
      applications.find(
        (a) => String(a.jobId?._id ?? a.jobId) === String(jobId),
      ) ?? null
    );
  }

  function isSaved(jobId) {
    const a = getByJobId(jobId);
    return !!a;
  }
  function isApplied(jobId) {
    const a = getByJobId(jobId);
    return !!a && a.status !== "saved";
  }

  // ── Idempotent save ────────────────────────────────────────────────────────
  // Matches the backend: findOne → return existing, or create new
  async function saveJob(jobId) {
    const existing = getByJobId(jobId);
    if (existing) return existing; // already tracked

    // Optimistic insert — we don't have the full populated job yet, so we
    // store a minimal record and replace it after the API responds
    const optimistic = {
      _id: `optimistic_${jobId}`,
      jobId,
      status: "saved",
      notes: "",
      updatedAt: new Date().toISOString(),
      _optimistic: true,
    };
    setApplications((prev) => [optimistic, ...prev]);

    try {
      const created = await apiCreate(jobId, "saved");
      // Replace optimistic record with real one
      setApplications((prev) =>
        prev.map((a) => (a._id === optimistic._id ? created : a)),
      );
      return created;
    } catch (err) {
      // Roll back
      setApplications((prev) => prev.filter((a) => a._id !== optimistic._id));
      throw err;
    }
  }

  // ── Unsave ─────────────────────────────────────────────────────────────────
  async function unsaveJob(jobId) {
    const existing = getByJobId(jobId);
    if (!existing) return;

    // Optimistic remove
    setApplications((prev) => prev.filter((a) => a._id !== existing._id));
    try {
      await apiDelete(existing._id);
    } catch {
      setApplications((prev) => [existing, ...prev]); // rollback
    }
  }

  // ── Idempotent apply ───────────────────────────────────────────────────────
  // This is the key Day 13–14 requirement:
  // If already saved → PATCH to applied
  // If not tracked yet → create with status applied
  // Never creates duplicates
  async function applyJob(jobId) {
    const existing = getByJobId(jobId);

    if (existing) {
      if (existing.status !== "saved") return existing; // already applied/interview/etc

      // Optimistic status update
      const updated = {
        ...existing,
        status: "applied",
        updatedAt: new Date().toISOString(),
      };
      setApplications((prev) =>
        prev.map((a) => (a._id === existing._id ? updated : a)),
      );

      try {
        const result = await apiUpdate(existing._id, { status: "applied" });
        setApplications((prev) =>
          prev.map((a) => (a._id === existing._id ? result : a)),
        );
        return result;
      } catch {
        // Rollback
        setApplications((prev) =>
          prev.map((a) => (a._id === existing._id ? existing : a)),
        );
        throw new Error("Apply failed");
      }
    } else {
      // Not tracked at all — create directly as applied
      const optimistic = {
        _id: `optimistic_${jobId}`,
        jobId,
        status: "applied",
        notes: "",
        updatedAt: new Date().toISOString(),
        _optimistic: true,
      };
      setApplications((prev) => [optimistic, ...prev]);

      try {
        const created = await apiCreate(jobId, "applied");
        setApplications((prev) =>
          prev.map((a) => (a._id === optimistic._id ? created : a)),
        );
        return created;
      } catch {
        setApplications((prev) => prev.filter((a) => a._id !== optimistic._id));
        throw new Error("Apply failed");
      }
    }
  }

  // ── Status change (used by Tracker) ───────────────────────────────────────
  async function changeStatus(applicationId, status) {
    const existing = applications.find((a) => a._id === applicationId);
    if (!existing) return;

    const updated = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };
    setApplications((prev) =>
      prev.map((a) => (a._id === applicationId ? updated : a)),
    );

    try {
      const result = await apiUpdate(applicationId, { status });
      setApplications((prev) =>
        prev.map((a) => (a._id === applicationId ? result : a)),
      );
    } catch {
      setApplications((prev) =>
        prev.map((a) => (a._id === applicationId ? existing : a)),
      );
    }
  }

  // ── Save notes (used by Tracker) ───────────────────────────────────────────
  async function saveNotes(applicationId, notes) {
    const existing = applications.find((a) => a._id === applicationId);
    if (!existing) return;

    setApplications((prev) =>
      prev.map((a) => (a._id === applicationId ? { ...a, notes } : a)),
    );
    try {
      await apiUpdate(applicationId, { notes });
    } catch {
      setApplications((prev) =>
        prev.map((a) => (a._id === applicationId ? existing : a)),
      );
    }
  }

  // ── Delete (used by Tracker) ───────────────────────────────────────────────
  async function removeApplication(applicationId) {
    const existing = applications.find((a) => a._id === applicationId);
    setApplications((prev) => prev.filter((a) => a._id !== applicationId));
    try {
      await apiDelete(applicationId);
    } catch {
      setApplications((prev) => [existing, ...prev]);
    }
  }

  return (
    <ApplicationsContext.Provider
      value={{
        applications,
        loading,
        synced,
        reload: load,
        getByJobId,
        isSaved,
        isApplied,
        saveJob,
        unsaveJob,
        applyJob,
        changeStatus,
        saveNotes,
        removeApplication,
      }}
    >
      {children}
    </ApplicationsContext.Provider>
  );
}

export const useApplications = () => useContext(ApplicationsContext);
