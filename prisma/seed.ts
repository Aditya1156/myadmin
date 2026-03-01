import { PrismaClient, Role, BusinessCategory, ServiceType, Priority, BusinessStatus, VisitType, ActivityType, ActivityOutcome, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.deal.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.business.deleteMany();
  await prisma.area.deleteMany();
  await prisma.city.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const admin = await prisma.user.create({
    data: {
      clerkId: 'clerk_admin_001',
      name: 'Stark',
      email: 'stark@thenexturl.com',
      phone: '+919876543210',
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.create({
    data: {
      clerkId: 'clerk_manager_001',
      name: 'Shreya Sawarn',
      email: 'shreya@thenexturl.com',
      phone: '+919876543211',
      role: Role.MANAGER,
    },
  });

  const salesRep = await prisma.user.create({
    data: {
      clerkId: 'clerk_sales_001',
      name: 'Sales 1',
      email: 'sales1@thenexturl.com',
      phone: '+919876543212',
      role: Role.SALES,
    },
  });

  console.log('✅ Users created');

  // Create Cities
  const shivamogga = await prisma.city.create({
    data: {
      name: 'Shivamogga',
      state: 'Karnataka',
      totalShops: 500,
      assignedToId: salesRep.id,
    },
  });

  const mysuru = await prisma.city.create({
    data: {
      name: 'Mysuru',
      state: 'Karnataka',
      totalShops: 800,
      assignedToId: manager.id,
    },
  });

  const hubballi = await prisma.city.create({
    data: {
      name: 'Hubballi',
      state: 'Karnataka',
      totalShops: 600,
    },
  });

  const mangaluru = await prisma.city.create({
    data: {
      name: 'Mangaluru',
      state: 'Karnataka',
      totalShops: 700,
    },
  });

  console.log('✅ Cities created');

  // Create Areas (2 per city)
  const areas = await Promise.all([
    prisma.area.create({ data: { name: 'Kuvempu Nagar', cityId: shivamogga.id } }),
    prisma.area.create({ data: { name: 'Shivappa Nayaka Circle', cityId: shivamogga.id } }),
    prisma.area.create({ data: { name: 'Saraswathipuram', cityId: mysuru.id } }),
    prisma.area.create({ data: { name: 'Vijayanagar', cityId: mysuru.id } }),
    prisma.area.create({ data: { name: 'Vidyanagar', cityId: hubballi.id } }),
    prisma.area.create({ data: { name: 'Deshpande Nagar', cityId: hubballi.id } }),
    prisma.area.create({ data: { name: 'Hampankatta', cityId: mangaluru.id } }),
    prisma.area.create({ data: { name: 'Kadri', cityId: mangaluru.id } }),
  ]);

  console.log('✅ Areas created');

  // Create 8 Businesses
  const businesses = await Promise.all([
    prisma.business.create({
      data: {
        businessName: 'Glamour Salon',
        ownerName: 'Ravi Kumar',
        phone: '+919845123456',
        category: BusinessCategory.SALON,
        address: 'Shop 12, Kuvempu Nagar Main Road',
        hasWebsite: false,
        hasGBP: true,
        services: [ServiceType.WEBSITE, ServiceType.SEO],
        priority: Priority.HIGH,
        status: BusinessStatus.INTERESTED,
        visitType: VisitType.OFFLINE,
        followUpDate: new Date(Date.now() + 86400000),
        estimatedValue: 15000,
        notes: 'Owner keen on website, wants modern design',
        cityId: shivamogga.id,
        areaId: areas[0].id,
        createdById: salesRep.id,
      },
    }),
    prisma.business.create({
      data: {
        businessName: 'FitZone Gym',
        ownerName: 'Suresh Patil',
        phone: '+919845234567',
        category: BusinessCategory.GYM,
        address: '1st Floor, Mall Road',
        hasWebsite: true,
        existingWebsite: 'https://fitzone-old.com',
        hasGBP: false,
        services: [ServiceType.GBP, ServiceType.SOCIAL_MEDIA],
        priority: Priority.MEDIUM,
        status: BusinessStatus.VISITED,
        visitType: VisitType.OFFLINE,
        estimatedValue: 8000,
        cityId: shivamogga.id,
        areaId: areas[1].id,
        createdById: salesRep.id,
      },
    }),
    prisma.business.create({
      data: {
        businessName: 'Royal Hotel',
        ownerName: 'Manjunath Gowda',
        phone: '+919845345678',
        category: BusinessCategory.HOTEL,
        address: 'MG Road, Near Bus Stand',
        hasWebsite: false,
        hasGBP: false,
        services: [ServiceType.WEBSITE, ServiceType.GBP, ServiceType.SOCIAL_MEDIA],
        priority: Priority.HIGH,
        status: BusinessStatus.NEGOTIATION,
        visitType: VisitType.CALL,
        followUpDate: new Date(),
        estimatedValue: 25000,
        notes: 'Wants a booking system integrated',
        cityId: mysuru.id,
        areaId: areas[2].id,
        createdById: manager.id,
      },
    }),
    prisma.business.create({
      data: {
        businessName: 'HealthCare Clinic',
        ownerName: 'Dr. Lakshmi',
        phone: '+919845456789',
        category: BusinessCategory.CLINIC,
        address: 'Vijayanagar 2nd Stage',
        hasWebsite: true,
        existingWebsite: 'https://healthcare-mysuru.com',
        hasGBP: true,
        services: [ServiceType.SEO, ServiceType.SOCIAL_MEDIA],
        priority: Priority.LOW,
        status: BusinessStatus.CLOSED_WON,
        visitType: VisitType.OFFLINE,
        estimatedValue: 12000,
        cityId: mysuru.id,
        areaId: areas[3].id,
        createdById: manager.id,
      },
    }),
    prisma.business.create({
      data: {
        businessName: 'Spice Garden Restaurant',
        ownerName: 'Ashok Shetty',
        phone: '+919845567890',
        category: BusinessCategory.RESTAURANT,
        address: 'Vidyanagar Main Road',
        hasWebsite: false,
        hasGBP: true,
        services: [ServiceType.WEBSITE, ServiceType.GBP],
        priority: Priority.MEDIUM,
        status: BusinessStatus.FOLLOW_UP,
        visitType: VisitType.WHATSAPP,
        followUpDate: new Date(Date.now() - 172800000),
        estimatedValue: 10000,
        notes: 'Wants menu and online ordering',
        cityId: hubballi.id,
        areaId: areas[4].id,
        createdById: salesRep.id,
      },
    }),
    prisma.business.create({
      data: {
        businessName: 'Knowledge Academy',
        ownerName: 'Priya Sharma',
        phone: '+919845678901',
        category: BusinessCategory.COACHING,
        address: 'Deshpande Nagar Cross',
        hasWebsite: false,
        hasGBP: false,
        services: [ServiceType.WEBSITE, ServiceType.GBP, ServiceType.SEO],
        priority: Priority.HIGH,
        status: BusinessStatus.NOT_VISITED,
        estimatedValue: 20000,
        cityId: hubballi.id,
        areaId: areas[5].id,
        createdById: salesRep.id,
      },
    }),
    prisma.business.create({
      data: {
        businessName: 'AutoWorld Motors',
        ownerName: 'Rahul Nayak',
        phone: '+919845789012',
        category: BusinessCategory.AUTOMOBILE,
        address: 'Hampankatta Circle',
        hasWebsite: true,
        existingWebsite: 'https://autoworld.in',
        hasGBP: true,
        services: [ServiceType.ERP, ServiceType.SOCIAL_MEDIA],
        priority: Priority.MEDIUM,
        status: BusinessStatus.CLOSED_LOST,
        visitType: VisitType.OFFLINE,
        failureReason: 'PRICE_ISSUE',
        estimatedValue: 50000,
        mistakeNotes: 'Quoted too high initially',
        cityId: mangaluru.id,
        areaId: areas[6].id,
        createdById: manager.id,
      },
    }),
    prisma.business.create({
      data: {
        businessName: 'MediPlus Pharmacy',
        ownerName: 'Vinay Hegde',
        phone: '+919845890123',
        category: BusinessCategory.PHARMACY,
        address: 'Kadri Main Road',
        hasWebsite: false,
        hasGBP: false,
        services: [ServiceType.WEBSITE, ServiceType.GBP, ServiceType.LOGO_BRANDING],
        priority: Priority.HIGH,
        status: BusinessStatus.INTERESTED,
        visitType: VisitType.CALL,
        followUpDate: new Date(Date.now() + 259200000),
        estimatedValue: 18000,
        cityId: mangaluru.id,
        areaId: areas[7].id,
        createdById: salesRep.id,
      },
    }),
  ]);

  console.log('✅ Businesses created');

  // Create 3 Activities
  await Promise.all([
    prisma.activity.create({
      data: {
        type: ActivityType.VISIT,
        outcome: ActivityOutcome.POSITIVE,
        remark: 'Met the owner, showed portfolio. Very interested in website.',
        nextFollowUpDate: new Date(Date.now() + 86400000),
        businessId: businesses[0].id,
        userId: salesRep.id,
      },
    }),
    prisma.activity.create({
      data: {
        type: ActivityType.CALL,
        outcome: ActivityOutcome.CALLBACK_REQUESTED,
        remark: 'Owner busy, asked to call back tomorrow.',
        nextFollowUpDate: new Date(Date.now() + 86400000),
        businessId: businesses[2].id,
        userId: manager.id,
      },
    }),
    prisma.activity.create({
      data: {
        type: ActivityType.DEMO,
        outcome: ActivityOutcome.POSITIVE,
        remark: 'Showed SEO results demo. Client agreed to proceed.',
        businessId: businesses[3].id,
        userId: manager.id,
      },
    }),
  ]);

  console.log('✅ Activities created');

  // Create 2 Deals
  await Promise.all([
    prisma.deal.create({
      data: {
        service: ServiceType.SEO,
        amount: 12000,
        paymentStatus: PaymentStatus.PAID,
        paidAmount: 12000,
        signedDate: new Date(Date.now() - 604800000),
        invoiceNumber: 'INV-2024-001',
        businessId: businesses[3].id,
        userId: manager.id,
      },
    }),
    prisma.deal.create({
      data: {
        service: ServiceType.SOCIAL_MEDIA,
        amount: 8000,
        paymentStatus: PaymentStatus.PARTIAL,
        paidAmount: 4000,
        signedDate: new Date(Date.now() - 259200000),
        invoiceNumber: 'INV-2024-002',
        businessId: businesses[3].id,
        userId: manager.id,
      },
    }),
  ]);

  console.log('✅ Deals created');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
