import type { UserRole } from "@/types/profile";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Assignable via invite/edit — owner is never granted through these forms.
const VALID_ROLES: UserRole[] = ["member", "manager", "admin"];

export interface InviteEmployeeInput {
  email: string;
  fullName: string;
  role: string;
}

export interface EditEmployeeInput {
  email: string;
  fullName: string;
  role: string;
}

export interface EmployeeFieldErrors {
  email?: string;
  fullName?: string;
  role?: string;
}

function isUserRole(value: string): value is UserRole {
  return (VALID_ROLES as string[]).includes(value);
}

function validateCommonFields(input: {
  fullName: string;
  role: string;
}): EmployeeFieldErrors {
  const fieldErrors: EmployeeFieldErrors = {};

  if (!input.fullName.trim()) {
    fieldErrors.fullName = "Name is required.";
  }

  if (!isUserRole(input.role)) {
    fieldErrors.role = "Select a valid role.";
  }

  return fieldErrors;
}

function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();

  if (!trimmed) {
    return "Email is required.";
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return undefined;
}

export type InviteEmployeeValidationResult =
  | {
      valid: true;
      value: {
        email: string;
        fullName: string;
        role: UserRole;
      };
    }
  | { valid: false; fieldErrors: EmployeeFieldErrors };

export function validateInviteEmployeeInput(
  input: InviteEmployeeInput,
): InviteEmployeeValidationResult {
  const fieldErrors = validateCommonFields(input);
  const emailError = validateEmail(input.email);
  if (emailError) {
    fieldErrors.email = emailError;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, fieldErrors };
  }

  return {
    valid: true,
    value: {
      email: input.email.trim(),
      fullName: input.fullName.trim(),
      role: input.role as UserRole,
    },
  };
}

export type EditEmployeeValidationResult =
  | {
      valid: true;
      value: {
        email: string;
        fullName: string;
        role: UserRole;
      };
    }
  | { valid: false; fieldErrors: EmployeeFieldErrors };

export function validateEditEmployeeInput(
  input: EditEmployeeInput,
): EditEmployeeValidationResult {
  const fieldErrors = validateCommonFields({
    ...input,
    role: input.role === "owner" ? "member" : input.role,
  });
  if (input.role === "owner") {
    delete fieldErrors.role;
  }
  const emailError = validateEmail(input.email);
  if (emailError) {
    fieldErrors.email = emailError;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, fieldErrors };
  }

  return {
    valid: true,
    value: {
      email: input.email.trim(),
      fullName: input.fullName.trim(),
      role: input.role as UserRole,
    },
  };
}
