import client from "./client";

export const createApplication = (jobId, status = "saved") =>
  client.post("/applications", { jobId, status }).then((r) => r.data);

export const updateApplication = (id, patch) =>
  client.patch(`/applications/${id}`, patch).then((r) => r.data);

export const fetchApplications = (params = {}) =>
  client.get("/applications", { params }).then((r) => r.data);

export const deleteApplication = (id) =>
  client.delete(`/applications/${id}`).then((r) => r.data);
