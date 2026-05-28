import client from "./client";

// Upsert seen=true for a job
export const markSeen = (jobId) =>
  client.post("/meta", { jobId }).then((r) => r.data);

export const fetchMeta = (jobIds) =>
  client
    .get("/meta", { params: { jobIds: jobIds.join(",") } })
    .then((r) => r.data);
