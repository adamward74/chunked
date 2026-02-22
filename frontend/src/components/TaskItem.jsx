import { useState } from "react";
import { generateBreakdown, toggleChunk, deleteTask, updateTask, addChunk, updateChunk, deleteChunk } from "../api";

export default function TaskItem({ task, reminder, onTaskUpdated, onTaskDeleted }) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [localTask, setLocalTask] = useState(task);

  // Task name editing
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(task.name);

  // Chunk editing
  const [editingChunkId, setEditingChunkId] = useState(null);
  const [chunkEdits, setChunkEdits] = useState({ title: "", description: "" });

  // Add chunk form
  const [addingChunk, setAddingChunk] = useState(false);
  const [newChunkTitle, setNewChunkTitle] = useState("");
  const [newChunkDesc, setNewChunkDesc] = useState("");

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

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    try {
      const updated = await updateTask(localTask.taskId, trimmed);
      setLocalTask(updated);
      onTaskUpdated(updated);
      setEditingName(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveChunk = async (chunkId) => {
    try {
      const updated = await updateChunk(localTask.taskId, chunkId, chunkEdits);
      setLocalTask(updated);
      onTaskUpdated(updated);
      setEditingChunkId(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteChunk = async (chunkId) => {
    if (!confirm("Delete this step?")) return;
    try {
      const updated = await deleteChunk(localTask.taskId, chunkId);
      setLocalTask(updated);
      onTaskUpdated(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddChunk = async () => {
    const trimmed = newChunkTitle.trim();
    if (!trimmed) return;
    try {
      const updated = await addChunk(localTask.taskId, trimmed, newChunkDesc.trim());
      setLocalTask(updated);
      onTaskUpdated(updated);
      setAddingChunk(false);
      setNewChunkTitle("");
      setNewChunkDesc("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="task-item">
      <div className="task-header" onClick={() => !editingName && setExpanded((v) => !v)}>
        <span className={`task-toggle ${expanded ? "open" : ""}`}>▶</span>

        {editingName ? (
          <>
            <input
              className="task-name-input"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.stopPropagation(); handleSaveName(); }
                if (e.key === "Escape") { e.stopPropagation(); setEditingName(false); }
              }}
              autoFocus
            />
            <button
              className="btn-icon btn-icon-confirm"
              title="Save"
              onClick={(e) => { e.stopPropagation(); handleSaveName(); }}
            >✓</button>
            <button
              className="btn-icon btn-icon-cancel"
              title="Cancel"
              onClick={(e) => { e.stopPropagation(); setEditingName(false); }}
            >✕</button>
          </>
        ) : (
          <>
            <span className="task-name">{localTask.name}</span>
            <button
              className="btn-icon btn-icon-edit"
              title="Edit name"
              onClick={(e) => { e.stopPropagation(); setNameInput(localTask.name); setEditingName(true); }}
            >✎</button>
          </>
        )}

        {chunks.length > 0 && !editingName && (
          <span className={`task-progress ${allDone ? "done" : ""}`}>
            {allDone ? "✓ Done" : `${completedCount}/${chunks.length}`}
          </span>
        )}
        <button className="btn btn-danger" onClick={handleDelete}>✕</button>
      </div>

      {expanded && (
        <div className="task-body">
          {error && <div className="error-msg">{error}</div>}

          <div className="reminder-pill">💡 {reminder}</div>

          {chunks.length === 0 ? (
            addingChunk ? (
              <div className="add-chunk-form">
                <input
                  className="chunk-edit-title"
                  value={newChunkTitle}
                  onChange={(e) => setNewChunkTitle(e.target.value)}
                  placeholder="Step title"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddChunk();
                    if (e.key === "Escape") setAddingChunk(false);
                  }}
                />
                <textarea
                  className="chunk-edit-desc"
                  value={newChunkDesc}
                  onChange={(e) => setNewChunkDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                />
                <div className="chunk-edit-actions">
                  <button className="btn btn-primary" style={{ padding: "5px 12px", fontSize: "0.8rem" }} onClick={handleAddChunk}>Add</button>
                  <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: "0.8rem" }} onClick={() => { setAddingChunk(false); setNewChunkTitle(""); setNewChunkDesc(""); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <button className="btn btn-ai" onClick={handleGenerate} disabled={generating}>
                  {generating ? (
                    <><span className="spinner" /> Breaking into 20-min chunks...</>
                  ) : (
                    <>✨ Generate 20-min plan</>
                  )}
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ marginTop: "8px", width: "100%", justifyContent: "center" }}
                  onClick={() => setAddingChunk(true)}
                >
                  + Add step manually
                </button>
              </>
            )
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
                    disabled={editingChunkId === chunk.chunkId}
                  />
                  {editingChunkId === chunk.chunkId ? (
                    <div className="chunk-edit-form">
                      <input
                        className="chunk-edit-title"
                        value={chunkEdits.title}
                        onChange={(e) => setChunkEdits((p) => ({ ...p, title: e.target.value }))}
                        placeholder="Step title"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Escape") setEditingChunkId(null); }}
                      />
                      <textarea
                        className="chunk-edit-desc"
                        value={chunkEdits.description}
                        onChange={(e) => setChunkEdits((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Description (optional)"
                        rows={2}
                      />
                      <div className="chunk-edit-actions">
                        <button className="btn btn-primary" style={{ padding: "5px 12px", fontSize: "0.8rem" }} onClick={() => handleSaveChunk(chunk.chunkId)}>Save</button>
                        <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: "0.8rem" }} onClick={() => setEditingChunkId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="chunk-content">
                      <div className="chunk-title">{chunk.title}</div>
                      <div className="chunk-description">{chunk.description}</div>
                    </div>
                  )}
                  {editingChunkId !== chunk.chunkId && (
                    <div className="chunk-actions">
                      <button
                        className="btn-icon btn-icon-edit"
                        title="Edit step"
                        onClick={() => { setEditingChunkId(chunk.chunkId); setChunkEdits({ title: chunk.title, description: chunk.description || "" }); }}
                      >✎</button>
                      <button
                        className="btn-icon btn-icon-delete"
                        title="Delete step"
                        onClick={() => handleDeleteChunk(chunk.chunkId)}
                      >✕</button>
                    </div>
                  )}
                </div>
              ))}

              {addingChunk ? (
                <div className="add-chunk-form">
                  <input
                    className="chunk-edit-title"
                    value={newChunkTitle}
                    onChange={(e) => setNewChunkTitle(e.target.value)}
                    placeholder="Step title"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddChunk();
                      if (e.key === "Escape") setAddingChunk(false);
                    }}
                  />
                  <textarea
                    className="chunk-edit-desc"
                    value={newChunkDesc}
                    onChange={(e) => setNewChunkDesc(e.target.value)}
                    placeholder="Description (optional)"
                    rows={2}
                  />
                  <div className="chunk-edit-actions">
                    <button className="btn btn-primary" style={{ padding: "5px 12px", fontSize: "0.8rem" }} onClick={handleAddChunk}>Add</button>
                    <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: "0.8rem" }} onClick={() => { setAddingChunk(false); setNewChunkTitle(""); setNewChunkDesc(""); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="chunk-list-footer">
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                    onClick={() => setAddingChunk(true)}
                  >+ Add step</button>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: "0.8rem", padding: "6px 12px" }}
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
      )}
    </div>
  );
}
