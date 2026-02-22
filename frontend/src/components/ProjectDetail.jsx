import { useState, useEffect, useCallback } from "react";
import { getTasks, createTask } from "../api";
import TaskItem from "./TaskItem";
import AddTaskModal from "./AddTaskModal";

export default function ProjectDetail({ project }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [error, setError] = useState(null);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTasks(project.projectId);
      setTasks(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [project.projectId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleAddTask = async (name) => {
    const task = await createTask(project.projectId, name);
    setTasks((prev) => [...prev, task]);
    setShowAddTask(false);
  };

  const handleTaskUpdated = (updated) => {
    setTasks((prev) =>
      prev.map((t) => (t.taskId === updated.taskId ? updated : t))
    );
  };

  const handleTaskDeleted = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
  };

  const completedTasks = tasks.filter(
    (t) => t.chunks.length > 0 && t.chunks.every((c) => c.completed)
  ).length;

  return (
    <div>
      {/* Project reminder banner */}
      <div className="project-banner">
        <h2>{project.name}</h2>
        <div className="reminder-label">Your reminder</div>
        <div className="reminder-text">"{project.reminder}"</div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="tasks-header">
        <h3>
          Tasks{" "}
          {tasks.length > 0 && (
            <span style={{ color: "var(--gray-400)", fontWeight: 400 }}>
              ({completedTasks}/{tasks.length} complete)
            </span>
          )}
        </h3>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddTask(true)}
        >
          + Add Task
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ margin: "0 auto" }} />
          <p>Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: "2rem" }}>📋</div>
          <p>No tasks yet. Add your first task to get started.</p>
          <button
            className="btn btn-primary"
            style={{ margin: "16px auto 0", display: "flex" }}
            onClick={() => setShowAddTask(true)}
          >
            + Add Task
          </button>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <TaskItem
              key={task.taskId}
              task={task}
              reminder={project.reminder}
              onTaskUpdated={handleTaskUpdated}
              onTaskDeleted={handleTaskDeleted}
            />
          ))}
        </div>
      )}

      {showAddTask && (
        <AddTaskModal
          onSave={handleAddTask}
          onClose={() => setShowAddTask(false)}
        />
      )}
    </div>
  );
}
