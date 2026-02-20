"use client";

import { ClientDetail } from "@/components/crm/client-detail";
import { use } from "react";

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ClientDetail clientId={id} />;
}
