'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useIndianCities } from '@/hooks/use-indian-cities';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MapPin, Plus, ChevronsUpDown, Check } from 'lucide-react';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface CityAssignedTo {
  id: string;
  name: string;
  email: string;
}

interface CityItem {
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
  _count: {
    areas: number;
    businesses: number;
  };
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ────────────────────────────────────────────────────────────────
// Page Component
// ────────────────────────────────────────────────────────────────

export default function CitiesPage() {
  const router = useRouter();
  const { dbUser, loading: userLoading } = useCurrentUser();

  const [cities, setCities] = useState<CityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formState, setFormState] = useState('Karnataka');
  const [formTotalShops, setFormTotalShops] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formAssignedToId, setFormAssignedToId] = useState('');

  const { cities: indianCities, loading: indianCitiesLoading } = useIndianCities();

  const isAdminOrManager =
    dbUser?.role === 'ADMIN' || dbUser?.role === 'MANAGER';

  // ──────────────────────────────────────────────────────────────
  // Fetch cities
  // ──────────────────────────────────────────────────────────────

  const fetchCities = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cities');
      if (!res.ok) throw new Error('Failed to fetch cities');
      const json = await res.json();
      setCities(json.data ?? []);
    } catch {
      toast.error('Failed to load cities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  // ──────────────────────────────────────────────────────────────
  // Fetch users for dropdown (lazy load when dialog opens)
  // ──────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    if (users.length > 0) return; // already loaded
    try {
      setUsersLoading(true);
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const json = await res.json();
      setUsers(json.data ?? []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, [users.length]);

  // ──────────────────────────────────────────────────────────────
  // Handle dialog open
  // ──────────────────────────────────────────────────────────────

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (open) {
      fetchUsers();
    } else {
      resetForm();
    }
  }

  function resetForm() {
    setFormName('');
    setFormState('Karnataka');
    setFormTotalShops('');
    setFormNotes('');
    setFormAssignedToId('');
  }

  // ──────────────────────────────────────────────────────────────
  // Submit new city
  // ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formName.trim()) {
      toast.error('City name is required');
      return;
    }

    try {
      setSubmitting(true);

      const payload: Record<string, unknown> = {
        name: formName.trim(),
        state: formState.trim() || 'Karnataka',
        totalShops: formTotalShops ? parseInt(formTotalShops, 10) : 0,
      };

      if (formNotes.trim()) {
        payload.notes = formNotes.trim();
      }

      if (formAssignedToId && formAssignedToId !== '_none') {
        payload.assignedToId = formAssignedToId;
      }

      const res = await fetch('/api/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to create city');
      }

      toast.success(json.message || 'City created successfully');
      setDialogOpen(false);
      resetForm();
      fetchCities();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create city');
    } finally {
      setSubmitting(false);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Computed values for a city card
  // ──────────────────────────────────────────────────────────────

  function getCityStats(city: CityItem) {
    const total = city._count.businesses;
    const estimated = city.totalShops || total;
    const visitedCount = total; // all businesses in system are at least "tracked"
    const conversionPct =
      estimated > 0 ? Math.round((total / estimated) * 100) : 0;
    return { total, estimated, visitedCount, conversionPct };
  }

  // ──────────────────────────────────────────────────────────────
  // Render: Loading skeleton
  // ──────────────────────────────────────────────────────────────

  if (loading || userLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // Render: Empty state
  // ──────────────────────────────────────────────────────────────

  if (!loading && cities.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Cities"
          description="Manage your city territories"
          action={
            isAdminOrManager ? (
              <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add City
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New City</DialogTitle>
                  </DialogHeader>
                  <AddCityForm
                    formName={formName}
                    setFormName={setFormName}
                    formState={formState}
                    setFormState={setFormState}
                    formTotalShops={formTotalShops}
                    setFormTotalShops={setFormTotalShops}
                    formNotes={formNotes}
                    setFormNotes={setFormNotes}
                    formAssignedToId={formAssignedToId}
                    setFormAssignedToId={setFormAssignedToId}
                    users={users}
                    usersLoading={usersLoading}
                    submitting={submitting}
                    onSubmit={handleSubmit}
                    indianCities={indianCities}
                    indianCitiesLoading={indianCitiesLoading}
                  />
                </DialogContent>
              </Dialog>
            ) : undefined
          }
        />
        <EmptyState
          icon={MapPin}
          title="No cities yet"
          description="Get started by adding your first city territory to track businesses and sales progress."
          action={
            isAdminOrManager
              ? { label: 'Add City', onClick: () => setDialogOpen(true) }
              : undefined
          }
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // Render: Cities grid
  // ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cities"
        description="Manage your city territories"
        action={
          isAdminOrManager ? (
            <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add City
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New City</DialogTitle>
                </DialogHeader>
                <AddCityForm
                  formName={formName}
                  setFormName={setFormName}
                  formState={formState}
                  setFormState={setFormState}
                  formTotalShops={formTotalShops}
                  setFormTotalShops={setFormTotalShops}
                  formNotes={formNotes}
                  setFormNotes={setFormNotes}
                  formAssignedToId={formAssignedToId}
                  setFormAssignedToId={setFormAssignedToId}
                  users={users}
                  usersLoading={usersLoading}
                  submitting={submitting}
                  onSubmit={handleSubmit}
                  indianCities={indianCities}
                  indianCitiesLoading={indianCitiesLoading}
                />
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cities.map((city) => {
          const { total, estimated, conversionPct } = getCityStats(city);

          return (
            <Card
              key={city.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/cities/${city.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg leading-none tracking-tight">
                    {city.name}
                  </h3>
                  <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{city.state}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Assigned sales rep */}
                <div className="text-sm">
                  <span className="text-muted-foreground">Sales Rep: </span>
                  <span className="font-medium">
                    {city.assignedTo?.name ?? 'Unassigned'}
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-lg font-bold">{total}</p>
                    <p className="text-xs text-muted-foreground">Businesses</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-lg font-bold">{estimated}</p>
                    <p className="text-xs text-muted-foreground">Target</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-lg font-bold">{conversionPct}%</p>
                    <p className="text-xs text-muted-foreground">Coverage</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{conversionPct}%</span>
                  </div>
                  <Progress value={conversionPct} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Add City Form Component (used inside Dialog)
// ────────────────────────────────────────────────────────────────

interface AddCityFormProps {
  formName: string;
  setFormName: (v: string) => void;
  formState: string;
  setFormState: (v: string) => void;
  formTotalShops: string;
  setFormTotalShops: (v: string) => void;
  formNotes: string;
  setFormNotes: (v: string) => void;
  formAssignedToId: string;
  setFormAssignedToId: (v: string) => void;
  users: UserOption[];
  usersLoading: boolean;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  indianCities: { city: string; state: string }[];
  indianCitiesLoading: boolean;
}

function AddCityForm({
  formName,
  setFormName,
  formState,
  setFormState,
  formTotalShops,
  setFormTotalShops,
  formNotes,
  setFormNotes,
  formAssignedToId,
  setFormAssignedToId,
  users,
  usersLoading,
  submitting,
  onSubmit,
  indianCities,
  indianCitiesLoading,
}: AddCityFormProps) {
  const [cityOpen, setCityOpen] = useState(false);

  // Group cities by state for the dropdown
  const stateGroups = indianCities.reduce<Record<string, string[]>>((acc, item) => {
    if (!acc[item.state]) acc[item.state] = [];
    acc[item.state].push(item.city);
    return acc;
  }, {});

  const selectedLabel = formName
    ? `${formName}, ${formState}`
    : '';

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* City Name — Searchable dropdown */}
      <div className="space-y-2">
        <Label>City *</Label>
        <Popover open={cityOpen} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={cityOpen}
              className="w-full justify-between font-normal"
            >
              {selectedLabel || 'Search and select a city...'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Type to search cities..." />
              <CommandList>
                <CommandEmpty>
                {indianCitiesLoading ? 'Loading cities...' : 'No city found.'}
              </CommandEmpty>
                {Object.entries(stateGroups).map(([state, cities]) => (
                  <CommandGroup key={state} heading={state}>
                    {cities.map((city) => (
                      <CommandItem
                        key={`${city}-${state}`}
                        value={`${city} ${state}`}
                        onSelect={() => {
                          setFormName(city);
                          setFormState(state);
                          setCityOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            formName === city && formState === state
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        {city}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Total Shops */}
      <div className="space-y-2">
        <Label htmlFor="city-total-shops">Total Shops (estimated)</Label>
        <Input
          id="city-total-shops"
          type="number"
          min="0"
          placeholder="0"
          value={formTotalShops}
          onChange={(e) => setFormTotalShops(e.target.value)}
        />
      </div>

      {/* Assigned To */}
      <div className="space-y-2">
        <Label htmlFor="city-assigned-to">Assign to Sales Rep</Label>
        <Select value={formAssignedToId} onValueChange={setFormAssignedToId}>
          <SelectTrigger id="city-assigned-to">
            <SelectValue
              placeholder={usersLoading ? 'Loading users...' : 'Select a user'}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Unassigned</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name} ({u.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="city-notes">Notes</Label>
        <Textarea
          id="city-notes"
          placeholder="Any additional notes about this city..."
          value={formNotes}
          onChange={(e) => setFormNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting || !formName}>
          {submitting ? 'Creating...' : 'Create City'}
        </Button>
      </div>
    </form>
  );
}
