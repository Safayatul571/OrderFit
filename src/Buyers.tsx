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
  Globe2,
  ClipboardList,
  Eye,
  MapPin,
} from "lucide-react";

type Buyer = {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  notes: string;
  created_at: string;
};

type Order = {
  id: string;
  buyer: string;
  product: string;
  quantity: string;
  due: string;
  progress: number;
  status: "On Track" | "At Risk" | "Completed";
};

type BuyerForm = {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  notes: string;
};

const emptyForm: BuyerForm = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  country: "",
  address: "",
  notes: "",
};

type BuyersProps = {
  orders: Order[];
};

export default function Buyers({ orders }: BuyersProps) {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Buyer | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [form, setForm] = useState<BuyerForm>(emptyForm);

  const loadBuyers = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await invoke<Buyer[]>("list_buyers");
      setBuyers(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBuyers();
  }, []);

  const orderCount = (buyerName: string) =>
    orders.filter(
      (order) => order.buyer.trim().toLowerCase() === buyerName.trim().toLowerCase()
    ).length;

  const filteredBuyers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return buyers.filter((buyer) =>
      [
        buyer.name,
        buyer.contact_person,
        buyer.email,
        buyer.phone,
        buyer.country,
        buyer.address,
      ].some((value) => value.toLowerCase().includes(search))
    );
  }, [buyers, query]);

  const countriesCount = useMemo(
    () =>
      new Set(
        buyers
          .map((buyer) => buyer.country.trim().toLowerCase())
          .filter(Boolean)
      ).size,
    [buyers]
  );

  const linkedOrderCount = orders.filter((order) =>
    buyers.some(
      (buyer) =>
        buyer.name.trim().toLowerCase() === order.buyer.trim().toLowerCase()
    )
  ).length;

  const activeBuyerCount = buyers.filter((buyer) =>
    orders.some(
      (order) =>
        order.buyer.trim().toLowerCase() === buyer.name.trim().toLowerCase() &&
        order.status !== "Completed"
    )
  ).length;

  const selectedOrders = useMemo(() => {
    if (!selectedBuyer) return [];

    return orders
      .filter(
        (order) =>
          order.buyer.trim().toLowerCase() ===
          selectedBuyer.name.trim().toLowerCase()
      )
      .sort((a, b) => b.due.localeCompare(a.due));
  }, [orders, selectedBuyer]);

  const openCreateModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (buyer: Buyer) => {
    setEditing(buyer);
    setForm({
      name: buyer.name,
      contactPerson: buyer.contact_person,
      email: buyer.email,
      phone: buyer.phone,
      country: buyer.country,
      address: buyer.address,
      notes: buyer.notes,
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const saveBuyer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Buyer name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: form.country.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      };

      if (editing) {
        await invoke("update_buyer", {
          id: editing.id,
          ...payload,
        });

        setSuccess("Buyer profile updated successfully.");

        if (selectedBuyer?.id === editing.id) {
          setSelectedBuyer({
            ...editing,
            name: payload.name,
            contact_person: payload.contactPerson,
            email: payload.email,
            phone: payload.phone,
            country: payload.country,
            address: payload.address,
            notes: payload.notes,
          });
        }
      } else {
        await invoke("create_buyer", payload);
        setSuccess("Buyer added successfully.");
      }

      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);

      await loadBuyers();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteBuyer = async (buyer: Buyer) => {
    const linkedOrders = orderCount(buyer.name);

    const message =
      linkedOrders > 0
        ? `${buyer.name} has ${linkedOrders} linked order(s). The system will prevent deletion to preserve order history. Continue?`
        : `Delete buyer "${buyer.name}"? This action cannot be undone.`;

    if (!window.confirm(message)) return;

    try {
      setError("");
      setSuccess("");

      await invoke("delete_buyer", { id: buyer.id });

      setSuccess("Buyer deleted successfully.");

      if (selectedBuyer?.id === buyer.id) {
        setSelectedBuyer(null);
      }

      await loadBuyers();
    } catch (err) {
      setError(String(err));
    }
  };

  const statusClass = (status: Order["status"]) =>
    status === "Completed"
      ? "completed"
      : status === "At Risk"
        ? "at-risk"
        : "on-track";

  return (
    <div className="materials-module">
      <div className="materials-header">
        <div>
          <h2>Buyer overview</h2>
          <p>
            Manage buyer relationships, company profiles and order history.
          </p>
        </div>

        <div className="materials-header-actions">
          <button
            className="button button-secondary"
            onClick={() => void loadBuyers()}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>

          <button className="button button-primary" onClick={openCreateModal}>
            <Plus size={16} />
            Add buyer
          </button>
        </div>
      </div>

      <div className="materials-metrics">
        <div className="materials-metric">
          <div className="materials-metric-icon violet">
            <Users size={18} />
          </div>
          <span>Total buyers</span>
          <strong>{buyers.length}</strong>
          <small>Registered buyer profiles</small>
        </div>

        <div className="materials-metric">
          <div className="materials-metric-icon green">
            <ClipboardList size={18} />
          </div>
          <span>Linked orders</span>
          <strong>{linkedOrderCount}</strong>
          <small>Orders assigned to buyers</small>
        </div>

        <div className="materials-metric">
          <div className="materials-metric-icon orange">
            <Globe2 size={18} />
          </div>
          <span>Countries</span>
          <strong>{countriesCount}</strong>
          <small>Buyer locations represented</small>
        </div>

        <div className="materials-metric">
          <div className="materials-metric-icon red">
            <UserRound size={18} />
          </div>
          <span>Active buyers</span>
          <strong>{activeBuyerCount}</strong>
          <small>Buyers with ongoing orders</small>
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
            <h2>Buyer directory</h2>
            <p>
              View buyer profiles and explore their associated orders.
            </p>
          </div>

          <span className="materials-record-count">
            {filteredBuyers.length} records
          </span>
        </div>

        <div className="materials-toolbar">
          <div className="materials-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by buyer, contact, country, phone or email..."
            />
          </div>
        </div>

        {loading ? (
          <div className="materials-loading">
            <RefreshCw size={18} className="production-spinning" />
            Loading buyers...
          </div>
        ) : (
          <div className="table-wrap materials-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>BUYER</th>
                  <th>CONTACT PERSON</th>
                  <th>COUNTRY</th>
                  <th>PHONE</th>
                  <th>EMAIL</th>
                  <th>ORDERS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filteredBuyers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      {buyers.length === 0
                        ? "No buyers registered yet. Add your first buyer to get started."
                        : "No buyers match your search."}
                    </td>
                  </tr>
                ) : (
                  filteredBuyers.map((buyer) => (
                    <tr key={buyer.id}>
                      <td>
                        <div className="materials-name-cell">
                          <span className="materials-row-icon">
                            <Users size={15} />
                          </span>
                          <button
                            type="button"
                            className="buyer-name-link"
                            onClick={() => setSelectedBuyer(buyer)}
                            title="View buyer profile and order history"
                          >
                            {buyer.name}
                          </button>
                        </div>
                      </td>

                      <td>{buyer.contact_person || "—"}</td>
                      <td>{buyer.country || "—"}</td>
                      <td>{buyer.phone || "—"}</td>
                      <td>{buyer.email || "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="buyer-order-count"
                          onClick={() => setSelectedBuyer(buyer)}
                          title="View buyer orders"
                        >
                          <ClipboardList size={13} />
                          {orderCount(buyer.name)}
                        </button>
                      </td>

                      <td>
                        <div className="materials-actions">
                          <button
                            className="more-button"
                            title="View buyer"
                            onClick={() => setSelectedBuyer(buyer)}
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            className="more-button"
                            title="Edit buyer"
                            onClick={() => openEditModal(buyer)}
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            className="more-button materials-delete"
                            title="Delete buyer"
                            onClick={() => void deleteBuyer(buyer)}
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

      {selectedBuyer && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedBuyer(null);
            }
          }}
        >
          <section className="create-modal materials-modal buyer-detail-modal">
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">BUYER PROFILE</span>
                <h2>{selectedBuyer.name}</h2>
                <p>Buyer information and associated order history.</p>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedBuyer(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="buyer-profile-grid">
              <div>
                <UserRound size={15} />
                <span>Contact person</span>
                <strong>{selectedBuyer.contact_person || "Not provided"}</strong>
              </div>
              <div>
                <Globe2 size={15} />
                <span>Country</span>
                <strong>{selectedBuyer.country || "Not provided"}</strong>
              </div>
              <div>
                <Phone size={15} />
                <span>Phone</span>
                <strong>{selectedBuyer.phone || "Not provided"}</strong>
              </div>
              <div>
                <Mail size={15} />
                <span>Email</span>
                <strong>{selectedBuyer.email || "Not provided"}</strong>
              </div>
              <div className="buyer-profile-full">
                <MapPin size={15} />
                <span>Address</span>
                <strong>{selectedBuyer.address || "Not provided"}</strong>
              </div>
            </div>

            {selectedBuyer.notes && (
              <div className="buyer-notes">
                <span>NOTES</span>
                <p>{selectedBuyer.notes}</p>
              </div>
            )}

            <div className="buyer-history-heading">
              <div>
                <h3>Order history</h3>
                <p>Orders currently associated with this buyer.</p>
              </div>
              <span className="materials-record-count">
                {selectedOrders.length} orders
              </span>
            </div>

            <div className="table-wrap materials-table-wrap buyer-history-table">
              <table>
                <thead>
                  <tr>
                    <th>ORDER ID</th>
                    <th>PRODUCT</th>
                    <th>QUANTITY</th>
                    <th>DUE DATE</th>
                    <th>PROGRESS</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-row">
                        No orders are currently linked to this buyer.
                      </td>
                    </tr>
                  ) : (
                    selectedOrders.map((order) => (
                      <tr key={order.id}>
                        <td><strong>{order.id}</strong></td>
                        <td>{order.product}</td>
                        <td>{order.quantity}</td>
                        <td>{order.due}</td>
                        <td>
                          <div className="buyer-progress">
                            <span>{order.progress}%</span>
                            <div>
                              <i style={{ width: `${Math.min(100, Math.max(0, order.progress))}%` }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`buyer-status ${statusClass(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSelectedBuyer(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => openEditModal(selectedBuyer)}
              >
                <Pencil size={14} />
                Edit buyer
              </button>
            </div>
          </section>
        </div>
      )}

      {showModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowModal(false);
            }
          }}
        >
          <form className="create-modal materials-modal" onSubmit={saveBuyer}>
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">BUYER MANAGEMENT</span>
                <h2>{editing ? "Edit buyer profile" : "Add new buyer"}</h2>
                <p>Enter the buyer company and contact details.</p>
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
                Buyer / Company name *
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. ABC Fashion Ltd."
                />
              </label>

              <label>
                Contact person
                <input
                  value={form.contactPerson}
                  onChange={(event) =>
                    setForm({ ...form, contactPerson: event.target.value })
                  }
                  placeholder="e.g. John Smith"
                />
              </label>

              <label>
                Country
                <input
                  value={form.country}
                  onChange={(event) =>
                    setForm({ ...form, country: event.target.value })
                  }
                  placeholder="e.g. Bangladesh"
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
                  placeholder="e.g. +8801XXXXXXXXX"
                />
              </label>

              <label>
                Email address
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="buyer@example.com"
                />
              </label>

              <label className="materials-form-full">
                Business address
                <input
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                  placeholder="Buyer company address"
                />
              </label>

              <label className="materials-form-full">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  placeholder="Optional buyer information..."
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
                    : "Create buyer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
