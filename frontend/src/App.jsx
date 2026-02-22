import { useState, useEffect, useCallback } from "react";
import { getProjects, createProject, deleteProject } from "./api";
import ProjectList from "./components/ProjectList";
import ProjectDetail from "./components/ProjectDetail";
import CreateProjectModal from "./components/CreateProjectModal";

export default function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = async (name, reminder) => {
    const project = await createProject(name, reminder);
    setProjects((prev) => [project, ...prev]);
    setShowCreate(false);
  };

  const handleDelete = async (projectId) => {
    if (!confirm("Delete this project and all its tasks?")) return;
    await deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.projectId !== projectId));
    if (selectedProject?.projectId === projectId) setSelectedProject(null);
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setError(null);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          {selectedProject && (
            <button className="back-btn" onClick={() => setSelectedProject(null)}>
              ← Projects
            </button>
          )}
          <h1>{selectedProject ? selectedProject.name : "Chunked"}</h1>
        </div>
        {!selectedProject && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Project
          </button>
        )}
      </header>

      {error && <div className="error-msg">{error}</div>}

      {selectedProject ? (
        <ProjectDetail
          project={selectedProject}
          onProjectUpdated={(updated) => setSelectedProject(updated)}
        />
      ) : (
        <ProjectList
          projects={projects}
          loading={loading}
          onSelect={handleSelectProject}
          onDelete={handleDelete}
          onNewProject={() => setShowCreate(true)}
        />
      )}

      {showCreate && (
        <CreateProjectModal
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
