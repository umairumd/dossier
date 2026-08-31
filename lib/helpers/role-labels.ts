export function getRoleLabel(role: string): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "HR Admin";
    case "manager":
      return "Manager";
    case "member":
      return "Member";
    default:
      return role;
  }
}
