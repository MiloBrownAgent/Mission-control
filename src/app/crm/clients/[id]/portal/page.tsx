'use client';

import { useState, useEffect, use } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from '../../../../../../convex/_generated/dataModel';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Shield, User, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PortalUser {
  _id: string;
  email: string;
  name?: string;
  active: boolean;
  createdAt: number;
  lastLoginAt?: number;
  clientSlug: string;
}

interface AddFormState {
  email: string;
  name: string;
  password: string;
}

function slugify(name: string) {
  // Preserve original casing — slug must match the exact Dropbox folder name under /Clients/
  return name.replace(/\s+/g, '');
}

export default function ClientPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Fetch client via Convex
  const client = useQuery(api.clients.get, { id: id as Id<'clients'> });

  const [clientSlug, setClientSlug] = useState<string>('');
  const [slugDirty, setSlugDirty] = useState(false);
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [slugLoading, setSlugLoading] = useState(false);
  const [error, setError] = useState('');
  const [addForm, setAddForm] = useState<AddFormState>({ email: '', name: '', password: '' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);

  // Auto-set slug from client name (once)
  useEffect(() => {
    if (client?.name && !slugDirty) {
      setClientSlug(slugify(client.name));
    }
  }, [client?.name, slugDirty]);

  function loadUsers(slug: string) {
    if (!slug) return;
    setLoading(true);
    setError('');
    fetch(`/api/portal/users?clientSlug=${encodeURIComponent(slug)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load users');
        return res.json();
      })
      .then(data => setUsers(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  // Load users once slug is set
  useEffect(() => {
    if (clientSlug) loadUsers(clientSlug);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSlugLoad() {
    setSlugLoading(true);
    loadUsers(clientSlug);
    setSlugLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    try {
      const res = await fetch('/api/portal/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addForm.email,
          password: addForm.password,
          clientSlug,
          name: addForm.name || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create user');
      }
      setAddForm({ email: '', name: '', password: '' });
      loadUsers(clientSlug);
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setAdding(false);
    }
  }

  async function handleRevoke(userId: string) {
    setRevoking(userId);
    try {
      const res = await fetch(`/api/portal/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u._id !== userId));
      }
    } catch { /* ignore */ } finally {
      setRevoking(null);
    }
  }

  function formatDate(ts?: number) {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/crm/clients/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#B8956A]" />
            Portal Access
          </h1>
          {client?.name && (
            <p className="text-sm text-muted-foreground">{client.name}</p>
          )}
        </div>
      </div>

      {/* Slug config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4 text-[#B8956A]" />
            Client Slug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            The slug ties portal users to this client&apos;s Dropbox folder path:{' '}
            <code className="text-[#B8956A] text-xs">/Clients/{'{slug}'}</code>
          </p>
          <div className="flex gap-2">
            <Input
              value={clientSlug}
              onChange={e => { setClientSlug(e.target.value); setSlugDirty(true); }}
              placeholder="e.g. lifetime, target-corp"
              className="font-mono text-sm"
            />
            <Button
              onClick={handleSlugLoad}
              disabled={!clientSlug || slugLoading}
              variant="outline"
            >
              Load Users
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add user form */}
      {clientSlug && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Portal User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-3">
              <Input
                type="email"
                placeholder="Email *"
                required
                value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
              />
              <Input
                placeholder="Name (optional)"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              />
              <Input
                type="password"
                placeholder="Password *"
                required
                value={addForm.password}
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
              />
              {addError && (
                <p className="text-sm text-red-500">{addError}</p>
              )}
              <Button type="submit" disabled={adding} className="bg-[#B8956A] hover:bg-[#CDAA7E] text-[#060606]">
                {adding ? 'Creating…' : 'Create Access'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* User list */}
      {clientSlug && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Portal Users
              {users.length > 0 && (
                <Badge variant="secondary" className="text-xs">{users.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            {!loading && !error && users.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No portal users yet for slug <code className="text-[#B8956A]">{clientSlug}</code>.
              </p>
            )}
            {!loading && users.length > 0 && (
              <div className="space-y-2">
                {users.map(user => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">
                          {user.name ?? user.email}
                        </p>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] shrink-0 ${
                            user.active
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {user.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {user.name && (
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Last login: {formatDate(user.lastLoginAt)} · Added {formatDate(user.createdAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={revoking === user._id}
                      onClick={() => handleRevoke(user._id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Revoke</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
