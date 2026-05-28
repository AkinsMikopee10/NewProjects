import client from "./client";

export const register = (email, password) =>
  client.post("/auth/register", { email, password }).then((r) => r.data);

export const login = (email, password) =>
  client.post("/auth/login", { email, password }).then((r) => r.data);

export const getMe = () => client.get("/auth/me").then((r) => r.data);

export const updateLastCheckedAt = () =>
  client.patch("/auth/me/lastCheckedAt").then((r) => r.data);
