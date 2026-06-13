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
import { useToast } from "./ToastContext";

const ApplicationsContext = createContext(null);

export function ApplicationsProvider({ children }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [synced, setSynced] = useState(false); // has first fetch completed?

  // ── Initial load ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchApplications();
      setApplications(data);
      setSynced(true);
    } catch (err) {
      console.error("[ApplicationsContext] load failed", err);
      setLoadError(true);
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
  }, [user]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getByJobId(jobId) {
    return (
      applications.find(
        (a) => String(a.jobId?._id ?? a.jobId) === String(jobId),
      ) ?? null
    );
  }

  function isSaved(jobId) {
    return !!getByJobId(jobId);
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
      toast({ message: "Job saved", type: "save" });
      return created;
    } catch (err) {
      // Roll back
      setApplications((prev) => prev.filter((a) => a._id !== optimistic._id));
      toast({ message: "Failed to save job", type: "error" });
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
      toast({ message: "Job removed", type: "success" });
    } catch {
      setApplications((prev) => [existing, ...prev]); // rollback
      toast({ message: "Failed to remove job", type: "error" });
    }
  }

  // ── Idempotent apply ───────────────────────────────────────────────────────
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
        toast({ message: "Marked as applied", type: "apply" });
        return result;
      } catch {
        // Rollback
        setApplications((prev) =>
          prev.map((a) => (a._id === existing._id ? existing : a)),
        );
        toast({ message: "Failed to mark as applied", type: "error" });
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
        toast({ message: "Marked as applied", type: "apply" });
        return created;
      } catch {
        setApplications((prev) => prev.filter((a) => a._id !== optimistic._id));
        toast({ message: "Failed to mark as applied", type: "error" });
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
      const col = {
        saved: "Saved",
        applied: "Applied",
        interview: "Interview",
        rejected: "Rejected",
      };
      toast({ message: `Moved to ${col[status]}`, type: "status" });
    } catch {
      setApplications((prev) =>
        prev.map((a) => (a._id === applicationId ? existing : a)),
      );
      toast({ message: "Failed to update status", type: "error" });
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
      toast({ message: "Failed to save notes", type: "error" });
    }
  }

  // ── Delete (used by Tracker) ───────────────────────────────────────────────
  async function removeApplication(applicationId) {
    const existing = applications.find((a) => a._id === applicationId);
    setApplications((prev) => prev.filter((a) => a._id !== applicationId));
    try {
      await apiDelete(applicationId);
      toast({ message: "Application removed", type: "success" });
    } catch {
      setApplications((prev) => [existing, ...prev]);
      toast({ message: "Failed to remove application", type: "error" });
    }
  }

  return (
    <ApplicationsContext.Provider
      value={{
        applications,
        loading,
        synced,
        loadError,
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
