"use client";

import { useState, useEffect, FormEvent } from "react";

interface Account {
  _id: string;
  email: string;
  clientSlug: string;
  isActive: boolean;
  createdAt: number;
  lastLoginAt?: number;
}

export default function PortalAdminPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientSlug, setClientSlug] = useState("");

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/portal-admin/accounts");
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch {
      setError("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/portal-admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, clientSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create account");
        return;
      }
      setSuccess(`Account created for ${email}`);
      setEmail("");
      setPassword("");
      setClientSlug("");
      fetchAccounts();
    } catch {
      setError("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: string) {
    try {
      await fetch("https://proper-rat-443.convex.cloud/api/mutation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Convex-Client": "npm-1.33.0",
        },
        body: JSON.stringify({
          path: "clientPortal:toggleActive",
          args: { id },
          format: "json",
        }),
      });
      fetchAccounts();
    } catch {
      setError("Failed to toggle account");
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Portal Account Admin</h1>
      <p className="text-sm text-gray-500 mb-8">
        Manage email/password accounts for the Look &amp; Seen client portal at{" "}
        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">lookandseen.com/portal</code>
      </p>

      {/* Create Account Form */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-10">
        <h2 className="text-lg font-semibold mb-4">Create Account</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@company.com"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Client Slug</label>
            <input
              type="text"
              required
              value={clientSlug}
              onChange={(e) => setClientSlug(e.target.value)}
              placeholder="target"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-3 flex items-center gap-4">
            <button
              type="submit"
              disabled={creating}
              className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create Account"}
            </button>
            {success && <p className="text-sm text-green-600">{success}</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </form>
        <p className="text-xs text-gray-400 mt-3">
          Slug must match a client in <code>src/lib/clients.ts</code> on lookandseen.com (e.g. <code>target</code>, <code>knock</code>, <code>lifetime</code>, <code>colossal</code>).
        </p>
      </section>

      {/* Account List */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Accounts ({accounts.length})</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-gray-400">No accounts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left text-xs text-gray-600 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Client Slug</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last Login</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acct) => (
                  <tr key={acct._id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{acct.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">
                        {acct.clientSlug}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                          acct.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {acct.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {acct.lastLoginAt
                        ? new Date(acct.lastLoginAt).toLocaleString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(acct.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(acct._id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {acct.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
