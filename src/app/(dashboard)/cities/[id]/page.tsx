'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/shared/stat-card';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import {
  Trash2,
  Plus,
  ArrowLeft,
  Building2,
  Eye,
  Star,
  Trophy,
  XCircle,
  IndianRupee,
  MapPin,
} from 'lucide-react';
import type { BusinessStatus } from '@prisma/client';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface CityArea {
  id: string;
  name: string;
  cityId: string;
  createdAt: string;
  _count: {
    businesses: number;
  };
}

interface CityAssignedTo {
  id: string;
  name: string;
  email: string;
}

interface CityDetail {
  id: string;
  name: string;
  state: string;
  totalShops: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignedToId: string | null;
  assignedTo: CityAssignedTo | null;
  areas: CityArea[];
  _count: {
    areas: number;
    businesses: number;
  };
  businessSummary: Record<string, number>;
}

interface CityStats {
  cityId: string;
  cityName: string;
  totalBusinesses: number;
  visited: number;
  interested: number;
  won: number;
  lost: number;
  revenue: number;
  conversionRate: number;
}

interface BusinessRow {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  category: string;
  status: BusinessStatus;
  priority: string;
  estimatedValue: number | null;
  area: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
}

// ────────────────────────────────────────────────────────────────
// Page Component
// ────────────────────────────────────────────────────────────────

export default function CityDetailPage() {
  const params = useParams<{ id: string }>();
  const cityId = params.id;

  const [city, setCity] = useState<CityDetail | null>(null);
  const [stats, setStats] = useState<CityStats | null>(null);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessesLoading, setBusinessesLoading] = useState(true);

  // Area inline form
  const [newAreaName, setNewAreaName] = useState('');
  const [addingArea, setAddingArea] = useState(false);
  const [deletingAreaId, setDeletingAreaId] = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────
  // Fetch city details
  // ──────────────────────────────────────────────────────────────

  const fetchCity = useCallback(async () => {
    try {
      const res = await fetch(`/api/cities/${cityId}`);
      if (!res.ok) throw new Error('Failed to fetch city');
      const json = await res.json();
      setCity(json.data);
    } catch {
      toast.error('Failed to load city details');
    }
  }, [cityId]);

  // ──────────────────────────────────────────────────────────────
  // Fetch city stats
  // ──────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/cities/${cityId}/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      const json = await res.json();
      setStats(json.data);
    } catch {
      toast.error('Failed to load city stats');
    }
  }, [cityId]);

  // ──────────────────────────────────────────────────────────────
  // Fetch businesses for this city
  // ──────────────────────────────────────────────────────────────

  const fetchBusinesses = useCallback(async () => {
    try {
      setBusinessesLoading(true);
      const res = await fetch(`/api/businesses?cityId=${cityId}&limit=100`);
      if (!res.ok) throw new Error('Failed to fetch businesses');
      const json = await res.json();
      setBusinesses(json.data ?? []);
    } catch {
      toast.error('Failed to load businesses');
    } finally {
      setBusinessesLoading(false);
    }
  }, [cityId]);

  // ──────────────────────────────────────────────────────────────
  // Initial load
  // ──────────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      await Promise.all([fetchCity(), fetchStats()]);
      setLoading(false);
    }
    loadAll();
    fetchBusinesses();
  }, [fetchCity, fetchStats, fetchBusinesses]);

  // ──────────────────────────────────────────────────────────────
  // Add area
  // ──────────────────────────────────────────────────────────────

  async function handleAddArea(e: React.FormEvent) {
    e.preventDefault();

    const name = newAreaName.trim();
    if (!name) {
      toast.error('Area name is required');
      return;
    }

    try {
      setAddingArea(true);
      const res = await fetch('/api/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, cityId }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to create area');
      }

      toast.success(json.message || 'Area created successfully');
      setNewAreaName('');
      fetchCity(); // refresh city data to show new area
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create area'
      );
    } finally {
      setAddingArea(false);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Delete area
  // ──────────────────────────────────────────────────────────────

  async function handleDeleteArea(areaId: string) {
    try {
      setDeletingAreaId(areaId);
      const res = await fetch(`/api/areas/${areaId}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to delete area');
      }

      toast.success(json.message || 'Area deleted successfully');
      fetchCity(); // refresh city data
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete area'
      );
    } finally {
      setDeletingAreaId(null);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Loading skeleton
  // ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Back link skeleton */}
        <Skeleton className="h-5 w-24" />

        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
                <Skeleton className="mt-3 h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Areas skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-20" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>

        {/* Table skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <Skeleton key={j} className="h-8 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!city) {
    return (
      <div className="space-y-6">
        <Link
          href="/cities"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Cities
        </Link>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">City not found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The city you are looking for does not exist or you do not have access.
          </p>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/cities"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Cities
      </Link>

      {/* Page header */}
      <PageHeader
        title={city.name}
        description={`${city.state} ${city.assignedTo ? `- Assigned to ${city.assignedTo.name}` : '- Unassigned'}`}
        action={
          <Link href={`/businesses/new?cityId=${cityId}`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Business in This City
            </Button>
          </Link>
        }
      />

      {/* ──────────── Stats Row ──────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Businesses"
          value={stats?.totalBusinesses ?? city._count.businesses}
          icon={Building2}
          color="blue"
          loading={!stats}
        />
        <StatCard
          title="Visited"
          value={stats?.visited ?? 0}
          icon={Eye}
          color="green"
          loading={!stats}
        />
        <StatCard
          title="Interested"
          value={stats?.interested ?? 0}
          icon={Star}
          color="orange"
          loading={!stats}
        />
        <StatCard
          title="Won"
          value={stats?.won ?? 0}
          icon={Trophy}
          color="green"
          loading={!stats}
        />
        <StatCard
          title="Lost"
          value={stats?.lost ?? 0}
          icon={XCircle}
          color="red"
          loading={!stats}
        />
        <StatCard
          title="Revenue"
          value={stats ? formatCurrency(stats.revenue) : '-'}
          icon={IndianRupee}
          color="purple"
          loading={!stats}
        />
      </div>

      {/* ──────────── Areas Section ──────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Areas ({city.areas.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add area inline form */}
          <form onSubmit={handleAddArea} className="flex items-center gap-2">
            <Input
              placeholder="New area name..."
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="max-w-xs"
            />
            <Button type="submit" size="sm" disabled={addingArea}>
              <Plus className="mr-1 h-4 w-4" />
              {addingArea ? 'Adding...' : 'Add Area'}
            </Button>
          </form>

          {/* Area list */}
          {city.areas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No areas added yet. Add your first area above.
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {city.areas.map((area) => (
                <div
                  key={area.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{area.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {area._count.businesses}{' '}
                      {area._count.businesses === 1 ? 'business' : 'businesses'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={deletingAreaId === area.id}
                    onClick={() => handleDeleteArea(area.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ──────────── Businesses Table ──────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Businesses ({businesses.length})
            </CardTitle>
            <Link href={`/businesses/new?cityId=${cityId}`}>
              <Button variant="outline" size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Business
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {businessesLoading ? (
            <div className="space-y-3">
              <div className="flex gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 flex-1" />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <Skeleton key={j} className="h-10 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          ) : businesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
              <h4 className="font-semibold">No businesses yet</h4>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Start adding businesses in this city to track your sales progress.
              </p>
              <Link href={`/businesses/new?cityId=${cityId}`} className="mt-4">
                <Button size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  Add First Business
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Business Name
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Area
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Est. Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {businesses.map((biz) => (
                    <tr
                      key={biz.id}
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() =>
                        (window.location.href = `/businesses/${biz.id}`)
                      }
                    >
                      <td className="px-4 py-3 font-medium">
                        {biz.businessName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {biz.ownerName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {biz.phone}
                      </td>
                      <td className="px-4 py-3">
                        {biz.area ? (
                          <Badge variant="outline" className="text-xs">
                            {biz.area.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={biz.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">
                        {biz.category.replace(/_/g, ' ').toLowerCase()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {biz.estimatedValue != null
                          ? formatCurrency(biz.estimatedValue)
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
