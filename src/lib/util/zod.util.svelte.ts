import { z } from 'zod';

export class ZodUtility {
  /* -----------------------------
     PASSWORD SCHEMA
  ----------------------------- */

  private static passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character')
    .refine((val) => !/\s/.test(val), {
      message: 'Password cannot contain spaces'
    });

  /* -----------------------------
     BASIC BOOLEAN CHECK
     (what you originally asked)
  ----------------------------- */

  static checkPasswordStrength(password: string): boolean {
    return this.passwordSchema.safeParse(password).success;
  }

  /* -----------------------------
     ADVANCED PASSWORD ANALYSIS
     (recommended)
  ----------------------------- */

  static validatePassword(password: string) {
    const result = this.passwordSchema.safeParse(password);

    const score =
      (/[A-Z]/.test(password) ? 1 : 0) +
      (/[a-z]/.test(password) ? 1 : 0) +
      (/[0-9]/.test(password) ? 1 : 0) +
      (/[^A-Za-z0-9]/.test(password) ? 1 : 0) +
      (password.length >= 12 ? 1 : 0);

    return {
      success: result.success,
      score, // 0–5 strength score
      issues: result.success
        ? []
        : result.error.issues.map((i) => i.message)
    };
  }

  /* -----------------------------
     EMAIL VALIDATION
  ----------------------------- */

  private static emailSchema = z.string().email();

  static validateEmail(email: string): boolean {
    return this.emailSchema.safeParse(email).success;
  }

  /* -----------------------------
     USERNAME
  ----------------------------- */

  private static usernameSchema = z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters numbers underscore');

  static validateUsername(username: string): boolean {
    return this.usernameSchema.safeParse(username).success;
  }

  /* -----------------------------
     PHONE (international)
  ----------------------------- */

  private static phoneSchema = z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number');

  static validatePhone(phone: string): boolean {
    return this.phoneSchema.safeParse(phone).success;
  }

  /* -----------------------------
     GENERIC VALIDATOR
     reusable for anything
  ----------------------------- */

  static validate<T>(schema: z.ZodSchema<T>, data: unknown) {
    const result = schema.safeParse(data);

    return {
      success: result.success,
      data: result.success ? result.data : null,
      errors: result.success
        ? []
        : result.error.issues.map((i) => i.message)
    };
  }
}
