import type { UserRole } from "@/types/profile";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Assignable via invite/edit — owner is never granted through these forms.
const VALID_ROLES: UserRole[] = ["member", "manager", "admin"];

export interface InviteEmployeeInput {
  email: string;
  fullName: string;
  role: string;
  designation?: string;
  departmentId?: string;
  supervisorId?: string;
  isRemote?: boolean;
  employmentType?: "full_time" | "part_time";
}

export interface EditEmployeeInput {
  email: string;
  fullName: string;
  role: string;
  designation?: string;
  isRemote?: boolean;
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
        designation?: string;
        departmentId?: string;
        supervisorId?: string;
        isRemote?: boolean;
        employmentType?: "full_time" | "part_time";
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
      designation: input.designation?.trim() || undefined,
      departmentId:
        input.departmentId && !input.departmentId.startsWith("__")
          ? input.departmentId
          : undefined,
      supervisorId:
        input.supervisorId && !input.supervisorId.startsWith("__")
          ? input.supervisorId
          : undefined,
      isRemote: input.isRemote,
      employmentType: input.employmentType ?? "full_time",
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
        designation: string | null;
        isRemote: boolean;
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
      designation: input.designation?.trim() || null,
      isRemote: input.isRemote ?? false,
    },
  };
}
