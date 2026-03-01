import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { BusinessStatus, Priority, ActivityOutcome } from '@prisma/client';

const IST_TIMEZONE = 'Asia/Kolkata';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string, fmt: string = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(d, IST_TIMEZONE, fmt);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'dd MMM yyyy, hh:mm a');
}

export function getStatusColor(status: BusinessStatus): string {
  const colors: Record<BusinessStatus, string> = {
    NOT_VISITED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    VISITED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    INTERESTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    NEGOTIATION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    CLOSED_WON: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    CLOSED_LOST: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    FOLLOW_UP: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  };
  return colors[status];
}

export function getPriorityColor(priority: Priority): string {
  const colors: Record<Priority, string> = {
    HIGH: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    LOW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  };
  return colors[priority];
}

export function getOutcomeColor(outcome: ActivityOutcome): string {
  const colors: Record<ActivityOutcome, string> = {
    POSITIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    NEGATIVE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    NEUTRAL: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    NO_RESPONSE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    CALLBACK_REQUESTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  };
  return colors[outcome];
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const phoneWithCountry = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
}

export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}
