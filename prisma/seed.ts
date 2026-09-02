import { PrismaClient, DayOfWeek, LocationType, BookingStatus, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'Passw0rd!';

const WEEKDAY_9_TO_5 = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY];

async function seedProfessional(params: {
  email: string;
  name: string;
  businessName: string;
  username: string;
  bio: string;
  category: string;
  avatarUrl: string;
  location: string;
  phone: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  googleCalendarEmail: string;
  rating: number;
  reviewsCount: number;
  services: {
    name: string;
    description: string;
    durationMinutes: number;
    priceNaira: number;
    bufferMinutes: number;
    locationType: LocationType;
    meetingInstructions: string;
  }[];
}) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: params.email },
    create: { email: params.email, passwordHash, name: params.name, phone: params.phone },
    update: {},
  });

  const profile = await prisma.professionalProfile.upsert({
    where: { username: params.username },
    create: {
      userId: user.id,
      name: params.name,
      businessName: params.businessName,
      username: params.username,
      bio: params.bio,
      category: params.category,
      avatarUrl: params.avatarUrl,
      location: params.location,
      phone: params.phone,
      bankName: params.bankName,
      bankAccountNumber: params.bankAccountNumber,
      bankAccountName: params.bankAccountName,
      googleCalendarConnected: true,
      googleCalendarEmail: params.googleCalendarEmail,
      whatsappRemindersEnabled: true,
      rating: params.rating,
      reviewsCount: params.reviewsCount,
    },
    update: {},
  });

  for (const service of params.services) {
    // No natural unique key on (professionalId, name) — check-then-create keeps re-runs idempotent.
    const existing = await prisma.service.findFirst({
      where: { professionalId: profile.id, name: service.name },
    });
    if (!existing) {
      await prisma.service.create({
        data: {
          professionalId: profile.id,
          name: service.name,
          description: service.description,
          durationMinutes: service.durationMinutes,
          priceKobo: service.priceNaira * 100,
          bufferMinutes: service.bufferMinutes,
          locationType: service.locationType,
          meetingInstructions: service.meetingInstructions,
        },
      });
    }
  }

  const days: DayOfWeek[] = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
    DayOfWeek.SUNDAY,
  ];
  for (const day of days) {
    const isWeekday = WEEKDAY_9_TO_5.includes(day);
    const isFriday = day === DayOfWeek.FRIDAY;
    await prisma.availabilityRule.upsert({
      where: { professionalId_dayOfWeek: { professionalId: profile.id, dayOfWeek: day } },
      create: {
        professionalId: profile.id,
        dayOfWeek: day,
        isEnabled: isWeekday || isFriday,
        timeRanges: isWeekday
          ? [{ start: '09:00', end: '17:00' }]
          : isFriday
            ? [{ start: '09:00', end: '15:00' }]
            : [],
      },
      update: {},
    });
  }

  return { user, profile };
}

async function main() {
  const john = await seedProfessional({
    email: 'john@blokr.dev',
    name: 'John Doe',
    businessName: 'JD Advisory & Consulting',
    username: 'john-consulting',
    bio: 'Helping fast-growing startups and SMEs scale operations, optimize revenue funnels, and raise institutional capital across Africa.',
    category: 'Business Consultant',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    location: 'Victoria Island, Lagos',
    phone: '+2348031234567',
    bankName: 'Guaranty Trust Bank (GTBank)',
    bankAccountNumber: '0123456789',
    bankAccountName: 'JOHN DOE CONSULTING',
    googleCalendarEmail: 'john.consulting@gmail.com',
    rating: 4.9,
    reviewsCount: 48,
    services: [
      {
        name: '30-Minute Discovery Consultation',
        description:
          'Quick audit of your current business bottleneck, growth strategy review, and actionable next steps.',
        durationMinutes: 30,
        priceNaira: 15000,
        bufferMinutes: 15,
        locationType: LocationType.GOOGLE_MEET,
        meetingInstructions:
          'A Google Meet link will be generated and emailed automatically upon payment.',
      },
      {
        name: '60-Minute Deep Dive Strategy Session',
        description:
          'Comprehensive review of business model, unit economics, fundraising pitch deck, or hiring roadmap.',
        durationMinutes: 60,
        priceNaira: 35000,
        bufferMinutes: 15,
        locationType: LocationType.GOOGLE_MEET,
        meetingInstructions: 'Please prepare any decks or financial models in advance.',
      },
      {
        name: 'Executive Leadership Coaching (90 Mins)',
        description:
          'Intensive 1-on-1 operational coaching for CEOs and department heads tackling high-stakes challenges.',
        durationMinutes: 90,
        priceNaira: 60000,
        bufferMinutes: 30,
        locationType: LocationType.ZOOM,
        meetingInstructions: 'Meeting details will be sent to your WhatsApp and email.',
      },
    ],
  });

  await seedProfessional({
    email: 'amaka@blokr.dev',
    name: 'Dr. Amaka Okafor',
    businessName: 'MindSpring Therapy & Wellness',
    username: 'dr-amaka',
    bio: 'Licensed Clinical Psychologist specializing in executive burnout, anxiety management, and relationship therapy. Confidential virtual sessions.',
    category: 'Therapist & Counselor',
    avatarUrl:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    location: 'Ikoyi, Lagos / Remote',
    phone: '+2348029876543',
    bankName: 'Zenith Bank',
    bankAccountNumber: '2019283746',
    bankAccountName: 'AMAKA OKAFOR WELLNESS',
    googleCalendarEmail: 'amaka.therapy@gmail.com',
    rating: 5.0,
    reviewsCount: 62,
    services: [
      {
        name: 'Individual Therapy Consultation',
        description:
          'Confidential 50-minute virtual session focusing on mental health, anxiety, depression, or stress management.',
        durationMinutes: 50,
        priceNaira: 25000,
        bufferMinutes: 15,
        locationType: LocationType.GOOGLE_MEET,
        meetingInstructions:
          'Please ensure a quiet, private space with a reliable internet connection.',
      },
      {
        name: 'Executive Burnout & Performance Audit',
        description:
          'Targeted session designed for high-performing professionals dealing with chronic workplace exhaustion and stress.',
        durationMinutes: 60,
        priceNaira: 40000,
        bufferMinutes: 20,
        locationType: LocationType.GOOGLE_MEET,
        meetingInstructions: 'Confidential private video link.',
      },
    ],
  });

  await seedProfessional({
    email: 'tunde@blokr.dev',
    name: 'Barrister Tunde Lawal',
    businessName: 'LexBridge Legal Partners',
    username: 'tunde-lawal',
    bio: 'Corporate commercial attorney advising tech founders, SAFEs, venture financing, intellectual property protection, and regulatory compliance in Nigeria.',
    category: 'Corporate Lawyer',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    location: 'Lekki Phase 1, Lagos',
    phone: '+2348145558899',
    bankName: 'Access Bank',
    bankAccountNumber: '0789123456',
    bankAccountName: 'TUNDE LAWAL LEGAL',
    googleCalendarEmail: 'tunde@lexbridge.ng',
    rating: 4.9,
    reviewsCount: 35,
    services: [
      {
        name: 'Startup Legal & Compliance Advisory',
        description:
          'Review of incorporation status, shareholder agreements, founder vesting, or IP assignment.',
        durationMinutes: 45,
        priceNaira: 40000,
        bufferMinutes: 15,
        locationType: LocationType.GOOGLE_MEET,
        meetingInstructions: 'Upload or email relevant contract drafts prior to the call.',
      },
      {
        name: 'Contract & Agreement Audit',
        description:
          'Detailed legal review of commercial contracts, vendor MSAs, or investment term sheets.',
        durationMinutes: 60,
        priceNaira: 65000,
        bufferMinutes: 30,
        locationType: LocationType.GOOGLE_MEET,
        meetingInstructions: 'NDA and legal privilege guidelines apply.',
      },
    ],
  });

  // A couple of confirmed sample bookings + successful payments for John, so the
  // dashboard payments list isn't empty on first run.
  const johnServices = await prisma.service.findMany({ where: { professionalId: john.profile.id } });
  const strategySession = johnServices.find((s) => s.name.includes('Deep Dive'));
  const discoveryCall = johnServices.find((s) => s.name.includes('Discovery'));

  if (strategySession && discoveryCall) {
    const inTwoDays = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
    const inThreeDays = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

    const bookingsData = [
      {
        reference: 'BLK-98214',
        serviceId: strategySession.id,
        customerName: 'Sarah Johnson',
        customerEmail: 'sarah.j@acmetech.io',
        customerPhone: '+2348051239988',
        customerNotes: 'Discussing our Series A pitch deck and marketing expansion in Kenya.',
        date: inTwoDays,
        startTime: '10:00',
        endTime: '11:00',
        amountKobo: strategySession.priceKobo,
        paystackReference: 'pstk_ref_9821389123',
      },
      {
        reference: 'BLK-48190',
        serviceId: discoveryCall.id,
        customerName: 'Emeka Nwosu',
        customerEmail: 'emeka@fintechpulse.ng',
        customerPhone: '+2348123334455',
        customerNotes: 'Quick guidance on merchant onboarding churn rates.',
        date: inThreeDays,
        startTime: '14:00',
        endTime: '14:30',
        amountKobo: discoveryCall.priceKobo,
        paystackReference: 'pstk_ref_4819028312',
      },
    ];

    for (const b of bookingsData) {
      const booking = await prisma.booking.upsert({
        where: { reference: b.reference },
        create: {
          reference: b.reference,
          professionalId: john.profile.id,
          serviceId: b.serviceId,
          customerName: b.customerName,
          customerEmail: b.customerEmail,
          customerPhone: b.customerPhone,
          customerNotes: b.customerNotes,
          date: new Date(b.date),
          startTime: b.startTime,
          endTime: b.endTime,
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.SUCCESS,
          amountKobo: b.amountKobo,
          meetingLink: 'https://meet.google.com/abc-defg-hij',
        },
        update: {},
      });

      await prisma.paystackTransaction.upsert({
        where: { reference: b.paystackReference },
        create: {
          bookingId: booking.id,
          reference: b.paystackReference,
          amountKobo: b.amountKobo,
          channel: 'card',
          status: PaymentStatus.SUCCESS,
          paidAt: new Date(),
        },
        update: {},
      });
    }
  }

  console.log(`Seed complete. Demo login password for all professionals: ${DEMO_PASSWORD}`);
  console.log('Professionals: john@blokr.dev, amaka@blokr.dev, tunde@blokr.dev');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
