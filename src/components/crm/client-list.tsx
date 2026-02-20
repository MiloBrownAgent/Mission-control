"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { useState } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import { CreateClientDialog } from "./create-client-dialog";
import { Id } from "../../../convex/_generated/dataModel";

const statusOptions = ["all", "prospect", "contacted", "responded", "meeting", "proposal", "active", "inactive"] as const;
const categoryOptions = ["all", "DTC/CPG", "Agency", "E-commerce", "Fashion", "AI Opportunity"] as const;

const statusColors: Record<string, string> = {
  prospect: "bg-slate-500/20 text-slate-400",
  contacted: "bg-blue-500/20 text-blue-400",
  responded: "bg-purple-500/20 text-purple-400",
  meeting: "bg-amber-500/20 text-amber-400",
  proposal: "bg-orange-500/20 text-orange-400",
  active: "bg-emerald-500/20 text-emerald-400",
  inactive: "bg-red-500/20 text-red-400",
};

export function ClientList() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  const clients = useQuery(api.clients.list, {
    ...(statusFilter !== "all" ? { status: statusFilter as any } : {}),
    ...(categoryFilter !== "all" ? { category: categoryFilter as any } : {}),
  });

  const updateClient = useMutation(api.clients.update);

  const handleBulkStatus = async (status: string) => {
    // This would be enhanced with selection state
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/crm">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Clients</h1>
            <p className="text-sm text-muted-foreground">{clients?.length ?? 0} total</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add Client
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {statusOptions.map(s => <SelectItem key={s} value={s}>{s === "all" ? "All Statuses" : s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {categoryOptions.map(c => <SelectItem key={c} value={c}>{c === "all" ? "All Categories" : c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Client Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-4 font-medium">Company</th>
                  <th className="p-4 font-medium">Category</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Location</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients?.map((client) => (
                  <tr key={client._id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="p-4">
                      <Link href={`/crm/clients/${client._id}`} className="font-medium text-sm hover:text-blue-400 transition-colors">
                        {client.name}
                      </Link>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="text-xs">{client.category}</Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary" className={statusColors[client.status] ?? ""}>
                        {client.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{client.location || "—"}</td>
                    <td className="p-4">
                      <Select
                        value={client.status}
                        onValueChange={(val) => updateClient({ id: client._id as Id<"clients">, status: val as any })}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {statusOptions.filter(s => s !== "all").map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CreateClientDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
