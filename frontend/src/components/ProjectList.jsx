export default function ProjectList({ projects, loading, onSelect, onDelete, onNewProject }) {
  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" style={{ margin: "0 auto" }} />
        <p>Loading projects...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: "2.5rem" }}>🗂️</div>
        <p>No projects yet.</p>
        <button
          className="btn btn-primary"
          style={{ margin: "16px auto 0", display: "flex" }}
          onClick={onNewProject}
        >
          + Create your first project
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="projects-header">
        <h2>{projects.length} project{projects.length !== 1 ? "s" : ""}</h2>
      </div>
      <div className="project-grid">
        {projects.map((p) => (
          <div
            key={p.projectId}
            className="project-card"
            onClick={() => onSelect(p)}
          >
            <h3>{p.name}</h3>
            <p className="reminder">"{p.reminder}"</p>
            <div className="meta">
              <span className="task-count">Click to open</span>
              <button
                className="btn btn-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(p.projectId);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
