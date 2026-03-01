import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAdminOrManager } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { BulkImportBusinessSchema } from '@/lib/validations';
import { Prisma, BusinessCategory, BusinessStatus, Priority, ServiceType, VisitType } from '@prisma/client';
import { ZodError } from 'zod';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';

// Valid enum values for validation
const VALID_CATEGORIES: string[] = [
  'SALON', 'GYM', 'HOTEL', 'CLINIC', 'RESTAURANT', 'SCHOOL',
  'COLLEGE', 'RETAIL', 'PHARMACY', 'AUTOMOBILE', 'REAL_ESTATE',
  'COACHING', 'OTHER',
];
const VALID_STATUSES: string[] = [
  'NOT_VISITED', 'VISITED', 'INTERESTED', 'NEGOTIATION',
  'CLOSED_WON', 'CLOSED_LOST', 'FOLLOW_UP',
];
const VALID_PRIORITIES: string[] = ['HIGH', 'MEDIUM', 'LOW'];
const VALID_SERVICES: string[] = ['WEBSITE', 'GBP', 'ERP', 'SOCIAL_MEDIA', 'SEO', 'LOGO_BRANDING'];
const VALID_VISIT_TYPES: string[] = ['CALL', 'OFFLINE', 'WHATSAPP'];

interface ImportRowError {
  row: number;
  errors: string[];
}

// POST /api/businesses/import - Bulk CSV import
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Only admins and managers can import
    if (!isAdminOrManager(user)) {
      return errorResponse('Forbidden', 403);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse('CSV file is required', 400);
    }

    if (!file.name.endsWith('.csv')) {
      return errorResponse('Only CSV files are accepted', 400);
    }

    const csvText = await file.text();

    // Parse CSV with PapaParse
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return errorResponse(`CSV parsing failed: ${parsed.errors[0].message}`, 400);
    }

    if (parsed.data.length === 0) {
      return errorResponse('CSV file is empty or has no valid rows', 400);
    }

    const rowErrors: ImportRowError[] = [];
    const validRows: Array<{
      rowIndex: number;
      data: Record<string, string>;
      cityName: string;
      areaName: string | undefined;
    }> = [];

    // Validate each row (collect errors, don't fail fast)
    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      const rowNumber = i + 2; // +2 because row 1 is header, data starts at row 2
      const errors: string[] = [];

      // Validate with Zod schema first
      const result = BulkImportBusinessSchema.safeParse(row);
      if (!result.success) {
        errors.push(...result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`));
      }

      // Additional enum validations
      const category = (row.category || '').toUpperCase().trim();
      if (category && !VALID_CATEGORIES.includes(category)) {
        errors.push(`Invalid category: ${row.category}`);
      }

      const status = (row.status || '').toUpperCase().trim();
      if (status && !VALID_STATUSES.includes(status)) {
        errors.push(`Invalid status: ${row.status}`);
      }

      const priority = (row.priority || '').toUpperCase().trim();
      if (priority && !VALID_PRIORITIES.includes(priority)) {
        errors.push(`Invalid priority: ${row.priority}`);
      }

      const visitType = (row.visitType || '').toUpperCase().trim();
      if (visitType && !VALID_VISIT_TYPES.includes(visitType)) {
        errors.push(`Invalid visitType: ${row.visitType}`);
      }

      // Validate services if provided
      if (row.services) {
        const serviceList = row.services.split(',').map((s) => s.toUpperCase().trim());
        const invalidServices = serviceList.filter((s) => s && !VALID_SERVICES.includes(s));
        if (invalidServices.length > 0) {
          errors.push(`Invalid services: ${invalidServices.join(', ')}`);
        }
      }

      // Validate estimatedValue if provided
      if (row.estimatedValue) {
        const val = parseFloat(row.estimatedValue);
        if (isNaN(val) || val < 0) {
          errors.push('estimatedValue must be a non-negative number');
        }
      }

      if (errors.length > 0) {
        rowErrors.push({ row: rowNumber, errors });
      } else {
        validRows.push({
          rowIndex: rowNumber,
          data: row,
          cityName: row.cityName.trim(),
          areaName: row.areaName?.trim() || undefined,
        });
      }
    }

    if (validRows.length === 0) {
      return successResponse(
        {
          inserted: 0,
          failed: rowErrors.length,
          errors: rowErrors,
        },
        'No valid rows to import'
      );
    }

    // Collect unique city names and area names
    const uniqueCityNames = Array.from(new Set(validRows.map((r) => r.cityName)));
    const cityAreaPairs = new Map<string, Set<string>>();
    for (const row of validRows) {
      if (row.areaName) {
        if (!cityAreaPairs.has(row.cityName)) {
          cityAreaPairs.set(row.cityName, new Set());
        }
        cityAreaPairs.get(row.cityName)!.add(row.areaName);
      }
    }

    // Execute in a transaction
    let inserted = 0;

    await prisma.$transaction(async (tx) => {
      // Step 1: Resolve or create cities
      const cityMap = new Map<string, string>(); // cityName -> cityId

      for (const cityName of uniqueCityNames) {
        let city = await tx.city.findFirst({
          where: { name: { equals: cityName, mode: 'insensitive' } },
          select: { id: true },
        });

        if (!city) {
          city = await tx.city.create({
            data: {
              name: cityName,
              state: 'Karnataka',
            },
            select: { id: true },
          });
        }

        cityMap.set(cityName, city.id);
      }

      // Step 2: Resolve or create areas within their cities
      const areaMap = new Map<string, string>(); // "cityName|areaName" -> areaId

      for (const [cityName, areaNames] of Array.from(cityAreaPairs.entries())) {
        const cityId = cityMap.get(cityName)!;

        for (const areaName of Array.from(areaNames)) {
          const key = `${cityName}|${areaName}`;

          let area = await tx.area.findFirst({
            where: {
              name: { equals: areaName, mode: 'insensitive' },
              cityId: cityId,
            },
            select: { id: true },
          });

          if (!area) {
            area = await tx.area.create({
              data: {
                name: areaName,
                cityId: cityId,
              },
              select: { id: true },
            });
          }

          areaMap.set(key, area.id);
        }
      }

      // Step 3: Insert valid business rows
      for (const validRow of validRows) {
        const row = validRow.data;
        const cityId = cityMap.get(validRow.cityName)!;
        const areaKey = validRow.areaName ? `${validRow.cityName}|${validRow.areaName}` : null;
        const areaId = areaKey ? areaMap.get(areaKey) ?? null : null;

        // Parse services
        const services: ServiceType[] = row.services
          ? (row.services
              .split(',')
              .map((s) => s.toUpperCase().trim())
              .filter((s) => VALID_SERVICES.includes(s)) as ServiceType[])
          : [];

        // Parse boolean fields
        const hasWebsite = row.hasWebsite
          ? ['true', '1', 'yes'].includes(row.hasWebsite.toLowerCase().trim())
          : false;
        const hasGBP = row.hasGBP
          ? ['true', '1', 'yes'].includes(row.hasGBP.toLowerCase().trim())
          : false;

        try {
          await tx.business.create({
            data: {
              businessName: row.businessName.trim(),
              ownerName: row.ownerName.trim(),
              phone: row.phone.trim(),
              alternatePhone: row.alternatePhone?.trim() || null,
              category: (row.category.toUpperCase().trim() || 'OTHER') as BusinessCategory,
              cityId,
              areaId,
              address: row.address?.trim() || null,
              hasWebsite,
              hasGBP,
              services: services.length > 0 ? services : ['WEBSITE'],
              priority: (row.priority?.toUpperCase().trim() || 'MEDIUM') as Priority,
              status: (row.status?.toUpperCase().trim() || 'NOT_VISITED') as BusinessStatus,
              visitType: row.visitType
                ? (row.visitType.toUpperCase().trim() as VisitType)
                : null,
              followUpDate: row.followUpDate ? new Date(row.followUpDate) : null,
              estimatedValue: row.estimatedValue ? parseFloat(row.estimatedValue) : null,
              notes: row.notes?.trim() || null,
              createdById: user.id,
            },
          });
          inserted++;
        } catch (insertError) {
          // If individual row insert fails, record error but continue
          rowErrors.push({
            row: validRow.rowIndex,
            errors: [
              insertError instanceof Error
                ? insertError.message
                : 'Failed to insert row',
            ],
          });
        }
      }
    });

    return successResponse(
      {
        inserted,
        failed: rowErrors.length,
        errors: rowErrors,
      },
      `Import complete: ${inserted} inserted, ${rowErrors.length} failed`
    );
  } catch (error) {
    if (error instanceof ZodError) return errorResponse(error.errors[0].message, 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return errorResponse('Already exists', 409);
      if (error.code === 'P2025') return errorResponse('Not found', 404);
    }
    if (error instanceof Error && error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
    if (error instanceof Error && error.message === 'Forbidden') return errorResponse('Forbidden', 403);
    console.error('[API Error]', error);
    return errorResponse('Internal server error', 500);
  }
}
