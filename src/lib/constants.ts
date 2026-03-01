import {
  BusinessCategory,
  ServiceType,
  BusinessStatus,
  Priority,
  ActivityType,
  ActivityOutcome,
  FailureReason,
  VisitType,
  PaymentStatus,
  RenewalStatus,
} from '@prisma/client';

export const BUSINESS_CATEGORIES: { value: BusinessCategory; label: string; icon: string }[] = [
  { value: 'SALON', label: 'Salon', icon: 'Scissors' },
  { value: 'GYM', label: 'Gym', icon: 'Dumbbell' },
  { value: 'HOTEL', label: 'Hotel', icon: 'Hotel' },
  { value: 'CLINIC', label: 'Clinic', icon: 'Stethoscope' },
  { value: 'RESTAURANT', label: 'Restaurant', icon: 'UtensilsCrossed' },
  { value: 'SCHOOL', label: 'School', icon: 'GraduationCap' },
  { value: 'COLLEGE', label: 'College', icon: 'BookOpen' },
  { value: 'RETAIL', label: 'Retail', icon: 'ShoppingBag' },
  { value: 'PHARMACY', label: 'Pharmacy', icon: 'Pill' },
  { value: 'AUTOMOBILE', label: 'Automobile', icon: 'Car' },
  { value: 'REAL_ESTATE', label: 'Real Estate', icon: 'Home' },
  { value: 'COACHING', label: 'Coaching', icon: 'BookOpen' },
  { value: 'OTHER', label: 'Other', icon: 'MoreHorizontal' },
];

export const SERVICE_TYPES: { value: ServiceType; label: string; color: string }[] = [
  { value: 'WEBSITE', label: 'Website', color: 'bg-blue-500' },
  { value: 'GBP', label: 'Google Business Profile', color: 'bg-green-500' },
  { value: 'ERP', label: 'ERP', color: 'bg-purple-500' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media', color: 'bg-pink-500' },
  { value: 'SEO', label: 'SEO', color: 'bg-orange-500' },
  { value: 'LOGO_BRANDING', label: 'Logo & Branding', color: 'bg-yellow-500' },
];

export const BUSINESS_STATUSES: {
  value: BusinessStatus;
  label: string;
  color: string;
  icon: string;
}[] = [
  { value: 'NOT_VISITED', label: 'Not Visited', color: 'bg-gray-500', icon: 'Circle' },
  { value: 'VISITED', label: 'Visited', color: 'bg-blue-500', icon: 'Eye' },
  { value: 'INTERESTED', label: 'Interested', color: 'bg-yellow-500', icon: 'Star' },
  { value: 'NEGOTIATION', label: 'Negotiation', color: 'bg-purple-500', icon: 'MessageSquare' },
  { value: 'CLOSED_WON', label: 'Closed Won', color: 'bg-green-500', icon: 'CheckCircle' },
  { value: 'CLOSED_LOST', label: 'Closed Lost', color: 'bg-red-500', icon: 'XCircle' },
  { value: 'FOLLOW_UP', label: 'Follow Up', color: 'bg-orange-500', icon: 'Clock' },
];

export const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'HIGH', label: 'High', color: 'text-red-600' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-600' },
  { value: 'LOW', label: 'Low', color: 'text-green-600' },
];

export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'CALL', label: 'Phone Call' },
  { value: 'VISIT', label: 'In-Person Visit' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'DEMO', label: 'Demo' },
];

export const ACTIVITY_OUTCOMES: { value: ActivityOutcome; label: string; color: string }[] = [
  { value: 'POSITIVE', label: 'Positive', color: 'text-green-600' },
  { value: 'NEGATIVE', label: 'Negative', color: 'text-red-600' },
  { value: 'NEUTRAL', label: 'Neutral', color: 'text-gray-600' },
  { value: 'NO_RESPONSE', label: 'No Response', color: 'text-yellow-600' },
  { value: 'CALLBACK_REQUESTED', label: 'Callback Requested', color: 'text-blue-600' },
];

export const FAILURE_REASONS: { value: FailureReason; label: string }[] = [
  { value: 'PRICE_ISSUE', label: 'Price Too High' },
  { value: 'TRUST_ISSUE', label: 'Trust Issues' },
  { value: 'ALREADY_HAS_SERVICE', label: 'Already Has Service' },
  { value: 'NOT_DECISION_MAKER', label: 'Not the Decision Maker' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
  { value: 'BAD_TIMING', label: 'Bad Timing' },
  { value: 'WENT_TO_COMPETITOR', label: 'Went to Competitor' },
  { value: 'NO_BUDGET', label: 'No Budget' },
  { value: 'OTHER', label: 'Other' },
];

export const VISIT_TYPES: { value: VisitType; label: string }[] = [
  { value: 'CALL', label: 'Phone Call' },
  { value: 'OFFLINE', label: 'In-Person' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string; color: string }[] = [
  { value: 'PENDING', label: 'Pending', color: 'text-yellow-600' },
  { value: 'PARTIAL', label: 'Partial', color: 'text-orange-600' },
  { value: 'PAID', label: 'Paid', color: 'text-green-600' },
  { value: 'REFUNDED', label: 'Refunded', color: 'text-red-600' },
];

export const RENEWAL_STATUSES: { value: RenewalStatus; label: string; color: string }[] = [
  { value: 'PENDING', label: 'Pending', color: 'text-yellow-600' },
  { value: 'CONTACTED', label: 'Contacted', color: 'text-blue-600' },
  { value: 'RENEWED', label: 'Renewed', color: 'text-green-600' },
  { value: 'CHURNED', label: 'Churned', color: 'text-red-600' },
  { value: 'NOT_APPLICABLE', label: 'N/A', color: 'text-gray-600' },
];

export const DEFAULT_CONTRACT_DURATION_MONTHS = 12;

export const WHATSAPP_TEMPLATES = [
  {
    id: 'follow_up',
    label: 'Follow-up Message',
    message: (name: string, businessName: string) =>
      `Namaste ${name} ji 🙏\n\nThis is from TheNextURL.\n\nJust checking in regarding the digital services we discussed for ${businessName}. Have you had a chance to think about it?\n\nWe'd love to help you get more customers from Google 😊\n\nFeel free to call us anytime!`,
  },
  {
    id: 'proposal',
    label: 'Proposal Message',
    message: (name: string, businessName: string) =>
      `Namaste ${name} ji 🙏\n\nThank you for your time today! As promised, here's a quick summary of what we can do for ${businessName}:\n\n✅ Google Business Profile Setup\n✅ Professional Website\n✅ Digital Growth Strategy\n\nInvestment starts from ₹2,999 only.\n\nShall I send you a detailed proposal? 📋`,
  },
  {
    id: 'meeting_confirm',
    label: 'Meeting Confirmation',
    message: (name: string, businessName: string) =>
      `Namaste ${name} ji 🙏\n\nJust confirming our meeting tomorrow to discuss digital solutions for ${businessName}.\n\nLooking forward to meeting you! 😊\n\nIf any changes, please let me know.\n\nThank you!`,
  },
  {
    id: 'thank_you',
    label: 'Thank You After Meeting',
    message: (name: string, businessName: string) =>
      `Namaste ${name} ji 🙏\n\nThank you so much for your time today! It was a pleasure meeting you.\n\nWe're excited about the opportunity to work with ${businessName} and help you grow digitally.\n\nWe'll send you the detailed proposal within 24 hours.\n\nBest regards,\nTheNextURL Team`,
  },
  {
    id: 'payment_reminder',
    label: 'Payment Reminder',
    message: (name: string, businessName: string) =>
      `Namaste ${name} ji 🙏\n\nHope you are doing well! This is a gentle reminder about the pending payment for the digital services we completed for ${businessName}.\n\nPlease let us know if you need any clarification or have any questions.\n\nThank you for your continued trust in us! 🙏`,
  },
  {
    id: 'renewal_reminder',
    label: 'Renewal Reminder',
    message: (name: string, businessName: string) =>
      `Namaste ${name} ji 🙏\n\nThis is from TheNextURL.\n\nYour digital services for ${businessName} are coming up for renewal. We would love to continue supporting your digital growth!\n\nWould you like to schedule a quick call to discuss renewal and any upgrades?\n\nThank you for being a valued client! 😊`,
  },
];

