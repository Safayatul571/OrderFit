import { useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  UserRound,
  ShieldCheck,
} from "lucide-react";

type Worker = {
  id: string;
  employee_code: string;
  name: string;
  phone: string;
  address: string;
  designation: string;
  department: string;
  skills: string;
  joining_date: string;
  status: string;
  notes: string;
  created_at: string;
};

const emptyForm = {
  employeeCode: "",
  name: "",
  phone: "",
  address: "",
  designation: "",
  department: "",
  skills: "",
  joiningDate: "",
  status: "Active",
  notes: "",
};

type WorkerStatus = "All" | "Active" | "Inactive" | "On Leave";

export default function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkerStatus>("All");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await invoke<Worker[]>("list_workers");
      setWorkers(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkers();
  }, []);

  const filteredWorkers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return workers.filter((worker) => {
      const matchesSearch = [
        worker.employee_code,
        worker.name,
        worker.phone,
        worker.address,
        worker.designation,
        worker.department,
        worker.skills,
      ].some((value) => value.toLowerCase().includes(search));

      const matchesStatus =
        statusFilter === "All" || worker.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [workers, query, statusFilter]);

  const activeCount = workers.filter((worker) => worker.status === "Active").length;
  const inactiveCount = workers.filter((worker) => worker.status === "Inactive").length;
  const leaveCount = workers.filter((worker) => worker.status === "On Leave").length;

  const departmentStats = useMemo(() => {
    const counts = workers.reduce<Record<string, number>>((result, worker) => {
      const department = worker.department.trim() || "Unassigned";
      result[department] = (result[department] || 0) + 1;
      return result;
    }, {});

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [workers]);

  const openCreateModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (worker: Worker) => {
    setEditing(worker);

    setForm({
      employeeCode: worker.employee_code,
      name: worker.name,
      phone: worker.phone,
      address: worker.address,
      designation: worker.designation,
      department: worker.department,
      skills: worker.skills,
      joiningDate: worker.joining_date,
      status: worker.status,
      notes: worker.notes,
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const saveWorker = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.employeeCode.trim()) {
      setError("Employee ID is required.");
      return;
    }

    if (!form.name.trim()) {
      setError("Worker name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        employeeCode: form.employeeCode.trim(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        designation: form.designation.trim(),
        department: form.department.trim(),
        skills: form.skills.trim(),
        joiningDate: form.joiningDate,
        status: form.status,
        notes: form.notes.trim(),
      };

      if (editing) {
        await invoke("update_worker", {
          id: editing.id,
          ...payload,
        });

        setSuccess("Worker updated successfully.");
      } else {
        await invoke("create_worker", payload);

        setSuccess("Worker added successfully.");
      }

      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);

      await loadWorkers();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteWorker = async (worker: Worker) => {
    const confirmed = window.confirm(
      `Delete worker "${worker.name}" (${worker.employee_code})? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await invoke("delete_worker", {
        id: worker.id,
      });

      setSuccess("Worker deleted successfully.");

      await loadWorkers();
    } catch (err) {
      setError(String(err));
    }
  };

  const updateForm = (field: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <div className="materials-module workers-module">
      <div className="materials-header">
        <div>
          <h2>Workforce overview</h2>
          <p>
            Manage employee records, departments, skills and workforce status.
          </p>
        </div>

        <div className="materials-header-actions">
          <button
            className="button button-secondary"
            onClick={() => void loadWorkers()}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>

          <button
            className="button button-primary"
            onClick={openCreateModal}
          >
            <Plus size={16} />
            Add worker
          </button>
        </div>
      </div>

      <div className="materials-metrics">
        <div className="materials-metric">
          <div className="materials-metric-icon violet">
            <Users size={18} />
          </div>
          <span>Total workforce</span>
          <strong>{workers.length}</strong>
          <small>Registered employees</small>
        </div>

        <div className="materials-metric">
          <div className="materials-metric-icon green">
            <ShieldCheck size={18} />
          </div>
          <span>Active workers</span>
          <strong>{activeCount}</strong>
          <small>Currently active employees</small>
        </div>

        <div className="materials-metric">
          <div className="materials-metric-icon orange">
            <CalendarDays size={18} />
          </div>
          <span>On leave</span>
          <strong>{leaveCount}</strong>
          <small>Employees currently on leave</small>
        </div>

        <div className="materials-metric">
          <div className="materials-metric-icon red">
            <UserRound size={18} />
          </div>
          <span>Inactive workers</span>
          <strong>{inactiveCount}</strong>
          <small>Inactive employee records</small>
        </div>
      </div>

      {error && !showModal && (
        <div className="materials-message error">
          <AlertTriangle size={15} />
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X size={14} />
          </button>
        </div>
      )}

      {success && (
        <div className="materials-message success">
          <CheckCircle2 size={15} />
          <span>{success}</span>
          <button onClick={() => setSuccess("")}>
            <X size={14} />
          </button>
        </div>
      )}

      <section className="panel materials-list-panel">
        <div className="materials-list-heading">
          <div>
            <h2>Employee directory</h2>
            <p>View and manage your registered workforce.</p>
          </div>

          <span className="materials-record-count">
            {filteredWorkers.length} records
          </span>
        </div>

        <div className="materials-toolbar workers-toolbar">
          <div className="materials-search">
            <Search size={15} />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by employee ID, name, phone, department or skill..."
            />
          </div>

          <select
            className="workers-status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as WorkerStatus)
            }
          >
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On Leave">On Leave</option>
          </select>
        </div>

        {loading ? (
          <div className="materials-loading">
            <RefreshCw size={18} className="production-spinning" />
            Loading workers...
          </div>
        ) : (
          <div className="table-wrap materials-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>DESIGNATION / DEPARTMENT</th>
                  <th>PHONE</th>
                  <th>JOINING DATE</th>
                  <th>SKILLS</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      {workers.length === 0
                        ? "No workers added yet. Add your first employee to get started."
                        : "No workers match your search or selected filter."}
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map((worker) => (
                    <tr key={worker.id}>
                      <td>
                        <div className="materials-name-cell">
                          <span className="materials-row-icon">
                            <UserRound size={15} />
                          </span>
                          <div className="workers-employee-cell">
                            <strong>{worker.name}</strong>
                            <small>{worker.employee_code}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="workers-detail-cell">
                          <strong>{worker.designation || "—"}</strong>
                          <small>{worker.department || "No department"}</small>
                        </div>
                      </td>

                      <td>{worker.phone || "—"}</td>

                      <td>{worker.joining_date || "—"}</td>

                      <td>
                        <span
                          className="workers-skills-cell"
                          title={worker.skills}
                        >
                          {worker.skills || "—"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`workers-status-pill ${worker.status
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        >
                          <i />
                          {worker.status}
                        </span>
                      </td>

                      <td>
                        <div className="materials-actions">
                          <button
                            className="more-button"
                            title="Edit worker"
                            onClick={() => openEditModal(worker)}
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            className="more-button materials-delete"
                            title="Delete worker"
                            onClick={() => void deleteWorker(worker)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="workers-insights-grid">
        <article className="panel workers-insight-panel">
          <div className="workers-insight-heading">
            <div>
              <h2>Department distribution</h2>
              <p>Workforce allocation across departments.</p>
            </div>
            <span className="workers-insight-icon">
              <Users size={18} />
            </span>
          </div>

          {departmentStats.length === 0 ? (
            <div className="workers-insight-empty">
              Add employees with department details to see the distribution.
            </div>
          ) : (
            <div className="workers-department-list">
              {departmentStats.slice(0, 6).map(([department, count]) => (
                <div className="workers-department-item" key={department}>
                  <div className="workers-insight-label">
                    <strong>{department}</strong>
                    <span>{count} {count === 1 ? "worker" : "workers"}</span>
                  </div>
                  <div className="workers-progress-track">
                    <div
                      className="workers-progress-fill department-fill"
                      style={{
                        width: `${(count / workers.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel workers-insight-panel">
          <div className="workers-insight-heading">
            <div>
              <h2>Workforce status</h2>
              <p>Current employee status breakdown.</p>
            </div>
            <span className="workers-insight-icon status-icon">
              <ShieldCheck size={18} />
            </span>
          </div>

          {workers.length === 0 ? (
            <div className="workers-insight-empty">
              Workforce status information will appear when employees are added.
            </div>
          ) : (
            <div className="workers-status-list">
              <div className="workers-status-item">
                <div className="workers-insight-label">
                  <span><i className="status-dot active-dot" /> Active</span>
                  <strong>{activeCount} ({Math.round((activeCount / workers.length) * 100)}%)</strong>
                </div>
                <div className="workers-progress-track">
                  <div
                    className="workers-progress-fill active-fill"
                    style={{ width: `${(activeCount / workers.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="workers-status-item">
                <div className="workers-insight-label">
                  <span><i className="status-dot leave-dot" /> On Leave</span>
                  <strong>{leaveCount} ({Math.round((leaveCount / workers.length) * 100)}%)</strong>
                </div>
                <div className="workers-progress-track">
                  <div
                    className="workers-progress-fill leave-fill"
                    style={{ width: `${(leaveCount / workers.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="workers-status-item">
                <div className="workers-insight-label">
                  <span><i className="status-dot inactive-dot" /> Inactive</span>
                  <strong>{inactiveCount} ({Math.round((inactiveCount / workers.length) * 100)}%)</strong>
                </div>
                <div className="workers-progress-track">
                  <div
                    className="workers-progress-fill inactive-fill"
                    style={{ width: `${(inactiveCount / workers.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="workers-status-total">
            <span>Total registered workforce</span>
            <strong>{workers.length}</strong>
          </div>
        </article>
      </section>

      {showModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowModal(false);
            }
          }}
        >
          <form
            className="create-modal materials-modal workers-modal"
            onSubmit={saveWorker}
          >
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">WORKFORCE MANAGEMENT</span>

                <h2>
                  {editing ? "Edit worker" : "Add new worker"}
                </h2>

                <p>Enter the employee information below.</p>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>

            <div className="materials-form-grid">
              <label>
                Employee ID *
                <input
                  required
                  value={form.employeeCode}
                  onChange={(event) =>
                    updateForm("employeeCode", event.target.value)
                  }
                  placeholder="e.g. EMP-001"
                />
              </label>

              <label>
                Full name *
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    updateForm("name", event.target.value)
                  }
                  placeholder="Employee full name"
                />
              </label>

              <label>
                Phone number
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    updateForm("phone", event.target.value)
                  }
                  placeholder="e.g. 017XXXXXXXX"
                />
              </label>

              <label>
                Designation
                <input
                  value={form.designation}
                  onChange={(event) =>
                    updateForm("designation", event.target.value)
                  }
                  placeholder="e.g. Sewing Operator"
                />
              </label>

              <label>
                Department
                <input
                  value={form.department}
                  onChange={(event) =>
                    updateForm("department", event.target.value)
                  }
                  placeholder="e.g. Sewing"
                />
              </label>

              <label>
                Joining date
                <input
                  type="date"
                  value={form.joiningDate}
                  onChange={(event) =>
                    updateForm("joiningDate", event.target.value)
                  }
                />
              </label>

              <label className="materials-form-full">
                Skills
                <input
                  value={form.skills}
                  onChange={(event) =>
                    updateForm("skills", event.target.value)
                  }
                  placeholder="e.g. Cutting, Sewing, Quality Inspection"
                />
              </label>

              <label className="materials-form-full">
                Address
                <input
                  value={form.address}
                  onChange={(event) =>
                    updateForm("address", event.target.value)
                  }
                  placeholder="Employee address"
                />
              </label>

              <label>
                Employment status
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateForm("status", event.target.value)
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </label>

              <label className="materials-form-full">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    updateForm("notes", event.target.value)
                  }
                  placeholder="Optional employee details..."
                  rows={3}
                />
              </label>
            </div>

            {error && (
              <div className="materials-message error" role="alert">
                <AlertTriangle size={15} />
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError("")}
                  aria-label="Dismiss error"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="button button-primary"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Add worker"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
