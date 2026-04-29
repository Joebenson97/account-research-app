/**
 * Zod validation schemas for API request bodies.
 *
 * Validates and sanitizes all user input before it reaches the database.
 * Catches invalid emails, XSS payloads in text fields, out-of-range
 * numbers, and invalid enum values.
 */

import { z } from 'zod'

const MAX_TEXT = 500
const MAX_NAME = 200
const MAX_NOTES = 10_000

const sanitizedString = (maxLen: number) =>
  z.string().max(maxLen).trim()

const statusEnum = z.enum(['active', 'inactive', 'prospect', 'customer'])
const valueEnum = z.enum(['low', 'medium', 'high'])

const socialMediaSchema = z.object({
  linkedin: z.string().url().max(MAX_TEXT).optional().or(z.literal('')),
  twitter: z.string().url().max(MAX_TEXT).optional().or(z.literal('')),
  facebook: z.string().url().max(MAX_TEXT).optional().or(z.literal('')),
  instagram: z.string().url().max(MAX_TEXT).optional().or(z.literal('')),
}).strict().optional()

export const createAccountSchema = z.object({
  name: sanitizedString(MAX_NAME).min(1, 'Account name is required.'),
  email: z.string().email('Invalid email format.').max(MAX_TEXT).optional()
    .or(z.literal('')),
  phone: sanitizedString(50).optional().or(z.literal('')),
  company: sanitizedString(MAX_NAME).optional().or(z.literal('')),
  industry: sanitizedString(100).optional().or(z.literal('')),
  location: sanitizedString(MAX_TEXT).optional().or(z.literal('')),
  website: z.string().url('Invalid website URL.').max(MAX_TEXT).optional()
    .or(z.literal('')),
  description: sanitizedString(MAX_NOTES).optional().or(z.literal('')),
  tags: z.array(z.string().max(100)).max(50).optional(),
  researchNotes: sanitizedString(MAX_NOTES).optional().or(z.literal('')),
  status: statusEnum.optional(),
  value: valueEnum.optional(),
}).strict()

export const updateAccountSchema = z.object({
  name: sanitizedString(MAX_NAME).min(1, 'Account name is required.').optional(),
  email: z.string().email('Invalid email format.').max(MAX_TEXT).optional()
    .or(z.literal('')),
  phone: sanitizedString(50).optional().or(z.literal('')),
  company: sanitizedString(MAX_NAME).optional().or(z.literal('')),
  industry: sanitizedString(100).optional().or(z.literal('')),
  location: sanitizedString(MAX_TEXT).optional().or(z.literal('')),
  website: z.string().url('Invalid website URL.').max(MAX_TEXT).optional()
    .or(z.literal('')),
  description: sanitizedString(MAX_NOTES).optional().or(z.literal('')),
  foundedYear: z.number().int().min(1800).max(2100).optional().nullable(),
  employeeCount: z.number().int().min(0).max(10_000_000).optional().nullable(),
  revenue: z.number().min(0).max(1e15).optional().nullable(),
  socialMedia: socialMediaSchema,
  tags: z.array(z.string().max(100)).max(50).optional(),
  researchNotes: sanitizedString(MAX_NOTES).optional().or(z.literal('')),
  status: statusEnum.optional(),
  value: valueEnum.optional(),
}).strict()

export function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
      return `${path}${issue.message}`
    })
    .join('; ')
}
