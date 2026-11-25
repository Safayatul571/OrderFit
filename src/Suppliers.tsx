
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
  Phone,
  Mail,
  UserRound,
} from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  created_at: string;
};

const emptyForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await invoke<Supplier[]>("list_suppliers");
      setSuppliers(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return suppliers.filter((supplier) =>
      [
        supplier.name,
        supplier.contact_person,
        supplier.phone,
        supplier.email,
        supplier.address,
      ].some((value) => value.toLowerCase().includes(search))
    );
  }, [suppliers, query]);

  const openCreateModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditing(supplier);

    setForm({
      name: supplier.name,
      contactPerson: supplier.contact_person,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      notes: supplier.notes,
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const saveSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      };

      if (editing) {
        await invoke("update_supplier", {
          id: editing.id,
          ...payload,
        });

        setSuccess("Supplier updated successfully.");
      } else {
        await invoke("create_supplier", payload);

        setSuccess("Supplier created successfully.");
      }

      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);

      await loadSuppliers();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteSupplier = async (supplier: Supplier) => {
    const confirmed = window.confirm(
      `Delete supplier "${supplier.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await invoke("delete_supplier", {
        id: supplier.id,
      });

      setSuccess("Supplier deleted successfully.");

      await loadSuppliers();
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="materials-module">
      <div className="materials-header">
        <div>
          <h2>Supplier overview</h2>
          <p>
            Manage supplier profiles and organize your material sourcing
            contacts.
          </p>
        </div>

        <div className="materials-header-actions">
          <button
            className="button button-secondary"
            onClick={() => void loadSuppliers()}
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
            Add supplier
          </button>
        </div>
      </div>

      <div className="materials-metrics">
        <div className="materials-metric">
          <div className="materials-metric-icon violet">
            <Users size={18} />
          </div>
          <span>Total suppliers</span>
          <strong>{suppliers.length}</strong>
          <small>Registered suppliers</small>
        </div>

        <div className="materials-metric">
          <div className="materials-metric-icon green">
            <UserRound size={18} />
          </div>
          <span>Contact persons</span>
          <strong>
            {suppliers.filter((s) => s.contact_person.trim()).length}
          </strong>
          <small>Suppliers with contact details</small>
        </div>

        <div className="materials-metric">
          <div className="materials-metric-icon orange">
            <Phone size={18} />
          </div>
          <span>Phone contacts</span>
          <strong>
            {suppliers.filter((s) => s.phone.trim()).length}
          </strong>
          <small>Available phone numbers</small>
        </div>

        <div className="materials-metric">
          <div className="materials-metric-icon red">
            <Mail size={18} />
          </div>
          <span>Email contacts</span>
          <strong>
            {suppliers.filter((s) => s.email.trim()).length}
          </strong>
          <small>Available email addresses</small>
        </div>
      </div>

      {error && (
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
            <h2>Supplier directory</h2>
            <p>View and manage your registered supplier contacts.</p>
          </div>

          <span className="materials-record-count">
            {filteredSuppliers.length} records
          </span>
        </div>

        <div className="materials-toolbar">
          <div className="materials-search">
            <Search size={15} />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by supplier, contact, phone or email..."
            />
          </div>
        </div>

        {loading ? (
          <div className="materials-loading">
            <RefreshCw size={18} className="production-spinning" />
            Loading suppliers...
          </div>
        ) : (
          <div className="table-wrap materials-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SUPPLIER</th>
                  <th>CONTACT PERSON</th>
                  <th>PHONE</th>
                  <th>EMAIL</th>
                  <th>ADDRESS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      {suppliers.length === 0
                        ? "No suppliers added yet. Add your first supplier to get started."
                        : "No suppliers match your search."}
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td>
                        <div className="materials-name-cell">
                          <span className="materials-row-icon">
                            <Users size={15} />
                          </span>
                          <strong>{supplier.name}</strong>
                        </div>
                      </td>

                      <td>
                        {supplier.contact_person || "—"}
                      </td>

                      <td>
                        {supplier.phone || "—"}
                      </td>

                      <td>
                        {supplier.email || "—"}
                      </td>

                      <td>
                        <span title={supplier.address}>
                          {supplier.address || "—"}
                        </span>
                      </td>

                      <td>
                        <div className="materials-actions">
                          <button
                            className="more-button"
                            title="Edit supplier"
                            onClick={() => openEditModal(supplier)}
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            className="more-button materials-delete"
                            title="Delete supplier"
                            onClick={() => void deleteSupplier(supplier)}
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

      {showModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setShowModal(false);
            }
          }}
        >
          <form
            className="create-modal materials-modal"
            onSubmit={saveSupplier}
          >
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">
                  SUPPLIER MANAGEMENT
                </span>

                <h2>
                  {editing ? "Edit supplier" : "Add new supplier"}
                </h2>

                <p>Enter the supplier details below.</p>
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
              <label className="materials-form-full">
                Supplier name *
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. ABC Textile Suppliers"
                />
              </label>

              <label>
                Contact person
                <input
                  value={form.contactPerson}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      contactPerson: event.target.value,
                    })
                  }
                  placeholder="e.g. Rahim Ahmed"
                />
              </label>

              <label>
                Phone number
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  placeholder="e.g. 017XXXXXXXX"
                />
              </label>

              <label className="materials-form-full">
                Email address
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="supplier@example.com"
                />
              </label>

              <label className="materials-form-full">
                Address
                <input
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                  placeholder="Supplier business address"
                />
              </label>

              <label className="materials-form-full">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  placeholder="Optional supplier details..."
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

              <button
                type="submit"
                className="button button-primary"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Create supplier"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
