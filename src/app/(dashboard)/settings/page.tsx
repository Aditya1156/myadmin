'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  User,
  Palette,
  Bell,
  Database,
  Sun,
  Moon,
  Monitor,
  Download,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SettingsPage() {
  const { dbUser } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dbUser) {
      setName(dbUser.name);
      setPhone(dbUser.phone ?? '');
    }
  }, [dbUser]);

  const handleProfileSave = async () => {
    if (!dbUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${dbUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/businesses/export');
      if (!res.ok) throw new Error('Export failed');
      const json = await res.json();
      const businesses = json.data?.businesses ?? [];
      if (businesses.length === 0) {
        toast.error('No data to export');
        return;
      }
      const ws = XLSX.utils.json_to_sheet(businesses);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Businesses - ${new Date().toISOString().split('T')[0]}`);
      XLSX.writeFile(wb, `nexcrm-export-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`Exported ${businesses.length} businesses`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'businessName',
      'ownerName',
      'phone',
      'alternatePhone',
      'category',
      'cityName',
      'areaName',
      'address',
      'hasWebsite',
      'hasGBP',
      'services',
      'priority',
      'status',
      'visitType',
      'followUpDate',
      'estimatedValue',
      'notes',
    ];
    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      [
        'Sample Business',
        'John Doe',
        '9876543210',
        '',
        'RESTAURANT',
        'Shivamogga',
        'Main Road',
        '123 MG Road',
        'false',
        'true',
        'WEBSITE,GBP',
        'MEDIUM',
        'NOT_VISITED',
        '',
        '',
        '15000',
        'Sample notes',
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'nexcrm-import-template.xlsx');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account and application preferences." />

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          {dbUser?.role === 'ADMIN' && (
            <TabsTrigger value="data" className="gap-2">
              <Database className="h-4 w-4" />
              Data
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={dbUser?.email ?? ''} disabled />
                <p className="text-xs text-muted-foreground mt-1">Managed by Clerk</p>
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                />
              </div>
              <div>
                <Label>Role</Label>
                <div className="mt-1">
                  <Badge>{dbUser?.role ?? 'Loading...'}</Badge>
                </div>
              </div>
              <Button onClick={handleProfileSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how TheNextURL looks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-medium">Theme</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    className="w-full justify-start gap-2"
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    className="w-full justify-start gap-2"
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    className="w-full justify-start gap-2"
                    onClick={() => setTheme('system')}
                  >
                    <Monitor className="h-4 w-4" />
                    System
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure notification preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Overdue Follow-up Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Get notified when follow-ups are overdue
                  </p>
                </div>
                <Switch defaultChecked disabled />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Daily Summary Email</p>
                  <p className="text-xs text-muted-foreground">
                    Receive a daily summary of your activities
                  </p>
                </div>
                <Switch disabled />
              </div>
              <p className="text-xs text-muted-foreground italic">
                Email notifications coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {dbUser?.role === 'ADMIN' && (
          <TabsContent value="data" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>Export and import business data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={handleExport} disabled={exporting} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    {exporting ? 'Exporting...' : 'Export All Data (Excel)'}
                  </Button>
                  <Button onClick={downloadTemplate} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download Import Template
                  </Button>
                </div>
                <Separator />
                <div>
                  <Label>Import Businesses from CSV</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleImport}
                    disabled={importing}
                    className="mt-2"
                  />
                  {importing && (
                    <p className="text-sm text-muted-foreground mt-1">Processing...</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  These actions are irreversible. Use with extreme caution.
                </p>
                <Button variant="destructive" disabled>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Purge Test Data (Coming Soon)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
