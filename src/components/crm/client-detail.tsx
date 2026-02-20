"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Plus, Mail, User, Building2, DollarSign } from "lucide-react";

const statuses = ["prospect", "contacted", "responded", "meeting", "proposal", "active", "inactive"] as const;

export function ClientDetail({ clientId }: { clientId: string }) {
  const client = useQuery(api.clients.get, { id: clientId as Id<"clients"> });
  const contacts = useQuery(api.crmContacts.listByClient, { clientId: clientId as Id<"clients"> });
  const outreachList = useQuery(api.outreach.list);
  const deals = useQuery(api.pipeline.listByClient, { clientId: clientId as Id<"clients"> });

  const updateClient = useMutation(api.clients.update);
  const createContact = useMutation(api.crmContacts.create);
  const createOutreach = useMutation(api.outreach.create);
  const createDeal = useMutation(api.pipeline.create);

  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [showAddOutreach, setShowAddOutreach] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState("");

  // Form states
  const [contactForm, setContactForm] = useState({ name: "", title: "", email: "" });
  const [dealForm, setDealForm] = useState({ service: "retouching" as const, value: "", stage: "lead" as const, notes: "" });
  const [outreachForm, setOutreachForm] = useState({ contactId: "", type: "initial" as const, subject: "", nextFollowUpDate: "" });

  if (!client) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  const contactOutreach = contacts?.flatMap(c => {
    const items = outreachList?.filter(o => o.contactId === c._id) ?? [];
    return items.map(o => ({ ...o, contactName: c.name }));
  }) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/crm/clients"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{client.category}</Badge>
            <Select
              value={client.status}
              onValueChange={(v) => updateClient({ id: client._id, status: v as any })}
            >
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Info */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Company Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {client.website && <p><span className="text-muted-foreground">Website:</span> <a href={client.website.startsWith("http") ? client.website : `https://${client.website}`} target="_blank" className="text-blue-400 hover:underline">{client.website}</a></p>}
            {client.location && <p><span className="text-muted-foreground">Location:</span> {client.location}</p>}
            {client.estimatedRevenue && <p><span className="text-muted-foreground">Revenue:</span> {client.estimatedRevenue}</p>}
            <div>
              <span className="text-muted-foreground">Notes:</span>
              {editNotes ? (
                <div className="mt-1 space-y-2">
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { updateClient({ id: client._id, notes }); setEditNotes(false); }}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditNotes(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="cursor-pointer hover:text-foreground" onClick={() => { setNotes(client.notes || ""); setEditNotes(true); }}>
                  {client.notes || "Click to add notes..."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2"><User className="h-4 w-4" /> Contacts</span>
              <Button size="sm" variant="ghost" onClick={() => setShowAddContact(true)}><Plus className="h-4 w-4" /></Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contacts?.map(c => (
                <div key={c._id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.isPrimary && <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 text-[10px]">Primary</Badge>}
                  </div>
                  {c.title && <p className="text-xs text-muted-foreground">{c.title}</p>}
                  {c.email && (
                    <div className="flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{c.email}</span>
                      {c.emailConfidence && (
                        <Badge variant="secondary" className={`text-[10px] ${c.emailConfidence === "verified" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                          {c.emailConfidence}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {(!contacts || contacts.length === 0) && <p className="text-sm text-muted-foreground">No contacts yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Deals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Pipeline</span>
            <Button size="sm" variant="ghost" onClick={() => setShowAddDeal(true)}><Plus className="h-4 w-4" /></Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deals && deals.length > 0 ? (
            <div className="space-y-2">
              {deals.map(d => (
                <div key={d._id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Badge variant="outline" className="text-xs">{d.service}</Badge>
                    {d.notes && <p className="text-xs text-muted-foreground mt-1">{d.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${(d.value || 0).toLocaleString()}</p>
                    <Badge variant="secondary" className="text-[10px]">{d.stage}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No pipeline deals</p>}
        </CardContent>
      </Card>

      {/* Outreach History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Mail className="h-4 w-4" /> Outreach History</span>
            {contacts && contacts.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => { setOutreachForm(f => ({ ...f, contactId: contacts[0]._id })); setShowAddOutreach(true); }}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contactOutreach.length > 0 ? (
            <div className="space-y-2">
              {contactOutreach.map(o => (
                <div key={o._id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{o.subject || "No subject"}</p>
                    <p className="text-xs text-muted-foreground">To: {o.contactName} · {o.type}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className={`text-[10px] ${o.status === "replied" ? "bg-emerald-500/20 text-emerald-400" : o.status === "bounced" ? "bg-red-500/20 text-red-400" : "bg-slate-500/20 text-slate-400"}`}>
                      {o.status}
                    </Badge>
                    {o.sentAt && <p className="text-[10px] text-muted-foreground mt-1">{new Date(o.sentAt).toLocaleDateString()}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No outreach recorded</p>}
        </CardContent>
      </Card>

      {/* Add Contact Dialog */}
      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name" value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Title" value={contactForm.title} onChange={e => setContactForm(f => ({ ...f, title: e.target.value }))} />
            <Input placeholder="Email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} />
            <Button onClick={async () => {
              await createContact({ clientId: clientId as Id<"clients">, name: contactForm.name, title: contactForm.title || undefined, email: contactForm.email || undefined, isPrimary: false });
              setContactForm({ name: "", title: "", email: "" });
              setShowAddContact(false);
            }}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Deal Dialog */}
      <Dialog open={showAddDeal} onOpenChange={setShowAddDeal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Pipeline Deal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={dealForm.service} onValueChange={(v) => setDealForm(f => ({ ...f, service: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="retouching">Retouching</SelectItem>
                <SelectItem value="digitalTech">Digital Tech</SelectItem>
                <SelectItem value="aiImageGen">AI Image Gen</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Value ($)" type="number" value={dealForm.value} onChange={e => setDealForm(f => ({ ...f, value: e.target.value }))} />
            <Select value={dealForm.stage} onValueChange={(v) => setDealForm(f => ({ ...f, stage: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="closed_won">Won</SelectItem>
                <SelectItem value="closed_lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Notes" value={dealForm.notes} onChange={e => setDealForm(f => ({ ...f, notes: e.target.value }))} />
            <Button onClick={async () => {
              await createDeal({ clientId: clientId as Id<"clients">, service: dealForm.service, value: dealForm.value ? Number(dealForm.value) : undefined, stage: dealForm.stage, notes: dealForm.notes || undefined });
              setDealForm({ service: "retouching", value: "", stage: "lead", notes: "" });
              setShowAddDeal(false);
            }}>Add Deal</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Outreach Dialog */}
      <Dialog open={showAddOutreach} onOpenChange={setShowAddOutreach}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Outreach</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {contacts && contacts.length > 1 && (
              <Select value={outreachForm.contactId} onValueChange={(v) => setOutreachForm(f => ({ ...f, contactId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>{contacts.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Select value={outreachForm.type} onValueChange={(v) => setOutreachForm(f => ({ ...f, type: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="initial">Initial</SelectItem>
                <SelectItem value="followUp1">Follow Up 1</SelectItem>
                <SelectItem value="followUp2">Follow Up 2</SelectItem>
                <SelectItem value="breakup">Breakup</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Subject" value={outreachForm.subject} onChange={e => setOutreachForm(f => ({ ...f, subject: e.target.value }))} />
            <Input type="date" value={outreachForm.nextFollowUpDate} onChange={e => setOutreachForm(f => ({ ...f, nextFollowUpDate: e.target.value }))} />
            <Button onClick={async () => {
              if (!outreachForm.contactId) return;
              await createOutreach({
                contactId: outreachForm.contactId as Id<"crmContacts">,
                type: outreachForm.type,
                status: "draft",
                subject: outreachForm.subject || undefined,
                nextFollowUpDate: outreachForm.nextFollowUpDate || undefined,
              });
              setOutreachForm({ contactId: contacts?.[0]?._id || "", type: "initial", subject: "", nextFollowUpDate: "" });
              setShowAddOutreach(false);
            }}>Log Outreach</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
