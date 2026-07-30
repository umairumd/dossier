import type { UserRole } from "@/types/profile";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES: UserRole[] = ["employee", "manager", "admin"];

export interface InviteEmployeeInput {
  email: string;
  fullName: string;
  role: string;
  departmentId: string | null;
}

export interface EditEmployeeInput {
  email: string;
  fullName: string;
  role: string;
  departmentId: string | null;
}

export interface EmployeeFieldErrors {
  email?: string;
  fullName?: string;
  role?: string;
  departmentId?: string;
}

function isUserRole(value: string): value is UserRole {
  return (VALID_ROLES as string[]).includes(value);
}

// Shared by invite and edit — both need "name required, role valid,
// department required unless admin" (mirroring profiles_role_check and the
// department-required-for-non-admins expectation), so this lives in one
// place rather than duplicated per form.
function validateCommonFields(input: {
  fullName: string;
  role: string;
  departmentId: string | null;
}): EmployeeFieldErrors {
  const fieldErrors: EmployeeFieldErrors = {};

  if (!input.fullName.trim()) {
    fieldErrors.fullName = "Name is required.";
  }

  if (!isUserRole(input.role)) {
    fieldErrors.role = "Select a valid role.";
  }

  if (
    isUserRole(input.role) &&
    input.role !== "admin" &&
    !input.departmentId
  ) {
    fieldErrors.departmentId = "Select a department for this role.";
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
        departmentId: string | null;
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
      departmentId: input.role === "admin" ? null : input.departmentId,
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
        departmentId: string | null;
      };
    }
  | { valid: false; fieldErrors: EmployeeFieldErrors };

// Same rules as invite, including email — editing an existing employee's
// email is supported via the Admin API (see updateEmployee).
export function validateEditEmployeeInput(
  input: EditEmployeeInput,
): EditEmployeeValidationResult {
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
      departmentId: input.role === "admin" ? null : input.departmentId,
    },
  };
}
