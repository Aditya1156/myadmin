'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useCurrentUser } from '@/hooks/use-current-user';
import { formatRelativeTime } from '@/lib/utils';
import {
  Inbox,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  Copy,
  Code,
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  source: string;
  pageUrl: string | null;
  status: string;
  notes: string | null;
  assignedToId: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  CONTACTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  CONVERTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function LeadsPage() {
  const { dbUser, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);

  useEffect(() => {
    if (!userLoading && dbUser && dbUser.role === 'SALES') {
      router.push('/dashboard');
    }
  }, [dbUser, userLoading, router]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '25');
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setLeads(json.data ?? []);
        setTotalPages(json.meta?.totalPages ?? 1);
        setTotal(json.meta?.total ?? 0);
      }
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    if (dbUser && (dbUser.role === 'ADMIN' || dbUser.role === 'MANAGER')) {
      fetchLeads();
    }
  }, [fetchLeads, dbUser]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setEditNotes(lead.notes ?? '');
    setEditStatus(lead.status);
  };

  const handleUpdateLead = async () => {
    if (!selectedLead) return;
    setSaving(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLead.id,
          status: editStatus,
          notes: editNotes,
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Lead updated');
      setSelectedLead(null);
      fetchLeads();
    } catch {
      toast.error('Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://myadmin-cyan.vercel.app';

  const embedCode = `<!-- TheNextURL Lead Capture Form -->
<form id="thenexturl-lead-form" style="max-width:480px;margin:0 auto;font-family:system-ui,sans-serif">
  <h3 style="margin-bottom:16px;font-size:1.25rem;font-weight:600">Get in Touch</h3>
  <div style="margin-bottom:12px">
    <input name="name" placeholder="Your Name *" required
      style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px" />
  </div>
  <div style="margin-bottom:12px">
    <input name="email" type="email" placeholder="Email Address"
      style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px" />
  </div>
  <div style="margin-bottom:12px">
    <input name="phone" type="tel" placeholder="Phone Number"
      style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px" />
  </div>
  <div style="margin-bottom:12px">
    <textarea name="message" placeholder="Your Message *" required rows="4"
      style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;resize:vertical"></textarea>
  </div>
  <button type="submit"
    style="width:100%;padding:12px;background:#000;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">
    Send Message
  </button>
  <p id="thenexturl-msg" style="margin-top:8px;font-size:13px;text-align:center"></p>
</form>
<script>
document.getElementById('thenexturl-lead-form').addEventListener('submit',async function(e){
  e.preventDefault();
  const btn=this.querySelector('button');
  const msg=document.getElementById('thenexturl-msg');
  btn.disabled=true;btn.textContent='Sending...';msg.textContent='';
  try{
    const fd=new FormData(this);
    const res=await fetch('${appUrl}/api/leads/incoming',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:fd.get('name'),email:fd.get('email'),phone:fd.get('phone'),message:fd.get('message'),source:'website',pageUrl:window.location.href})
    });
    const json=await res.json();
    if(json.success){msg.style.color='green';msg.textContent=json.message;this.reset();}
    else{msg.style.color='red';msg.textContent=json.error||'Failed to send';}
  }catch{msg.style.color='red';msg.textContent='Network error. Please try again.';}
  finally{btn.disabled=false;btn.textContent='Send Message';}
});
</script>`;

  if (userLoading || dbUser?.role === 'SALES') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Leads"
        description="Messages received from your website contact forms."
        action={
          <Button variant="outline" onClick={() => setShowEmbedDialog(true)}>
            <Code className="h-4 w-4 mr-2" />
            Get Embed Code
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={statusFilter || 'all'} onValueChange={(val) => setStatusFilter(val === 'all' ? '' : val)}>
            <TabsList>
              <TabsTrigger value="all">All ({total})</TabsTrigger>
              <TabsTrigger value="NEW">New</TabsTrigger>
              <TabsTrigger value="CONTACTED">Contacted</TabsTrigger>
              <TabsTrigger value="CONVERTED">Converted</TabsTrigger>
              <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No leads yet"
          description={
            statusFilter || search
              ? 'Try adjusting your filters.'
              : 'Leads from your website will appear here. Click "Get Embed Code" to set up the form.'
          }
          action={
            statusFilter || search
              ? { label: 'Clear Filters', onClick: () => { setSearch(''); setStatusFilter(''); } }
              : { label: 'Get Embed Code', onClick: () => setShowEmbedDialog(true) }
          }
        />
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <Card
              key={lead.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openLeadDetail(lead)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{lead.name}</h3>
                      <Badge className={STATUS_COLORS[lead.status] ?? ''}>
                        {lead.status}
                      </Badge>
                      {lead.source !== 'website' && (
                        <Badge variant="outline" className="text-xs">
                          {lead.source}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {lead.message}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {lead.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </span>
                      )}
                      {lead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      )}
                      {lead.pageUrl && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {new URL(lead.pageUrl).pathname}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatRelativeTime(lead.createdAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{selectedLead.name}</h3>
                  <Badge className={STATUS_COLORS[selectedLead.status] ?? ''}>
                    {selectedLead.status}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  {selectedLead.email && (
                    <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-2 text-primary hover:underline">
                      <Mail className="h-4 w-4" />
                      {selectedLead.email}
                    </a>
                  )}
                  {selectedLead.phone && (
                    <a href={`tel:${selectedLead.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                      <Phone className="h-4 w-4" />
                      {selectedLead.phone}
                    </a>
                  )}
                  {selectedLead.pageUrl && (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      {selectedLead.pageUrl}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Message</Label>
                <div className="mt-1 rounded-lg border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                  {selectedLead.message}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">New</SelectItem>
                      <SelectItem value="CONTACTED">Contacted</SelectItem>
                      <SelectItem value="CONVERTED">Converted</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedLead.phone && (
                  <div className="flex gap-1 pt-5">
                    <Button variant="outline" size="icon" asChild>
                      <a href={`tel:${selectedLead.phone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="outline" size="icon" asChild>
                      <a
                        href={`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${selectedLead.name}, thanks for reaching out to TheNextURL!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageSquare className="h-4 w-4 text-green-600" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes about this lead..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedLead(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateLead} disabled={saving}>
                  {saving ? 'Saving...' : 'Update Lead'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Embed Contact Form on Your Website</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Copy and paste this code into your website HTML. When visitors submit the form, their message will appear here in your CRM instantly.
            </p>

            <div>
              <Label>API Endpoint (for custom integration)</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input value={`${appUrl}/api/leads/incoming`} readOnly className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${appUrl}/api/leads/incoming`);
                    toast.success('URL copied');
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                POST JSON: {`{ name, email, phone, message, source?, pageUrl? }`}
              </p>
            </div>

            <div>
              <Label>Embeddable Form (HTML + JS)</Label>
              <div className="mt-1 relative">
                <pre className="rounded-lg border bg-muted/50 p-3 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {embedCode}
                </pre>
                <Button
                  variant="default"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    navigator.clipboard.writeText(embedCode);
                    toast.success('Embed code copied!');
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
