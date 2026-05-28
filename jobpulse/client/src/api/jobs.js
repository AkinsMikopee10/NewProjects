import client from "./client";

export const fetchJobs = (params = {}) =>
  client.get("/jobs", { params }).then((r) => r.data);

export const fetchJob = (id) => client.get(`/jobs/${id}`).then((r) => r.data);

export const fetchRecentCount = (since) =>
  client.get("/jobs/count/recent", { params: { since } }).then((r) => r.data);

export const incrementView = (id) =>
  client.patch(`/jobs/${id}/view`).then((r) => r.data);

export const incrementApply = (id) =>
  client.patch(`/jobs/${id}/apply`).then((r) => r.data);
