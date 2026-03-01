'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { useCurrentUser } from '@/hooks/use-current-user';
import { formatCurrency } from '@/lib/utils';
import {
  Users,
  UserCheck,
  UserPlus,
  TrendingUp,
  MapPin,
  Trophy,
  Medal,
  Award,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  assignedCities: { id: string; name: string }[];
  _count?: { businesses: number; activities: number; deals: number };
  businessCount: number;
  activityCount: number;
  dealCount: number;
  revenue: number;
}

interface CityOption {
  id: string;
  name: string;
}

export default function TeamPage() {
  const { dbUser, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editCityIds, setEditCityIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('SALES');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!userLoading && dbUser && dbUser.role === 'SALES') {
      router.push('/dashboard');
    }
  }, [dbUser, userLoading, router]);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, citiesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/cities'),
      ]);
      if (usersRes.ok) {
        const json = await usersRes.json();
        setTeam(json.data ?? []);
      }
      if (citiesRes.ok) {
        const json = await citiesRes.json();
        setCities((json.data ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }
    } catch {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const openEditDialog = (user: TeamMember) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditCityIds(user.assignedCities?.map((c) => c.id) ?? []);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editRole,
          assignedCityIds: editCityIds,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user');
      }
      toast.success('User updated successfully');
      setSelectedUser(null);
      fetchTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newName || !newEmail || !newPassword) {
      toast.error('Please fill all fields');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create user');
      }
      toast.success('Team member created successfully');
      setShowAddDialog(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('SALES');
      fetchTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const activeSalesReps = team.filter((u) => u.role === 'SALES' && u.isActive).length;
  const totalRevenue = team.reduce((sum, u) => sum + (u.revenue ?? 0), 0);
  const avgDeals =
    activeSalesReps > 0
      ? (team.filter((u) => u.role === 'SALES').reduce((sum, u) => sum + u.dealCount, 0) /
          activeSalesReps).toFixed(1)
      : '0';

  const sortedTeam = [...team].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0));

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-700" />;
    return <span className="text-sm text-muted-foreground w-5 text-center">{index + 1}</span>;
  };

  if (userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (dbUser?.role === 'SALES') return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Management"
        description="View team performance and manage assignments."
        action={
          dbUser?.role === 'ADMIN' ? (
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Team Members"
          value={team.length}
          icon={Users}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Active Sales Reps"
          value={activeSalesReps}
          icon={UserCheck}
          color="green"
          loading={loading}
        />
        <StatCard
          title="Avg Deals / Rep"
          value={avgDeals}
          icon={TrendingUp}
          color="orange"
          loading={loading}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={MapPin}
          color="purple"
          loading={loading}
        />
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedTeam.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members"
              description="Team members will appear here once they sign up."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 font-medium w-12">#</th>
                    <th className="text-left py-3 font-medium">Name</th>
                    <th className="text-left py-3 font-medium">Role</th>
                    <th className="text-right py-3 font-medium">Businesses</th>
                    <th className="text-right py-3 font-medium">Activities</th>
                    <th className="text-right py-3 font-medium">Deals</th>
                    <th className="text-right py-3 font-medium">Revenue</th>
                    {dbUser?.role === 'ADMIN' && (
                      <th className="text-right py-3 font-medium">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedTeam.map((member, index) => (
                    <tr key={member.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3">{getRankIcon(index)}</td>
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant={member.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">{member.businessCount}</td>
                      <td className="py-3 text-right">{member.activityCount}</td>
                      <td className="py-3 text-right">{member.dealCount}</td>
                      <td className="py-3 text-right font-medium">
                        {formatCurrency(member.revenue ?? 0)}
                      </td>
                      {dbUser?.role === 'ADMIN' && (
                        <td className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(member)}
                          >
                            Edit
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Full Name</Label>
              <Input
                placeholder="John Doe"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SALES">Sales</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={creating}>
                {creating ? 'Creating...' : 'Create Member'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="SALES">Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned Cities</Label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {cities.map((city) => (
                  <div key={city.id} className="flex items-center gap-2">
                    <Checkbox
                      id={city.id}
                      checked={editCityIds.includes(city.id)}
                      onCheckedChange={(checked) => {
                        setEditCityIds((prev) =>
                          checked ? [...prev, city.id] : prev.filter((id) => id !== city.id)
                        );
                      }}
                    />
                    <label htmlFor={city.id} className="text-sm">
                      {city.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveUser} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
