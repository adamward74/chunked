import { useState } from "react";

export default function CreateProjectModal({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [reminder, setReminder] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !reminder.trim()) return;
    try {
      setSaving(true);
      setError(null);
      await onSave(name.trim(), reminder.trim());
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New Project</h2>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="proj-name">Project name</label>
            <input
              id="proj-name"
              type="text"
              placeholder="e.g. Latrobe St Renovation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="proj-reminder">
              Reminder — why does this project matter?
            </label>
            <textarea
              id="proj-reminder"
              rows={3}
              placeholder="e.g. This will give us a functional, comfortable home we're proud of"
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>
              This reminder will appear while you work through tasks.
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
              disabled={saving || !name.trim() || !reminder.trim()}
            >
              {saving ? <><span className="spinner" /> Saving...</> : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
