import { useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Plus, Search, Pencil, Trash2, Boxes, AlertTriangle,
  Package, RefreshCw, X, CheckCircle2,
} from "lucide-react";

type Material = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  minimum_stock: number;
  current_stock: number;
  notes: string;
  created_at: string;
};

const emptyForm = {
  sku: "",
  name: "",
  category: "Fabric",
  unit: "Meters",
  minimumStock: "0",
  notes: "",
};

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError("");
      const result = await invoke<Material[]>("list_materials");
      setMaterials(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMaterials();
  }, []);

  const getStatus = (material: Material) => {
    if (material.current_stock <= 0) return "Out of Stock";
    if (material.current_stock <= material.minimum_stock) return "Low Stock";
    return "In Stock";
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      const search = query.toLowerCase();
      const matchesQuery =
        material.name.toLowerCase().includes(search) ||
        material.sku.toLowerCase().includes(search) ||
        material.category.toLowerCase().includes(search);

      const matchesFilter =
        filter === "All" || getStatus(material) === filter;

      return matchesQuery && matchesFilter;
    });
  }, [materials, query, filter]);

  const lowStockCount = materials.filter(
    (material) => getStatus(material) === "Low Stock"
  ).length;

  const outOfStockCount = materials.filter(
    (material) => getStatus(material) === "Out of Stock"
  ).length;

  const openCreateModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (material: Material) => {
    setEditing(material);
    setForm({
      sku: material.sku,
      name: material.name,
      category: material.category,
      unit: material.unit,
      minimumStock: String(material.minimum_stock),
      notes: material.notes,
    });
    setError("");
    setShowModal(true);
  };

  const saveMaterial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const minimumStock = Number(form.minimumStock);

    if (!form.sku.trim() || !form.name.trim()) {
      setError("SKU and material name are required.");
      return;
    }

    if (!Number.isFinite(minimumStock) || minimumStock < 0) {
      setError("Minimum stock must be a valid non-negative number.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        minimumStock,
        notes: form.notes.trim(),
      };

      if (editing) {
        await invoke("update_material", {
          id: editing.id,
          ...payload,
        });
        setSuccess("Material updated successfully.");
      } else {
        await invoke("create_material", payload);
        setSuccess("Material created successfully.");
      }

      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      await loadMaterials();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteMaterial = async (material: Material) => {
    const confirmed = window.confirm(
      `Delete ${material.name} (${material.sku})? Materials with transaction history cannot be deleted.`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");
      await invoke("delete_material", { id: material.id });
      setSuccess("Material deleted successfully.");
      await loadMaterials();
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="materials-module">
      <div className="materials-header">
        <div>
          <h2>Inventory overview</h2>
          <p>Manage raw materials and monitor available stock levels.</p>
        </div>

        <div className="materials-header-actions">
          <button
            className="button button-secondary"
            onClick={() => void loadMaterials()}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
          <button className="button button-primary" onClick={openCreateModal}>
            <Plus size={16} />
            Add material
          </button>
        </div>
      </div>

      <div className="materials-metrics">
        <div className="materials-metric">
          <div className="materials-metric-icon violet"><Boxes size={18} /></div>
          <span>Total materials</span>
          <strong>{materials.length}</strong>
          <small>Registered materials</small>
        </div>

        <div className="materials-metric">
          <div className="materials-metric-icon green"><Package size={18} /></div>
          <span>Available items</span>
          <strong>{materials.filter((m) => m.current_stock > 0).length}</strong>
          <small>Currently in stock</small>
        </div>

        <div className="materials-metric">
          <div className="materials-metric-icon orange"><AlertTriangle size={18} /></div>
          <span>Low stock</span>
          <strong>{lowStockCount}</strong>
          <small>Below minimum level</small>
        </div>

        <div className="materials-metric">
          <div className="materials-metric-icon red"><X size={18} /></div>
          <span>Out of stock</span>
          <strong>{outOfStockCount}</strong>
          <small>Require replenishment</small>
        </div>
      </div>

      {error && (
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
            <h2>Material inventory</h2>
            <p>Current stock is calculated from inventory transactions.</p>
          </div>
          <span className="materials-record-count">
            {filteredMaterials.length} records
          </span>
        </div>

        <div className="materials-toolbar">
          <div className="materials-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by material, SKU or category..."
            />
          </div>

          <div className="filter-tabs">
            {["All", "In Stock", "Low Stock", "Out of Stock"].map((item) => (
              <button
                key={item}
                className={filter === item ? "selected" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="materials-loading">
            <RefreshCw size={18} className="production-spinning" />
            Loading materials...
          </div>
        ) : (
          <div className="table-wrap materials-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>MATERIAL</th>
                  <th>SKU</th>
                  <th>CATEGORY</th>
                  <th>CURRENT STOCK</th>
                  <th>MIN. STOCK</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      {materials.length === 0
                        ? "No materials added yet. Add your first material to get started."
                        : "No materials match your search or selected filter."}
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((material) => {
                    const status = getStatus(material);

                    return (
                      <tr key={material.id}>
                        <td>
                          <div className="materials-name-cell">
                            <span className="materials-row-icon"><Boxes size={15} /></span>
                            <strong>{material.name}</strong>
                          </div>
                        </td>
                        <td><span className="materials-sku">{material.sku}</span></td>
                        <td>{material.category}</td>
                        <td>
                          <strong className="materials-stock-value">
                            {material.current_stock.toLocaleString()}
                          </strong>
                          <span className="materials-unit"> {material.unit}</span>
                        </td>
                        <td>
                          {material.minimum_stock.toLocaleString()} {material.unit}
                        </td>
                        <td>
                          <span className={`materials-status ${status.toLowerCase().replace(" ", "-")}`}>
                            <i />
                            {status}
                          </span>
                        </td>
                        <td>
                          <div className="materials-actions">
                            <button
                              className="more-button"
                              title="Edit material"
                              onClick={() => openEditModal(material)}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="more-button materials-delete"
                              title="Delete material"
                              onClick={() => void deleteMaterial(material)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
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
          <form className="create-modal materials-modal" onSubmit={saveMaterial}>
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">INVENTORY MANAGEMENT</span>
                <h2>{editing ? "Edit material" : "Add new material"}</h2>
                <p>Enter the material details below.</p>
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
                Material name *
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="e.g. Cotton Fabric"
                />
              </label>

              <label>
                SKU *
                <input
                  required
                  value={form.sku}
                  onChange={(event) => setForm({ ...form, sku: event.target.value })}
                  placeholder="e.g. FAB-001"
                />
              </label>

              <label>
                Category
                <select
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                >
                  <option>Fabric</option>
                  <option>Thread</option>
                  <option>Accessory</option>
                  <option>Packaging</option>
                  <option>Label</option>
                  <option>Other</option>
                </select>
              </label>

              <label>
                Unit
                <select
                  value={form.unit}
                  onChange={(event) => setForm({ ...form, unit: event.target.value })}
                >
                  <option>Meters</option>
                  <option>Yards</option>
                  <option>Pieces</option>
                  <option>Kg</option>
                  <option>Rolls</option>
                  <option>Boxes</option>
                  <option>Cones</option>
                </select>
              </label>

              <label className="materials-form-full">
                Minimum stock level
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.minimumStock}
                  onChange={(event) => setForm({ ...form, minimumStock: event.target.value })}
                />
              </label>

              <label className="materials-form-full">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  placeholder="Optional material details..."
                  rows={3}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="button button-primary" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save changes" : "Create material"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
