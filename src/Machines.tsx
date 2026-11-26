import { useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Plus, Search, Pencil, Trash2, Wrench, RefreshCw, X,
  CheckCircle2, AlertTriangle, Settings,
  Activity, Clock, ClipboardList, History,
} from "lucide-react";

type Machine = {
  id: string;
  machine_code: string;
  name: string;
  machine_type: string;
  brand: string;
  model: string;
  department: string;
  location: string;
  capacity_per_hour: number;
  capacity_unit: string;
  status: string;
  purchase_date: string;
  last_maintenance_date: string;
  next_maintenance_date: string;
  notes: string;
  created_at: string;
};

type Maintenance = {
  id: string;
  machine_id: string;
  machine_code: string;
  machine_name: string;
  service_date: string;
  maintenance_type: string;
  description: string;
  cost: number;
  next_service_date: string;
  performed_by: string;
  notes: string;
  created_at: string;
};

const emptyForm = {
  machineCode: "",
  name: "",
  machineType: "Sewing Machine",
  brand: "",
  model: "",
  department: "",
  location: "",
  capacityPerHour: "0",
  capacityUnit: "pcs",
  status: "Active",
  purchaseDate: "",
  lastMaintenanceDate: "",
  nextMaintenanceDate: "",
  notes: "",
};

const emptyMaintenanceForm = {
  serviceDate: new Date().toISOString().slice(0, 10),
  maintenanceType: "Routine Service",
  description: "",
  cost: "0",
  nextServiceDate: "",
  performedBy: "",
  notes: "",
};

type MachineFilter = "All" | "Active" | "Idle" | "Maintenance" | "Inactive";

export default function Machines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MachineFilter>("All");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Machine | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [maintenanceMachine, setMaintenanceMachine] = useState<Machine | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<Maintenance[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState("");
  const [maintenanceForm, setMaintenanceForm] = useState(emptyMaintenanceForm);

  const loadMachines = async () => {
    try {
      setLoading(true);
      setError("");
      const result = await invoke<Machine[]>("list_machines");
      setMachines(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMachines();
  }, []);

  const filteredMachines = useMemo(() => {
    const search = query.trim().toLowerCase();

    return machines.filter((machine) => {
      const matchesSearch = [
        machine.machine_code,
        machine.name,
        machine.machine_type,
        machine.brand,
        machine.model,
        machine.department,
        machine.location,
      ].some((value) => value.toLowerCase().includes(search));

      const matchesFilter = filter === "All" || machine.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [machines, query, filter]);

  const activeCount = machines.filter((m) => m.status === "Active").length;
  const idleCount = machines.filter((m) => m.status === "Idle").length;
  const maintenanceCount = machines.filter((m) => m.status === "Maintenance").length;
  const inactiveCount = machines.filter((m) => m.status === "Inactive").length;

  const updateForm = (field: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openCreateModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (machine: Machine) => {
    setEditing(machine);
    setForm({
      machineCode: machine.machine_code,
      name: machine.name,
      machineType: machine.machine_type,
      brand: machine.brand,
      model: machine.model,
      department: machine.department,
      location: machine.location,
      capacityPerHour: String(machine.capacity_per_hour),
      capacityUnit: machine.capacity_unit,
      status: machine.status,
      purchaseDate: machine.purchase_date,
      lastMaintenanceDate: machine.last_maintenance_date,
      nextMaintenanceDate: machine.next_maintenance_date,
      notes: machine.notes,
    });
    setError("");
    setShowModal(true);
  };

  const saveMachine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const capacity = Number(form.capacityPerHour);

    if (!form.machineCode.trim() || !form.name.trim() || !form.machineType.trim()) {
      setError("Machine ID, name and machine type are required.");
      return;
    }

    if (!Number.isFinite(capacity) || capacity < 0) {
      setError("Capacity must be a valid non-negative number.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        machineCode: form.machineCode.trim(),
        name: form.name.trim(),
        machineType: form.machineType.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        department: form.department.trim(),
        location: form.location.trim(),
        capacityPerHour: capacity,
        capacityUnit: form.capacityUnit.trim(),
        status: form.status,
        purchaseDate: form.purchaseDate,
        lastMaintenanceDate: form.lastMaintenanceDate,
        nextMaintenanceDate: form.nextMaintenanceDate,
        notes: form.notes.trim(),
      };

      if (editing) {
        await invoke("update_machine", { id: editing.id, ...payload });
        setSuccess("Machine updated successfully.");
      } else {
        await invoke("create_machine", payload);
        setSuccess("Machine added successfully.");
      }

      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      await loadMachines();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteMachine = async (machine: Machine) => {
    const confirmed = window.confirm(
      `Delete machine "${machine.name}" (${machine.machine_code})? Its maintenance history will also be deleted.`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");
      await invoke("delete_machine", { id: machine.id });
      setSuccess("Machine deleted successfully.");
      await loadMachines();
    } catch (err) {
      setError(String(err));
    }
  };

  const loadMaintenance = async (machine: Machine) => {
    try {
      setMaintenanceLoading(true);
      setMaintenanceError("");
      const result = await invoke<Maintenance[]>("list_machine_maintenance", {
        machineId: machine.id,
      });
      setMaintenanceRecords(result);
    } catch (err) {
      setMaintenanceError(String(err));
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const openMaintenance = async (machine: Machine) => {
    setMaintenanceMachine(machine);
    setMaintenanceRecords([]);
    setMaintenanceError("");
    setShowMaintenanceForm(false);
    setMaintenanceForm(emptyMaintenanceForm);
    await loadMaintenance(machine);
  };

  const saveMaintenance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!maintenanceMachine) return;

    const cost = Number(maintenanceForm.cost);

    if (!maintenanceForm.serviceDate || !maintenanceForm.maintenanceType.trim()) {
      setMaintenanceError("Service date and maintenance type are required.");
      return;
    }

    if (!Number.isFinite(cost) || cost < 0) {
      setMaintenanceError("Cost must be a valid non-negative number.");
      return;
    }

    try {
      setMaintenanceSaving(true);
      setMaintenanceError("");

      await invoke("create_machine_maintenance", {
        machineId: maintenanceMachine.id,
        serviceDate: maintenanceForm.serviceDate,
        maintenanceType: maintenanceForm.maintenanceType,
        description: maintenanceForm.description.trim(),
        cost,
        nextServiceDate: maintenanceForm.nextServiceDate,
        performedBy: maintenanceForm.performedBy.trim(),
        notes: maintenanceForm.notes.trim(),
      });

      setSuccess("Maintenance record added successfully.");
      setShowMaintenanceForm(false);
      setMaintenanceForm(emptyMaintenanceForm);

      await Promise.all([
        loadMaintenance(maintenanceMachine),
        loadMachines(),
      ]);

      const refreshed = await invoke<Machine[]>("list_machines");
      const updatedMachine = refreshed.find((m) => m.id === maintenanceMachine.id);
      if (updatedMachine) setMaintenanceMachine(updatedMachine);
    } catch (err) {
      setMaintenanceError(String(err));
    } finally {
      setMaintenanceSaving(false);
    }
  };

  const deleteMaintenance = async (record: Maintenance) => {
    const confirmed = window.confirm(
      `Delete this ${record.maintenance_type} maintenance record?`
    );

    if (!confirmed || !maintenanceMachine) return;

    try {
      setMaintenanceError("");
      await invoke("delete_machine_maintenance", { id: record.id });
      setSuccess("Maintenance record deleted.");
      await Promise.all([
        loadMaintenance(maintenanceMachine),
        loadMachines(),
      ]);

      const refreshed = await invoke<Machine[]>("list_machines");
      const updatedMachine = refreshed.find((m) => m.id === maintenanceMachine.id);
      if (updatedMachine) setMaintenanceMachine(updatedMachine);
    } catch (err) {
      setMaintenanceError(String(err));
    }
  };

  const statusClass = (status: string) => status.toLowerCase();

  return (
    <div className="materials-module machines-module">
      <div className="materials-header">
        <div>
          <h2>Machine overview</h2>
          <p>Manage factory equipment, machine availability and maintenance history.</p>
        </div>

        <div className="materials-header-actions">
          <button className="button button-secondary" onClick={() => void loadMachines()} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="button button-primary" onClick={openCreateModal}>
            <Plus size={16} /> Add machine
          </button>
        </div>
      </div>

      <div className="materials-metrics">
        <div className="materials-metric">
          <div className="materials-metric-icon violet"><Wrench size={18} /></div>
          <span>Total machines</span>
          <strong>{machines.length}</strong>
          <small>Registered equipment</small>
        </div>
        <div className="materials-metric">
          <div className="materials-metric-icon green"><Activity size={18} /></div>
          <span>Active machines</span>
          <strong>{activeCount}</strong>
          <small>Currently operational</small>
        </div>
        <div className="materials-metric">
          <div className="materials-metric-icon orange"><Settings size={18} /></div>
          <span>In maintenance</span>
          <strong>{maintenanceCount}</strong>
          <small>Under service or repair</small>
        </div>
        <div className="materials-metric">
          <div className="materials-metric-icon red"><Clock size={18} /></div>
          <span>Idle / Inactive</span>
          <strong>{idleCount + inactiveCount}</strong>
          <small>{idleCount} idle Â· {inactiveCount} inactive</small>
        </div>
      </div>

      {error && !showModal && (
        <div className="materials-message error">
          <AlertTriangle size={15} />
          <span>{error}</span>
          <button onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}

      {success && (
        <div className="materials-message success">
          <CheckCircle2 size={15} />
          <span>{success}</span>
          <button onClick={() => setSuccess("")}><X size={14} /></button>
        </div>
      )}

      <section className="panel materials-list-panel">
        <div className="materials-list-heading">
          <div>
            <h2>Machine directory</h2>
            <p>View equipment details, operational status and service schedules.</p>
          </div>
          <span className="materials-record-count">{filteredMachines.length} records</span>
        </div>

        <div className="materials-toolbar">
          <div className="materials-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search machine ID, name, type, brand or department..."
            />
          </div>

          <select value={filter} onChange={(event) => setFilter(event.target.value as MachineFilter)}>
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Idle">Idle</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="materials-loading">
            <RefreshCw size={18} className="production-spinning" />
            Loading machines...
          </div>
        ) : (
          <div className="table-wrap materials-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>MACHINE</th>
                  <th>TYPE / BRAND</th>
                  <th>DEPARTMENT</th>
                  <th>CAPACITY / HOUR</th>
                  <th>NEXT SERVICE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredMachines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      {machines.length === 0
                        ? "No machines registered yet. Add your first machine to get started."
                        : "No machines match your search or selected filter."}
                    </td>
                  </tr>
                ) : (
                  filteredMachines.map((machine) => (
                    <tr key={machine.id}>
                      <td>
                        <div className="materials-name-cell">
                          <span className="materials-row-icon"><Wrench size={15} /></span>
                          <div className="machines-detail-cell">
                            <strong>{machine.name}</strong>
                            <small>{machine.machine_code}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="machines-detail-cell">
                          <strong>{machine.machine_type}</strong>
                          <small>{[machine.brand, machine.model].filter(Boolean).join(" Â· ") || "â€”"}</small>
                        </div>
                      </td>
                      <td>{machine.department || "â€”"}</td>
                      <td>{machine.capacity_per_hour} {machine.capacity_unit}</td>
                      <td>{machine.next_maintenance_date || "Not scheduled"}</td>
                      <td>
                        <span className={`machines-status ${statusClass(machine.status)}`}>
                          <i />{machine.status}
                        </span>
                      </td>
                      <td>
                        <div className="materials-actions">
                          <button className="more-button" title="Maintenance history" onClick={() => void openMaintenance(machine)}>
                            <History size={14} />
                          </button>
                          <button className="more-button" title="Edit machine" onClick={() => openEditModal(machine)}>
                            <Pencil size={14} />
                          </button>
                          <button className="more-button materials-delete" title="Delete machine" onClick={() => void deleteMachine(machine)}>
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

      {showModal && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setShowModal(false);
        }}>
          <form className="create-modal materials-modal machines-modal" onSubmit={saveMachine}>
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">MACHINE MANAGEMENT</span>
                <h2>{editing ? "Edit machine" : "Register new machine"}</h2>
                <p>Enter the equipment information below.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setShowModal(false)} disabled={saving}>
                <X size={18} />
              </button>
            </div>

            <div className="materials-form-grid">
              <label>Machine ID *
                <input required value={form.machineCode} onChange={(e) => updateForm("machineCode", e.target.value)} placeholder="e.g. MCH-001" />
              </label>
              <label>Machine name *
                <input required value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="e.g. Industrial Sewing Machine" />
              </label>
              <label>Machine type *
                <select value={form.machineType} onChange={(e) => updateForm("machineType", e.target.value)}>
                  <option>Sewing Machine</option>
                  <option>Cutting Machine</option>
                  <option>Overlock Machine</option>
                  <option>Flatlock Machine</option>
                  <option>Buttonhole Machine</option>
                  <option>Button Attach Machine</option>
                  <option>Ironing Machine</option>
                  <option>Embroidery Machine</option>
                  <option>Finishing Machine</option>
                  <option>Other</option>
                </select>
              </label>
              <label>Brand
                <input value={form.brand} onChange={(e) => updateForm("brand", e.target.value)} placeholder="e.g. Juki" />
              </label>
              <label>Model
                <input value={form.model} onChange={(e) => updateForm("model", e.target.value)} placeholder="Model number" />
              </label>
              <label>Department
                <input value={form.department} onChange={(e) => updateForm("department", e.target.value)} placeholder="e.g. Sewing" />
              </label>
              <label>Location
                <input value={form.location} onChange={(e) => updateForm("location", e.target.value)} placeholder="Floor / Line / Section" />
              </label>
              <label>Capacity per hour
                <input type="number" min="0" step="any" value={form.capacityPerHour} onChange={(e) => updateForm("capacityPerHour", e.target.value)} />
              </label>
              <label>Capacity unit
                <select value={form.capacityUnit} onChange={(e) => updateForm("capacityUnit", e.target.value)}>
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="meters">Meters</option>
                  <option value="units">Units</option>
                </select>
              </label>
              <label>Machine status
                <select value={form.status} onChange={(e) => updateForm("status", e.target.value)}>
                  <option>Active</option><option>Idle</option><option>Maintenance</option><option>Inactive</option>
                </select>
              </label>
              <label>Purchase date
                <input type="date" value={form.purchaseDate} onChange={(e) => updateForm("purchaseDate", e.target.value)} />
              </label>
              <label>Last maintenance date
  <input
    type="date"
    value={form.lastMaintenanceDate}
    disabled={!!editing}
    onChange={(e) => updateForm("lastMaintenanceDate", e.target.value)}
  />
</label>

<label>Next maintenance date
  <input
    type="date"
    value={form.nextMaintenanceDate}
    disabled={!!editing}
    onChange={(e) => updateForm("nextMaintenanceDate", e.target.value)}
  />
</label>
            </div>

            {error && (
              <div className="materials-message error" role="alert">
                <AlertTriangle size={15} /><span>{error}</span>
                <button type="button" onClick={() => setError("")}><X size={14} /></button>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="button button-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save changes" : "Add machine"}
              </button>
            </div>
          </form>
        </div>
      )}

      {maintenanceMachine && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !maintenanceSaving) setMaintenanceMachine(null);
        }}>
          <section className="create-modal materials-modal machines-maintenance-modal">
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">EQUIPMENT SERVICE RECORD</span>
                <h2>{maintenanceMachine.name}</h2>
                <p>{maintenanceMachine.machine_code} Â· {maintenanceMachine.machine_type}</p>
              </div>
              <button className="icon-button" onClick={() => setMaintenanceMachine(null)} disabled={maintenanceSaving}>
                <X size={18} />
              </button>
            </div>

            <div className="machines-maintenance-summary">
              <div><small>Last service</small><strong>{maintenanceMachine.last_maintenance_date || "Not recorded"}</strong></div>
              <div><small>Next service</small><strong>{maintenanceMachine.next_maintenance_date || "Not scheduled"}</strong></div>
              <div><small>Total records</small><strong>{maintenanceRecords.length}</strong></div>
            </div>

            <div className="machines-history-heading">
              <div><h3>Maintenance history</h3><p>Service and repair records for this machine.</p></div>
              <button className="button button-primary" onClick={() => {
                setMaintenanceError("");
                setMaintenanceForm(emptyMaintenanceForm);
                setShowMaintenanceForm((current) => !current);
              }}>
                <Plus size={14} /> Add record
              </button>
            </div>

            {showMaintenanceForm && (
              <form className="machines-maintenance-form" onSubmit={saveMaintenance}>
                <div className="materials-form-grid">
                  <label>Service date *
                    <input required type="date" value={maintenanceForm.serviceDate} onChange={(e) => setMaintenanceForm((f) => ({ ...f, serviceDate: e.target.value }))} />
                  </label>
                  <label>Maintenance type *
                    <select value={maintenanceForm.maintenanceType} onChange={(e) => setMaintenanceForm((f) => ({ ...f, maintenanceType: e.target.value }))}>
                      <option>Routine Service</option><option>Repair</option><option>Inspection</option><option>Parts Replacement</option><option>Emergency Repair</option><option>Other</option>
                    </select>
                  </label>
                  <label>Cost
                    <input type="number" min="0" step="any" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm((f) => ({ ...f, cost: e.target.value }))} />
                  </label>
                  <label>Next service date
                    <input type="date" value={maintenanceForm.nextServiceDate} onChange={(e) => setMaintenanceForm((f) => ({ ...f, nextServiceDate: e.target.value }))} />
                  </label>
                  <label>Performed by
                    <input value={maintenanceForm.performedBy} onChange={(e) => setMaintenanceForm((f) => ({ ...f, performedBy: e.target.value }))} placeholder="Technician name" />
                  </label>
                  <label className="materials-form-full">Description
                    <textarea rows={2} value={maintenanceForm.description} onChange={(e) => setMaintenanceForm((f) => ({ ...f, description: e.target.value }))} placeholder="Work performed..." />
                  </label>
                  {editing && (
                <p className="materials-form-full" style={{ fontSize: 12, opacity: 0.7 }}>
                  Maintenance dates are managed by maintenance history.
                  Add or delete a maintenance record to update these dates.
                </p>
              )}              <label className="materials-form-full">Notes
                    <textarea rows={2} value={maintenanceForm.notes} onChange={(e) => setMaintenanceForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." />
                  </label>
                </div>
                {maintenanceError && (
                  <div className="materials-message error"><AlertTriangle size={15} /><span>{maintenanceError}</span></div>
                )}
                <div className="modal-actions">
                  <button type="button" className="button button-secondary" onClick={() => setShowMaintenanceForm(false)} disabled={maintenanceSaving}>Cancel</button>
                  <button type="submit" className="button button-primary" disabled={maintenanceSaving}>
                    {maintenanceSaving ? "Saving..." : "Save maintenance"}
                  </button>
                </div>
              </form>
            )}

            {maintenanceLoading ? (
              <div className="materials-loading"><RefreshCw size={17} className="production-spinning" /> Loading maintenance records...</div>
            ) : maintenanceRecords.length === 0 ? (
              <div className="machines-empty-history">
                <ClipboardList size={25} />
                <strong>No maintenance records</strong>
                <span>Add a service record to start tracking machine maintenance.</span>
              </div>
            ) : (
              <div className="machines-history-list">
                {maintenanceRecords.map((record) => (
                  <article className="machines-history-item" key={record.id}>
                    <div className="machines-history-icon"><Wrench size={15} /></div>
                    <div className="machines-history-content">
                      <div className="machines-history-title">
                        <strong>{record.maintenance_type}</strong>
                        <span>{record.service_date}</span>
                      </div>
                      <p>{record.description || "No description provided."}</p>
                      <small>
                        {record.performed_by ? `By ${record.performed_by}` : "Technician not specified"}
                        {" Â· "}Cost: {record.cost.toLocaleString()}
                        {record.next_service_date ? ` Â· Next: ${record.next_service_date}` : ""}
                      </small>
                      {record.notes && <small>{record.notes}</small>}
                    </div>
                    <button className="more-button materials-delete" title="Delete record" onClick={() => void deleteMaintenance(record)}>
                      <Trash2 size={14} />
                    </button>
                  </article>
                ))}
              </div>
            )}

            {maintenanceError && !showMaintenanceForm && (
              <div className="materials-message error"><AlertTriangle size={15} /><span>{maintenanceError}</span></div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}