export interface DepartmentFieldErrors {
  name?: string;
}

export type DepartmentNameValidationResult =
  | { valid: true; value: { name: string } }
  | { valid: false; fieldErrors: DepartmentFieldErrors };

export function validateDepartmentName(
  name: string,
): DepartmentNameValidationResult {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, fieldErrors: { name: "Name is required." } };
  }

  return { valid: true, value: { name: trimmed } };
}
