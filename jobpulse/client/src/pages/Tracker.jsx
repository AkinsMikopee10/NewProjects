import { useState } from "react";
import { useApplications } from "../context/ApplicationsContext";
import BottomNav from "../components/BottomNav";
import DesktopNav from "../components/DesktopNav";

export default function Tracker() {
  // All data comes from context — already loaded, already synced
  const { applications, loading, changeStatus, saveNotes, removeApplication } =
    useApplications();

  const [view, setView] = useState("kanban");
  const [notesApp, setNotesApp] = useState(null);

  // No useEffect fetch needed — context loads on mount in App.jsx

  const total = applications.length;
  const stats = COLUMNS.map((col) => ({
    ...col,
    count: applications.filter((a) => a.status === col.status).length,
  }));

  // Handler wrappers — context already handles optimistic updates + rollback
  async function handleStatusChange(id, status) {
    await changeStatus(id, status);
  }

  async function handleSaveNotes(id, notes) {
    await saveNotes(id, notes);
  }

  async function handleDelete(id) {
    await removeApplication(id);
  }

  // The rest of the JSX (topbar, stats strip, kanban, list, notes modal)
  // is identical to what we built in Day 13 — no changes needed there.
  // Just swap out the old load/handleStatusChange/handleDelete functions
  // for these wrappers.
}
