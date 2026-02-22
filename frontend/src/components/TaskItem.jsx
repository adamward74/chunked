import { useState } from "react";
import { generateBreakdown, toggleChunk, deleteTask } from "../api";

export default function TaskItem({ task, reminder, onTaskUpdated, onTaskDeleted }) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [localTask, setLocalTask] = useState(task);

  const chunks = localTask.chunks || [];
  const completedCount = chunks.filter((c) => c.completed).length;
  const allDone = chunks.length > 0 && completedCount === chunks.length;

  const handleGenerate = async (e) => {
    e.stopPropagation();
    try {
      setGenerating(true);
      setError(null);
      setExpanded(true);
      const updated = await generateBreakdown(localTask.taskId);
      setLocalTask(updated);
      onTaskUpdated(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = async (chunkId, completed) => {
    try {
      const updated = await toggleChunk(localTask.taskId, chunkId, completed);
      setLocalTask(updated);
      onTaskUpdated(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete task "${localTask.name}"?`)) return;
    try {
      await deleteTask(localTask.taskId);
      onTaskDeleted(localTask.taskId);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="task-item">
      <div className="task-header" onClick={() => setExpanded((v) => !v)}>
        <span className={`task-toggle ${expanded ? "open" : ""}`}>▶</span>
        <span className="task-name">{localTask.name}</span>
        {chunks.length > 0 && (
          <span className={`task-progress ${allDone ? "done" : ""}`}>
            {allDone ? "✓ Done" : `${completedCount}/${chunks.length}`}
          </span>
        )}
        <button className="btn btn-danger" onClick={handleDelete}>
          ✕
        </button>
      </div>

      {expanded && (
        <div className="task-body">
          {error && <div className="error-msg">{error}</div>}

          {/* Reminder pill */}
          <div className="reminder-pill">
            💡 {reminder}
          </div>

          {chunks.length === 0 ? (
            <button
              className="btn btn-ai"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <><span className="spinner" /> Breaking into 20-min chunks...</>
              ) : (
                <>✨ Generate 20-min plan</>
              )}
            </button>
          ) : (
            <div className="chunk-list">
              {chunks.map((chunk) => (
                <div
                  key={chunk.chunkId}
                  className={`chunk-item ${chunk.completed ? "completed" : ""}`}
                >
                  <span className="chunk-number">{chunk.order}.</span>
                  <input
                    type="checkbox"
                    className="chunk-checkbox"
                    checked={chunk.completed}
                    onChange={(e) => handleToggle(chunk.chunkId, e.target.checked)}
                  />
                  <div className="chunk-content">
                    <div className="chunk-title">{chunk.title}</div>
                    <div className="chunk-description">{chunk.description}</div>
                  </div>
                </div>
              ))}

              {/* Regenerate option */}
              <button
                className="btn btn-ghost"
                style={{ marginTop: "8px", fontSize: "0.8rem", padding: "6px 12px" }}
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? <><span className="spinner" /> Regenerating...</> : "↻ Regenerate plan"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
