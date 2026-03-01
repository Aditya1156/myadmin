'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Building2,
  Globe,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
} from 'lucide-react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { PageHeader } from '@/components/shared/page-header';
import { CreateBusinessSchema, type CreateBusinessInput } from '@/lib/validations';
import { cn } from '@/lib/utils';
import {
  BUSINESS_CATEGORIES,
  SERVICE_TYPES,
  BUSINESS_STATUSES,
  PRIORITY_OPTIONS,
  VISIT_TYPES,
  FAILURE_REASONS,
} from '@/lib/constants';

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

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 1, label: 'Business Info', icon: Building2 },
  { id: 2, label: 'Digital Presence', icon: Globe },
  { id: 3, label: 'Visit Info', icon: CalendarCheck },
] as const;

// Fields to validate per step
const STEP_FIELDS: Record<number, (keyof CreateBusinessInput)[]> = {
  1: ['businessName', 'ownerName', 'phone', 'alternatePhone', 'category', 'cityId', 'areaId', 'address', 'googleMapsLink'],
  2: ['hasWebsite', 'existingWebsite', 'hasGBP', 'services', 'estimatedValue', 'priority'],
  3: ['status', 'visitType', 'followUpDate', 'notes', 'mistakeNotes', 'failureReason'],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewBusinessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown data
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // Pre-fill cityId from query params (when coming from city detail page)
  const prefillCityId = searchParams.get('cityId') ?? '';

  const form = useForm<CreateBusinessInput>({
    resolver: zodResolver(CreateBusinessSchema),
    defaultValues: {
      businessName: '',
      ownerName: '',
      phone: '',
      alternatePhone: '',
      category: undefined,
      cityId: prefillCityId,
      areaId: '',
      address: '',
      googleMapsLink: '',
      hasWebsite: false,
      existingWebsite: '',
      hasGBP: false,
      services: [],
      estimatedValue: undefined,
      priority: 'MEDIUM',
      status: 'NOT_VISITED',
      visitType: undefined,
      followUpDate: '',
      notes: '',
      mistakeNotes: '',
      failureReason: undefined,
    },
  });

  const watchCityId = form.watch('cityId');
  const watchHasWebsite = form.watch('hasWebsite');
  const watchStatus = form.watch('status');

  // ---- Fetch cities ----
  useEffect(() => {
    setLoadingCities(true);
    fetch('/api/cities?limit=100')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCities(json.data);
        }
      })
      .catch(() => toast.error('Failed to load cities'))
      .finally(() => setLoadingCities(false));
  }, []);

  // ---- Fetch areas when city changes ----
  useEffect(() => {
    if (!watchCityId) {
      setAreas([]);
      return;
    }
    setLoadingAreas(true);
    fetch(`/api/areas?cityId=${watchCityId}&limit=200`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setAreas(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAreas(false));
  }, [watchCityId]);

  // ---- Step navigation ----
  async function goNext() {
    const fieldsToValidate = STEP_FIELDS[step];
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep((s) => Math.min(s + 1, 3));
    }
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  // ---- Submit ----
  async function onSubmit(data: CreateBusinessInput) {
    setSubmitting(true);
    try {
      // Clean up optional empty strings
      const payload: Record<string, unknown> = { ...data };
      if (!payload.alternatePhone) delete payload.alternatePhone;
      if (!payload.googleMapsLink) delete payload.googleMapsLink;
      if (!payload.existingWebsite) delete payload.existingWebsite;
      if (!payload.followUpDate) delete payload.followUpDate;
      if (!payload.areaId) delete payload.areaId;
      if (!payload.visitType) delete payload.visitType;
      if (!payload.failureReason) delete payload.failureReason;
      if (payload.estimatedValue === undefined || payload.estimatedValue === null) {
        delete payload.estimatedValue;
      }

      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success && json.data) {
        toast.success('Business created successfully!');
        router.push(`/businesses/${json.data.id}`);
      } else {
        toast.error(json.error ?? 'Failed to create business');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Today's date string for min on date inputs
  const todayStr = new Date().toISOString().split('T')[0];

  // ---- Render ----
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <PageHeader
        title="Add New Business"
        description="Fill in the details to create a new business lead."
        action={
          <Button variant="outline" onClick={() => router.back()}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* Step Progress Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, index) => {
          const StepIcon = s.icon;
          const isActive = step === s.id;
          const isCompleted = step > s.id;

          return (
            <div key={s.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                    isCompleted
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isActive
                      ? 'border-primary bg-background text-primary'
                      : 'border-muted bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium text-center',
                    isActive
                      ? 'text-primary'
                      : isCompleted
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 -mt-5',
                    isCompleted ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* ============================================================= */}
          {/* STEP 1 - Business Info                                        */}
          {/* ============================================================= */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Business Name */}
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Sharma Hair Studio" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Owner Name */}
                <FormField
                  control={form.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Rahul Sharma" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone Numbers */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. 9876543210"
                            type="tel"
                            maxLength={13}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="alternatePhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alternate Phone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Optional"
                            type="tel"
                            maxLength={13}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BUSINESS_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* City & Area */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="cityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(val) => {
                            field.onChange(val);
                            form.setValue('areaId', '');
                          }}
                          disabled={loadingCities}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  loadingCities ? 'Loading...' : 'Select city'
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cities.map((city) => (
                              <SelectItem key={city.id} value={city.id}>
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="areaId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area</FormLabel>
                        <Select
                          value={field.value ?? ''}
                          onValueChange={field.onChange}
                          disabled={!watchCityId || loadingAreas}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  loadingAreas
                                    ? 'Loading...'
                                    : !watchCityId
                                    ? 'Select a city first'
                                    : 'Select area'
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {areas.map((area) => (
                              <SelectItem key={area.id} value={area.id}>
                                {area.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Address */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Full address (optional)"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Google Maps Link */}
                <FormField
                  control={form.control}
                  name="googleMapsLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Maps Link</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://maps.google.com/..."
                          type="url"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* ============================================================= */}
          {/* STEP 2 - Digital Presence                                     */}
          {/* ============================================================= */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Digital Presence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Has Website */}
                <FormField
                  control={form.control}
                  name="hasWebsite"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Has Website</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Does this business already have a website?
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Existing Website URL */}
                {watchHasWebsite && (
                  <FormField
                    control={form.control}
                    name="existingWebsite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Existing Website URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com"
                            type="url"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Has GBP */}
                <FormField
                  control={form.control}
                  name="hasGBP"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Has Google Business Profile
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Does this business have a Google Business Profile?
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Services (checkbox group) */}
                <FormField
                  control={form.control}
                  name="services"
                  render={() => (
                    <FormItem>
                      <FormLabel>Services Interested In *</FormLabel>
                      <p className="text-sm text-muted-foreground mb-2">
                        Select the services this business needs.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {SERVICE_TYPES.map((svc) => (
                          <FormField
                            key={svc.value}
                            control={form.control}
                            name="services"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(svc.value)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value ?? [];
                                      if (checked) {
                                        field.onChange([...current, svc.value]);
                                      } else {
                                        field.onChange(
                                          current.filter(
                                            (v: string) => v !== svc.value
                                          )
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  <span
                                    className={cn(
                                      'inline-block h-2 w-2 rounded-full mr-1.5',
                                      svc.color
                                    )}
                                  />
                                  {svc.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Estimated Value */}
                <FormField
                  control={form.control}
                  name="estimatedValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Deal Value (INR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 5000"
                          min={0}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(
                              val === '' ? undefined : Number(val)
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Priority */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex gap-6"
                        >
                          {PRIORITY_OPTIONS.map((p) => (
                            <div
                              key={p.value}
                              className="flex items-center gap-2"
                            >
                              <RadioGroupItem
                                value={p.value}
                                id={`priority-${p.value}`}
                              />
                              <Label
                                htmlFor={`priority-${p.value}`}
                                className={cn(
                                  'cursor-pointer font-normal',
                                  p.color
                                )}
                              >
                                {p.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* ============================================================= */}
          {/* STEP 3 - Visit Info                                           */}
          {/* ============================================================= */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5" />
                  Visit & Follow-up Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BUSINESS_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Visit Type */}
                <FormField
                  control={form.control}
                  name="visitType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visit Type</FormLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select visit type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VISIT_TYPES.map((v) => (
                            <SelectItem key={v.value} value={v.value}>
                              {v.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Follow-up Date */}
                <FormField
                  control={form.control}
                  name="followUpDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow-up Date</FormLabel>
                      <FormControl>
                        <Input type="date" min={todayStr} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any observations, remarks, or conversation summary..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Conditional fields for CLOSED_LOST */}
                {watchStatus === 'CLOSED_LOST' && (
                  <>
                    <FormField
                      control={form.control}
                      name="failureReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Failure Reason</FormLabel>
                          <Select
                            value={field.value ?? ''}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Why was the deal lost?" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FAILURE_REASONS.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mistakeNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mistake Notes / Learnings</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="What could have been done differently?"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* ============================================================= */}
          {/* Navigation Buttons                                            */}
          {/* ============================================================= */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Step {step} of 3
              </span>

              {step < 3 ? (
                <Button type="button" onClick={goNext}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Create Business
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
