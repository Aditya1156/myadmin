import { z } from 'zod';

const phoneRegex = /^(\+91)?[6-9]\d{9}$/;

export const CreateCitySchema = z.object({
  name: z.string().min(2, 'City name must be at least 2 characters'),
  state: z.string().default('Karnataka'),
  totalShops: z.number().int().min(0).default(0),
  notes: z.string().optional(),
  assignedToId: z.string().optional(),
});

export const UpdateCitySchema = CreateCitySchema.partial();

export const CreateAreaSchema = z.object({
  name: z.string().min(2, 'Area name must be at least 2 characters'),
  cityId: z.string().min(1, 'City is required'),
});

export const CreateBusinessSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  ownerName: z.string().min(2, 'Owner name is required'),
  phone: z.string().regex(phoneRegex, 'Invalid Indian mobile number'),
  alternatePhone: z
    .string()
    .regex(phoneRegex, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  category: z.enum([
    'SALON', 'GYM', 'HOTEL', 'CLINIC', 'RESTAURANT', 'SCHOOL',
    'COLLEGE', 'RETAIL', 'PHARMACY', 'AUTOMOBILE', 'REAL_ESTATE',
    'COACHING', 'OTHER',
  ]),
  cityId: z.string().min(1, 'City is required'),
  areaId: z.string().optional(),
  address: z.string().optional(),
  googleMapsLink: z.string().url('Invalid URL').optional().or(z.literal('')),
  hasWebsite: z.boolean().default(false),
  existingWebsite: z.string().url('Invalid URL').optional().or(z.literal('')),
  hasGBP: z.boolean().default(false),
  services: z
    .array(z.enum(['WEBSITE', 'GBP', 'ERP', 'SOCIAL_MEDIA', 'SEO', 'LOGO_BRANDING']))
    .min(1, 'Select at least one service'),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  status: z
    .enum([
      'NOT_VISITED', 'VISITED', 'INTERESTED', 'NEGOTIATION',
      'CLOSED_WON', 'CLOSED_LOST', 'FOLLOW_UP',
    ])
    .default('NOT_VISITED'),
  visitType: z.enum(['CALL', 'OFFLINE', 'WHATSAPP']).optional(),
  followUpDate: z.string().optional(),
  estimatedValue: z.number().min(0).optional(),
  notes: z.string().optional(),
  mistakeNotes: z.string().optional(),
  failureReason: z
    .enum([
      'PRICE_ISSUE', 'TRUST_ISSUE', 'ALREADY_HAS_SERVICE', 'NOT_DECISION_MAKER',
      'NOT_INTERESTED', 'BAD_TIMING', 'WENT_TO_COMPETITOR', 'NO_BUDGET', 'OTHER',
    ])
    .optional(),
});

export const UpdateBusinessSchema = CreateBusinessSchema.partial();

export const CreateActivitySchema = z.object({
  businessId: z.string().min(1, 'Business is required'),
  type: z.enum(['CALL', 'VISIT', 'FOLLOW_UP', 'WHATSAPP', 'EMAIL', 'DEMO']),
  outcome: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'NO_RESPONSE', 'CALLBACK_REQUESTED']),
  remark: z.string().min(3, 'Please add a remark'),
  nextFollowUpDate: z.string().optional(),
});

export const CreateDealSchema = z.object({
  businessId: z.string().min(1, 'Business is required'),
  service: z.enum(['WEBSITE', 'GBP', 'ERP', 'SOCIAL_MEDIA', 'SEO', 'LOGO_BRANDING']),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID', 'REFUNDED']).default('PENDING'),
  paidAmount: z.number().min(0).default(0),
  signedDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
  contractDurationMonths: z.number().int().min(1).max(60).default(12),
  renewalNotes: z.string().optional(),
  parentDealId: z.string().optional(),
});

export const UpdateDealSchema = CreateDealSchema.partial().omit({ businessId: true });

export const UpdateRenewalStatusSchema = z.object({
  renewalStatus: z.enum(['PENDING', 'CONTACTED', 'RENEWED', 'CHURNED', 'NOT_APPLICABLE']),
  renewalNotes: z.string().optional(),
});

export const BulkImportBusinessSchema = z.object({
  businessName: z.string().min(1),
  ownerName: z.string().min(1),
  phone: z.string().min(10),
  alternatePhone: z.string().optional(),
  category: z.string().min(1),
  cityName: z.string().min(1),
  areaName: z.string().optional(),
  address: z.string().optional(),
  hasWebsite: z.string().optional(),
  hasGBP: z.string().optional(),
  services: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  visitType: z.string().optional(),
  followUpDate: z.string().optional(),
  estimatedValue: z.string().optional(),
  notes: z.string().optional(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const BusinessFiltersSchema = z.object({
  cityId: z.string().optional(),
  areaId: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  services: z.string().optional(),
  search: z.string().optional(),
  createdById: z.string().optional(),
  followUpOverdue: z.string().optional(),
});

export type CreateCityInput = z.infer<typeof CreateCitySchema>;
export type UpdateCityInput = z.infer<typeof UpdateCitySchema>;
export type CreateAreaInput = z.infer<typeof CreateAreaSchema>;
export type CreateBusinessInput = z.infer<typeof CreateBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof UpdateBusinessSchema>;
export type CreateActivityInput = z.infer<typeof CreateActivitySchema>;
export type CreateDealInput = z.infer<typeof CreateDealSchema>;
export type UpdateDealInput = z.infer<typeof UpdateDealSchema>;
export type UpdateRenewalStatusInput = z.infer<typeof UpdateRenewalStatusSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type BusinessFiltersInput = z.infer<typeof BusinessFiltersSchema>;
