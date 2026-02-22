const BASE = import.meta.env.VITE_API_URL;

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

const json = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const getProjects = () =>
  fetch(`${BASE}/projects`).then(handle);

export const createProject = (name, reminder) =>
  fetch(`${BASE}/projects`, json("POST", { name, reminder })).then(handle);

export const deleteProject = (projectId) =>
  fetch(`${BASE}/projects/${projectId}`, { method: "DELETE" }).then(handle);

export const getTasks = (projectId) =>
  fetch(`${BASE}/projects/${projectId}/tasks`).then(handle);

export const createTask = (projectId, name) =>
  fetch(`${BASE}/projects/${projectId}/tasks`, json("POST", { name })).then(handle);

export const deleteTask = (taskId) =>
  fetch(`${BASE}/tasks/${taskId}`, { method: "DELETE" }).then(handle);

export const generateBreakdown = (taskId) =>
  fetch(`${BASE}/tasks/${taskId}/breakdown`, { method: "POST" }).then(handle);

export const toggleChunk = (taskId, chunkId, completed) =>
  fetch(
    `${BASE}/tasks/${taskId}/chunks/${chunkId}`,
    json("PATCH", { completed })
  ).then(handle);
