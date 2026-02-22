import { useState } from "react";

export default function AddTaskModal({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSaving(true);
      setError(null);
      await onSave(name.trim());
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Task</h2>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="task-name">What needs to be done?</label>
            <input
              id="task-name"
              type="text"
              placeholder="e.g. Tile the bathroom floor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>
              Keep it broad — AI will break it into 20-min chunks for you.
            </span>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !name.trim()}
            >
              {saving ? <><span className="spinner" /> Saving...</> : "Add Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
