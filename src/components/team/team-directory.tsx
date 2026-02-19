"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  X,
  Trash2,
  Users,
  Tag,
  Mail,
  Phone,
  Building2,
  Pencil,
} from "lucide-react";
import { CreateContactDialog } from "./create-contact-dialog";
import { cn } from "@/lib/utils";

const tagColors = [
  "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "bg-pink-500/15 text-pink-400 border-pink-500/20",
  "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  "bg-sky-500/15 text-sky-400 border-sky-500/20",
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return tagColors[Math.abs(hash) % tagColors.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TeamDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string | undefined>(undefined);
  const [editingContact, setEditingContact] = useState<Doc<"contacts"> | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTagsInput, setEditTagsInput] = useState("");

  const allContacts = useQuery(api.contacts.list);
  const updateContact = useMutation(api.contacts.update);
  const deleteContact = useMutation(api.contacts.remove);

  // Derive unique tags
  const allTags = allContacts
    ? [...new Set(allContacts.flatMap((c) => c.tags))].sort()
    : [];

  // Filter contacts
  const contacts = allContacts?.filter((contact) => {
    if (filterTag && !contact.tags.includes(filterTag)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        contact.name.toLowerCase().includes(q) ||
        contact.role.toLowerCase().includes(q) ||
        contact.company.toLowerCase().includes(q) ||
        contact.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const openEdit = (contact: Doc<"contacts">) => {
    setEditingContact(contact);
    setEditName(contact.name);
    setEditRole(contact.role);
    setEditCompany(contact.company);
    setEditEmail(contact.email ?? "");
    setEditPhone(contact.phone ?? "");
    setEditNotes(contact.notes);
    setEditTagsInput(contact.tags.join(", "));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact || !editName.trim()) return;

    await updateContact({
      id: editingContact._id,
      name: editName.trim(),
      role: editRole.trim(),
      company: editCompany.trim(),
      email: editEmail.trim() || undefined,
      phone: editPhone.trim() || undefined,
      notes: editNotes.trim(),
      tags: editTagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

    setEditingContact(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team</h2>
          <p className="text-sm text-muted-foreground">
            <Users className="mr-1 inline h-3.5 w-3.5" />
            {allContacts?.length ?? 0} contacts
          </p>
        </div>
        <CreateContactDialog />
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="pl-9 bg-muted/30 border-border focus:bg-card"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterTag(undefined)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all duration-150",
                filterTag === undefined
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() =>
                  setFilterTag(filterTag === tag ? undefined : tag)
                }
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all duration-150",
                  filterTag === tag
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contact Cards */}
      {!contacts ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-border bg-muted/30"
            />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/50">
          <div className="text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery || filterTag
                ? "No contacts match your search"
                : "No contacts yet"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact, i) => (
            <Card
              key={contact._id}
              className={cn(
                "animate-fade-in-up group cursor-pointer border-border bg-card p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-lg",
                i < 6 && `stagger-${i + 1}`
              )}
              onClick={() => openEdit(contact)}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-sm font-medium text-blue-400">
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">
                        {contact.name}
                      </h3>
                      {(contact.role || contact.company) && (
                        <p className="truncate text-xs text-muted-foreground">
                          {contact.role}
                          {contact.role && contact.company && " · "}
                          {contact.company}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteContact({ id: contact._id });
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                  {contact.email && (
                    <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail className="h-2.5 w-2.5 shrink-0" />
                      {contact.email}
                    </p>
                  )}
                  {contact.phone && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-2.5 w-2.5 shrink-0" />
                      {contact.phone}
                    </p>
                  )}
                  {contact.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {contact.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className={cn(
                            "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px]",
                            getTagColor(tag)
                          )}
                        >
                          <Tag className="h-2 w-2" />
                          {tag}
                        </span>
                      ))}
                      {contact.tags.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{contact.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editingContact}
        onOpenChange={(open) => !open && setEditingContact(null)}
      >
        <DialogContent>
          {editingContact && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit Contact
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role / Title</label>
                    <Input
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company</label>
                    <Input
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags</label>
                  <Input
                    value={editTagsInput}
                    onChange={(e) => setEditTagsInput(e.target.value)}
                    placeholder="comma, separated, tags"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingContact(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!editName.trim()}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
