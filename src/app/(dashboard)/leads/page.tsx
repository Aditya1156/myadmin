'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Inbox,
  Search,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  Code,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate, generateWhatsAppLink } from '@/lib/utils';

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

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'REJECTED', label: 'Rejected' },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'NEW': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'CONTACTED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'CONVERTED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'REJECTED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default: return '';
  }
}

export default function LeadsPage() {
  const { dbUser } = useCurrentUser();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);

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
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const updateLead = async (id: string, data: Record<string, string>) => {
    setUpdating(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      if (res.ok) {
        toast.success('Lead updated');
        fetchLeads();
        if (selectedLead?.id === id) {
          setSelectedLead((prev) => prev ? { ...prev, ...data } : null);
        }
      }
    } catch {
      toast.error('Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const embedCode = `<form id="nexcrm-lead-form" onsubmit="(async function(e){e.preventDefault();const f=e.target;const b=document.getElementById('nexcrm-btn');b.disabled=true;b.textContent='Sending...';try{const r=await fetch('${typeof window !== 'undefined' ? window.location.origin : ''}/api/leads/incoming',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.name.value,email:f.email.value,phone:f.phone.value,message:f.message.value,source:'website',pageUrl:window.location.href})});const d=await r.json();if(d.success){f.reset();b.textContent='Sent!';setTimeout(()=>{b.textContent='Send Message';b.disabled=false},2000)}else{alert(d.error||'Error');b.textContent='Send Message';b.disabled=false}}catch(err){alert('Network error');b.textContent='Send Message';b.disabled=false}})(event)">
  <input name="name" placeholder="Your Name" required style="display:block;width:100%;padding:8px;margin-bottom:8px;border:1px solid #ccc;border-radius:4px">
  <input name="email" type="email" placeholder="Email" style="display:block;width:100%;padding:8px;margin-bottom:8px;border:1px solid #ccc;border-radius:4px">
  <input name="phone" placeholder="Phone" style="display:block;width:100%;padding:8px;margin-bottom:8px;border:1px solid #ccc;border-radius:4px">
  <textarea name="message" placeholder="Your Message" required rows="4" style="display:block;width:100%;padding:8px;margin-bottom:8px;border:1px solid #ccc;border-radius:4px"></textarea>
  <button id="nexcrm-btn" type="submit" style="background:#2563eb;color:#fff;padding:10px 24px;border:none;border-radius:4px;cursor:pointer">Send Message</button>
</form>`;

  const isAdmin = dbUser?.role === 'ADMIN' || dbUser?.role === 'MANAGER';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Leads"
        description={`${total} leads from your website contact forms.`}
        action={
          isAdmin ? (
            <Button variant="outline" onClick={() => setShowEmbed(true)}>
              <Code className="mr-2 h-4 w-4" />
              Get Embed Code
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            {STATUS_OPTIONS.map((s) => (
              <TabsTrigger key={s.value} value={s.value}>{s.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Lead Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No leads found"
          description={search || statusFilter ? 'Try changing your filters.' : 'Leads from your website will appear here.'}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {leads.map((lead) => (
              <Card
                key={lead.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedLead(lead); setNotes(lead.notes ?? ''); }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{lead.name}</CardTitle>
                    <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">{lead.message}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {lead.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {lead.email}
                      </span>
                    )}
                    {lead.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {lead.phone}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {formatDate(lead.createdAt)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({total} leads)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedLead?.name}</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm">{selectedLead.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedLead.email && (
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">{selectedLead.email}</a>
                  </div>
                )}
                {selectedLead.phone && (
                  <div>
                    <span className="text-muted-foreground">Phone: </span>
                    <a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">{selectedLead.phone}</a>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Source: </span>{selectedLead.source}
                </div>
                <div>
                  <span className="text-muted-foreground">Date: </span>{formatDate(selectedLead.createdAt)}
                </div>
              </div>
              {selectedLead.phone && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`tel:${selectedLead.phone}`}><Phone className="mr-1 h-3 w-3" /> Call</a>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={generateWhatsAppLink(selectedLead.phone, `Hi ${selectedLead.name}, thanks for reaching out!`)} target="_blank" rel="noopener noreferrer">
                      <MessageSquare className="mr-1 h-3 w-3" /> WhatsApp
                    </a>
                  </Button>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={selectedLead.status}
                  onValueChange={(val) => updateLead(selectedLead.id, { status: val })}
                  disabled={updating}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="CONTACTED">Contacted</SelectItem>
                    <SelectItem value="CONVERTED">Converted</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  rows={3}
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => updateLead(selectedLead.id, { notes })}
                  disabled={updating}
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Notes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={showEmbed} onOpenChange={setShowEmbed}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Embed Contact Form</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Paste this HTML into your website. Leads will appear here automatically.
          </p>
          <pre className="rounded-lg bg-muted p-4 text-xs overflow-auto max-h-64">
            {embedCode}
          </pre>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(embedCode);
              toast.success('Copied to clipboard!');
            }}
          >
            Copy Code
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
