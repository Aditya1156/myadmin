'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  Phone,
  MessageSquare,
  Mail,
  Eye,
  Pencil,
  Activity,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge, PriorityBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useDebounce } from '@/hooks/use-debounce';
import { useCurrentUser } from '@/hooks/use-current-user';
import { formatDate, generateWhatsAppLink, cn } from '@/lib/utils';
import {
  BUSINESS_CATEGORIES,
  SERVICE_TYPES,
  BUSINESS_STATUSES,
  PRIORITY_OPTIONS,
} from '@/lib/constants';

import type { BusinessStatus, Priority } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface City {
  id: string;
  name: string;
}

interface Area {
  id: string;
  name: string;
}

interface Business {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  alternatePhone?: string | null;
  category: string;
  status: BusinessStatus;
  priority: Priority;
  services: string[];
  estimatedValue?: number | null;
  followUpDate?: string | null;
  hasWebsite: boolean;
  hasGBP: boolean;
  address?: string | null;
  googleMapsLink?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  city?: City | null;
  area?: Area | null;
  cityId: string;
  areaId?: string | null;
  createdBy?: { name: string } | null;
}

interface ApiMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Filters {
  cityId: string;
  areaId: string;
  category: string[];
  status: string[];
  priority: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFollowUpColor(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const followUp = new Date(dateStr);
  followUp.setHours(0, 0, 0, 0);

  if (followUp < today) return 'text-red-600 font-semibold';
  if (followUp.getTime() === today.getTime()) return 'text-orange-600 font-semibold';
  return 'text-green-600';
}

function exportToExcel(businesses: Business[]) {
  const ws = XLSX.utils.json_to_sheet(
    businesses.map((b) => ({
      'Business Name': b.businessName,
      Owner: b.ownerName,
      Phone: b.phone,
      City: b.city?.name,
      Area: b.area?.name,
      Category: b.category,
      Status: b.status,
      Priority: b.priority,
      Services: b.services?.join(', '),
      'Estimated Value': b.estimatedValue,
      Created: b.createdAt,
    }))
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Businesses');
  XLSX.writeFile(
    wb,
    `nexcrm-businesses-${new Date().toISOString().split('T')[0]}.xlsx`
  );
}

function countActiveFilters(filters: Filters): number {
  let count = 0;
  if (filters.cityId) count++;
  if (filters.areaId) count++;
  if (filters.category.length > 0) count++;
  if (filters.status.length > 0) count++;
  if (filters.priority) count++;
  return count;
}

const DEFAULT_FILTERS: Filters = {
  cityId: '',
  areaId: '',
  category: [],
  status: [],
  priority: '',
};

const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BusinessesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dbUser } = useCurrentUser();
  const csvInputRef = useRef<HTMLInputElement>(null);

  // ---- State ----
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkAction, setBulkAction] = useState('');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailBusiness, setEmailBusiness] = useState<Business | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [filters, setFilters] = useState<Filters>({
    cityId: searchParams.get('cityId') ?? '',
    areaId: searchParams.get('areaId') ?? '',
    category: searchParams.get('category')
      ? searchParams.get('category')!.split(',')
      : [],
    status: searchParams.get('status')
      ? searchParams.get('status')!.split(',')
      : [],
    priority: searchParams.get('priority') ?? '',
  });

  const [cities, setCities] = useState<City[]>([]);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // ---- Fetch cities for the filter dropdown ----
  useEffect(() => {
    fetch('/api/cities?limit=100')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCities(json.data);
        }
      })
      .catch(() => {});
  }, []);

  // ---- Fetch businesses ----
  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filters.cityId) params.set('cityId', filters.cityId);
      if (filters.areaId) params.set('areaId', filters.areaId);
      if (filters.category.length > 0)
        params.set('category', filters.category.join(','));
      if (filters.status.length > 0)
        params.set('status', filters.status.join(','));
      if (filters.priority) params.set('priority', filters.priority);

      const res = await fetch(`/api/businesses?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setBusinesses(json.data ?? []);
        setMeta(json.meta ?? null);
      } else {
        toast.error(json.error ?? 'Failed to fetch businesses');
      }
    } catch {
      toast.error('Failed to fetch businesses');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filters]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Reset to page 1 when search / filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  // ---- Export handler ----
  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '10000');
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filters.cityId) params.set('cityId', filters.cityId);
      if (filters.areaId) params.set('areaId', filters.areaId);
      if (filters.category.length > 0)
        params.set('category', filters.category.join(','));
      if (filters.status.length > 0)
        params.set('status', filters.status.join(','));
      if (filters.priority) params.set('priority', filters.priority);

      const res = await fetch(`/api/businesses?${params.toString()}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        exportToExcel(json.data);
        toast.success(`Exported ${json.data.length} businesses`);
      } else {
        toast.error('Export failed');
      }
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  // ---- CSV Import handler ----
  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/businesses/import', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');
      toast.success(
        `Import complete: ${json.data?.inserted ?? 0} added, ${json.data?.failed ?? 0} failed`
      );
      fetchBusinesses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  }

  // ---- Bulk action handler ----
  const selectedBusinessIds = Object.keys(rowSelection)
    .filter((key) => rowSelection[key])
    .map((key) => businesses[parseInt(key)]?.id)
    .filter(Boolean);

  async function handleBulkAction(action: string, value?: string) {
    if (selectedBusinessIds.length === 0) {
      toast.error('Select at least one business');
      return;
    }
    if (action === 'delete' && !confirm(`Delete ${selectedBusinessIds.length} businesses? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch('/api/businesses/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          businessIds: selectedBusinessIds,
          value,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Bulk action failed');
      toast.success(json.message || `${json.data?.affected ?? 0} businesses updated`);
      setRowSelection({});
      fetchBusinesses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk action failed');
    }
  }

  // ---- Email handler ----
  function openEmailDialog(business: Business) {
    setEmailBusiness(business);
    setEmailSubject(`Regarding ${business.businessName}`);
    setEmailBody(`Dear ${business.ownerName},\n\nThank you for your interest in our services.\n\nBest regards,\nTheNextURL Team`);
    setShowEmailDialog(true);
  }

  function sendEmail() {
    if (!emailBusiness) return;
    // Open mailto link (works universally without email server setup)
    const mailto = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailto, '_blank');
    setShowEmailDialog(false);
    toast.success('Email client opened');
  }

  // ---- Filter helpers ----
  function toggleCategoryFilter(value: string) {
    setFilters((prev) => ({
      ...prev,
      category: prev.category.includes(value)
        ? prev.category.filter((c) => c !== value)
        : [...prev.category, value],
    }));
  }

  function toggleStatusFilter(value: string) {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(value)
        ? prev.status.filter((s) => s !== value)
        : [...prev.status, value],
    }));
  }

  function clearFilters() {
    setFilters({ ...DEFAULT_FILTERS });
  }

  const activeFilterCount = countActiveFilters(filters);

  // ---- Table columns ----
  const columns: ColumnDef<Business>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'businessName',
      header: 'Business Name',
      cell: ({ row }) => (
        <Link
          href={`/businesses/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.businessName}
        </Link>
      ),
    },
    {
      accessorKey: 'ownerName',
      header: 'Owner',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.ownerName}</span>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => {
        const phone = row.original.phone;
        const waLink = generateWhatsAppLink(phone, '');
        return (
          <div className="flex items-center gap-2">
            <a
              href={`tel:${phone}`}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </a>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-700"
              title="WhatsApp"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </a>
          </div>
        );
      },
    },
    {
      id: 'location',
      header: 'City / Area',
      cell: ({ row }) => {
        const city = row.original.city?.name ?? '-';
        const area = row.original.area?.name;
        return (
          <span className="text-sm">
            {city}
            {area ? ` / ${area}` : ''}
          </span>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const cat = BUSINESS_CATEGORIES.find(
          (c) => c.value === row.original.category
        );
        return (
          <Badge variant="secondary" className="text-xs">
            {cat?.label ?? row.original.category}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'services',
      header: 'Services',
      cell: ({ row }) => {
        const services = row.original.services ?? [];
        if (services.length === 0) return <span className="text-muted-foreground text-xs">None</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {services.map((svc) => {
              const serviceInfo = SERVICE_TYPES.find((s) => s.value === svc);
              return (
                <Badge
                  key={svc}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                >
                  {serviceInfo?.label ?? svc}
                </Badge>
              );
            })}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} />
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => (
        <PriorityBadge priority={row.original.priority} />
      ),
    },
    {
      accessorKey: 'followUpDate',
      header: 'Follow-up',
      cell: ({ row }) => {
        const date = row.original.followUpDate;
        if (!date) return <span className="text-muted-foreground text-xs">-</span>;
        return (
          <span className={cn('text-sm', getFollowUpColor(date))}>
            {formatDate(date)}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const business = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push(`/businesses/${business.id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/businesses/${business.id}/edit`)
                }
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEmailDialog(business)}>
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  router.push(
                    `/businesses/${business.id}?tab=activity&action=log`
                  )
                }
              >
                <Activity className="mr-2 h-4 w-4" />
                Log Activity
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // ---- TanStack table instance ----
  const table = useReactTable({
    data: businesses,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: meta?.totalPages ?? -1,
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
  });

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Businesses"
        description="Manage all your business leads and clients."
        action={
          <Link href="/businesses/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Business
            </Button>
          </Link>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search businesses, owners, phone..."
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

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Filter Sheet */}
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter Businesses</SheetTitle>
                <SheetDescription>
                  Narrow down businesses using the filters below.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* City */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">City</Label>
                  <Select
                    value={filters.cityId}
                    onValueChange={(val) =>
                      setFilters((prev) => ({
                        ...prev,
                        cityId: val === '__all__' ? '' : val,
                        areaId: '',
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All cities</SelectItem>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category multi-select */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Category</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {BUSINESS_CATEGORIES.map((cat) => (
                      <label
                        key={cat.value}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.category.includes(cat.value)}
                          onCheckedChange={() => toggleCategoryFilter(cat.value)}
                        />
                        {cat.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status multi-select */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {BUSINESS_STATUSES.map((s) => (
                      <label
                        key={s.value}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.status.includes(s.value)}
                          onCheckedChange={() => toggleStatusFilter(s.value)}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Priority</Label>
                  <Select
                    value={filters.priority}
                    onValueChange={(val) =>
                      setFilters((prev) => ({
                        ...prev,
                        priority: val === '__all__' ? '' : val,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All priorities</SelectItem>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SheetFooter className="mt-6">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="flex-1"
                >
                  Clear All
                </Button>
                <SheetClose asChild>
                  <Button className="flex-1">Apply</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* CSV Import */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,.xlsx"
            onChange={handleCsvImport}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => csvInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Import
          </Button>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>

          {/* Add Business (secondary CTA in toolbar) */}
          <Link href="/businesses/new" className="hidden sm:block">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Business
            </Button>
          </Link>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedBusinessIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">
            {selectedBusinessIds.length} selected
          </span>
          <Select value={bulkAction} onValueChange={(val) => {
            if (val === 'delete') {
              handleBulkAction('delete');
            } else if (val.startsWith('status_')) {
              handleBulkAction('update_status', val.replace('status_', ''));
            } else if (val.startsWith('priority_')) {
              handleBulkAction('update_priority', val.replace('priority_', ''));
            }
            setBulkAction('');
          }}>
            <SelectTrigger className="w-[200px] h-8">
              <SelectValue placeholder="Bulk Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status_VISITED">Set Visited</SelectItem>
              <SelectItem value="status_INTERESTED">Set Interested</SelectItem>
              <SelectItem value="status_CLOSED_WON">Set Won</SelectItem>
              <SelectItem value="status_CLOSED_LOST">Set Lost</SelectItem>
              <SelectItem value="priority_HIGH">Priority: High</SelectItem>
              <SelectItem value="priority_MEDIUM">Priority: Medium</SelectItem>
              <SelectItem value="priority_LOW">Priority: Low</SelectItem>
              {(dbUser?.role === 'ADMIN' || dbUser?.role === 'MANAGER') && (
                <SelectItem value="delete">
                  <span className="text-destructive">Delete Selected</span>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRowSelection({})}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={9} />
      ) : businesses.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No businesses found"
          description={
            search || activeFilterCount > 0
              ? 'Try adjusting your search or filters.'
              : 'Get started by adding your first business lead.'
          }
          action={
            search || activeFilterCount > 0
              ? {
                  label: 'Clear Filters',
                  onClick: () => {
                    setSearch('');
                    clearFilters();
                  },
                }
              : { label: 'Add Business', href: '/businesses/new' }
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {meta && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing{' '}
                {Math.min((page - 1) * PAGE_SIZE + 1, meta.total)}-
                {Math.min(page * PAGE_SIZE, meta.total)} of {meta.total}{' '}
                businesses
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Page {meta.page} of {meta.totalPages}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(meta.totalPages, p + 1))
                  }
                  disabled={page >= meta.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>
              Compose an email to {emailBusiness?.ownerName} ({emailBusiness?.businessName})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={sendEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Open in Email Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
