"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Link2,
  FolderOpen,
  ChevronRight,
  Copy,
  Check,
  Unplug,
  Plug,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Loader2,
  ExternalLink,
} from "lucide-react";

const CLIENT_OPTIONS = [
  { slug: "lifetime", label: "Life Time" },
  { slug: "knock", label: "Knock" },
  { slug: "target", label: "Target" },
  { slug: "colossal", label: "Colossal Biosciences" },
];

interface DropboxEntry {
  name: string;
  path: string;
}

export default function LinksPage() {
  const [selectedClient, setSelectedClient] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<{ name: string; path: string }[]>([]);
  const [folders, setFolders] = useState<DropboxEntry[]>([]);
  const [files, setFiles] = useState<DropboxEntry[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [label, setLabel] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const dropboxConfig = useQuery(api.dropboxConfig.getConfig);
  const links = useQuery(
    api.clientLinks.listLinks,
    selectedClient ? { clientSlug: selectedClient } : "skip"
  );
  const createLink = useMutation(api.clientLinks.createLink);
  const revokeLink = useMutation(api.clientLinks.revokeLink);
  const activateLink = useMutation(api.clientLinks.activateLink);

  const isDropboxConnected = !!dropboxConfig;

  const browseFolder = useCallback(async (path: string) => {
    setLoadingFolders(true);
    try {
      const res = await fetch(`/api/dropbox/folders?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setFolders(data.folders || []);
      setFiles(data.files || []);
      setFolderPath(path);

      // Build breadcrumbs from path
      if (path) {
        const parts = path.split("/").filter(Boolean);
        const crumbs = parts.map((part, i) => ({
          name: part,
          path: "/" + parts.slice(0, i + 1).join("/"),
        }));
        setBreadcrumbs(crumbs);
      } else {
        setBreadcrumbs([]);
      }
    } catch (e) {
      console.error("Browse folder error:", e);
    } finally {
      setLoadingFolders(false);
    }
  }, []);

  const handleClientChange = (slug: string) => {
    setSelectedClient(slug);
    setFolderPath("");
    setBreadcrumbs([]);
    setFolders([]);
    setFiles([]);
    setGeneratedUrl("");

    if (isDropboxConnected) {
      const clientName = CLIENT_OPTIONS.find((c) => c.slug === slug)?.label || slug;
      browseFolder(`/Clients/${clientName.replace(/\s+/g, "")}`);
    }
  };

  const handleGenerate = async () => {
    if (!selectedClient || !folderPath) return;
    setGenerating(true);
    try {
      const result = await createLink({
        clientSlug: selectedClient,
        folderPath,
        label: label || undefined,
      });
      setGeneratedUrl(result.url);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const connectDropbox = () => {
    const clientId = process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID;
    const redirectUri = "https://mc.lookandseen.com/api/dropbox/callback";
    window.location.href = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&token_access_type=offline`;
  };

  const disconnectDropbox = async () => {
    await fetch("/api/dropbox/disconnect", { method: "POST" });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Client Links</h2>
        <p className="text-sm text-muted-foreground">
          <Link2 className="mr-1 inline h-3.5 w-3.5" />
          Generate token-based portal links for clients
        </p>
      </div>

      {/* Dropbox Connection Status */}
      <Card className="animate-fade-in-up border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              isDropboxConnected ? "bg-emerald-500/20" : "bg-orange-500/10"
            )}>
              {isDropboxConnected ? (
                <Plug className="h-5 w-5 text-emerald-400" />
              ) : (
                <Unplug className="h-5 w-5 text-orange-400" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold">Dropbox</h3>
              <p className="text-xs text-muted-foreground">
                {isDropboxConnected
                  ? `Connected ${new Date(dropboxConfig.connectedAt).toLocaleDateString()}`
                  : "Not connected"}
              </p>
            </div>
          </div>
          {isDropboxConnected ? (
            <Button variant="outline" size="sm" onClick={disconnectDropbox}>
              <Unplug className="h-3.5 w-3.5" />
              Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={connectDropbox}>
              <Plug className="h-3.5 w-3.5" />
              Connect Dropbox
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Link Generator */}
        <div className="space-y-4 animate-fade-in-up stagger-1">
          <h3 className="text-lg font-semibold">Generate Link</h3>

          {/* Client Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</label>
            <Select value={selectedClient} onValueChange={handleClientChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_OPTIONS.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Folder Browser */}
          {selectedClient && isDropboxConnected && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Folder</label>
              <Card className="border-border bg-card p-0 overflow-hidden">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/30 text-xs overflow-x-auto">
                  <button
                    onClick={() => browseFolder("")}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    Dropbox
                  </button>
                  {breadcrumbs.map((crumb) => (
                    <span key={crumb.path} className="flex items-center gap-1 shrink-0">
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <button
                        onClick={() => browseFolder(crumb.path)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {crumb.name}
                      </button>
                    </span>
                  ))}
                </div>

                {/* Folder contents */}
                <div className="max-h-56 overflow-y-auto">
                  {loadingFolders ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : folders.length === 0 && files.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No items found
                    </div>
                  ) : (
                    <>
                      {breadcrumbs.length > 0 && (
                        <button
                          onClick={() => {
                            const parent = breadcrumbs.length > 1
                              ? breadcrumbs[breadcrumbs.length - 2].path
                              : "";
                            browseFolder(parent);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-muted-foreground"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          Back
                        </button>
                      )}
                      {folders.map((folder) => (
                        <button
                          key={folder.path}
                          onClick={() => browseFolder(folder.path)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                        >
                          <FolderOpen className="h-3.5 w-3.5 text-blue-400" />
                          {folder.name}
                          <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />
                        </button>
                      ))}
                      {files.map((file) => (
                        <div
                          key={file.path}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground"
                        >
                          <div className="h-3.5 w-3.5 rounded-sm bg-muted" />
                          {file.name}
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Select this folder */}
                {folderPath && (
                  <div className="border-t border-border px-3 py-2 bg-muted/20">
                    <p className="text-[10px] text-muted-foreground truncate">
                      Selected: <span className="text-foreground">{folderPath}</span>
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Folder path manual input when Dropbox not connected */}
          {selectedClient && !isDropboxConnected && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Folder Path</label>
              <Input
                placeholder="/Clients/ClientName/Deliverables"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
              />
            </div>
          )}

          {/* Label */}
          {selectedClient && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Label (optional)</label>
              <Input
                placeholder="e.g. Spring Campaign Deliverables"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
          )}

          {/* Generate Button */}
          {selectedClient && folderPath && (
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Generate Link
            </Button>
          )}

          {/* Generated URL */}
          {generatedUrl && (
            <Card className="border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-xs font-medium text-emerald-400 mb-2">Link generated</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-background/50 px-3 py-2 rounded border border-border truncate">
                  {generatedUrl}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right: Existing Links */}
        <div className="space-y-4 animate-fade-in-up stagger-2">
          <h3 className="text-lg font-semibold">
            Existing Links
            {selectedClient && links && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({links.length})
              </span>
            )}
          </h3>

          {!selectedClient ? (
            <Card className="border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">Select a client to see links</p>
            </Card>
          ) : !links ? (
            <Card className="border-border bg-card p-8 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
            </Card>
          ) : links.length === 0 ? (
            <Card className="border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No links yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <Card key={link._id} className="border-border bg-card p-3.5 transition-all duration-200">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      link.active ? "bg-emerald-500/10" : "bg-muted"
                    )}>
                      <Link2 className={cn(
                        "h-4 w-4",
                        link.active ? "text-emerald-400" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {link.label || link.folderPath}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            link.active
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : "border-border text-muted-foreground"
                          )}
                        >
                          {link.active ? "Active" : "Revoked"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-[10px] text-muted-foreground truncate">
                          /p/{link.token.slice(0, 12)}...
                        </code>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(link.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          navigator.clipboard.writeText("https://lookandseen.com/p/" + link.token);
                        }}
                        title="Copy link"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <a
                        href={"https://lookandseen.com/p/" + link.token}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="icon-xs" title="Open link">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          if (link.active) {
                            revokeLink({ id: link._id as Id<"clientLinks"> });
                          } else {
                            activateLink({ id: link._id as Id<"clientLinks"> });
                          }
                        }}
                        title={link.active ? "Revoke link" : "Reactivate link"}
                      >
                        {link.active ? (
                          <ToggleRight className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
