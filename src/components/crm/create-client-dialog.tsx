"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

const categories = ["DTC/CPG", "Agency", "E-commerce", "Fashion", "AI Opportunity"] as const;
const statuses = ["prospect", "contacted", "responded", "meeting", "proposal", "active", "inactive"] as const;

export function CreateClientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useMutation(api.clients.create);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState<typeof categories[number]>("DTC/CPG");
  const [status, setStatus] = useState<typeof statuses[number]>("prospect");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await create({
      name: name.trim(),
      website: website || undefined,
      category,
      status,
      location: location || undefined,
      notes: notes || undefined,
    });
    setName(""); setWebsite(""); setLocation(""); setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Client</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Company name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Website" value={website} onChange={e => setWebsite(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
          <Textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
          <Button onClick={handleSubmit} className="w-full">Add Client</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
