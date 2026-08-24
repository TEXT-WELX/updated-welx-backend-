const USER_ROLES = Object.freeze([
  "student",
  "employee",
  "employer",
  "admin",
]);

const PUBLIC_SIGNUP_ROLES = Object.freeze([
  "student",
  "employee",
  "employer",
]);

const publicSignupRoleSet = new Set(PUBLIC_SIGNUP_ROLES);

function normalizeSignupRole(role) {
  if (typeof role !== "string" || !role.trim()) {
    return "student";
  }

  return role.trim().toLowerCase();
}

function isPublicSignupRole(role) {
  return publicSignupRoleSet.has(role);
}

module.exports = {
  USER_ROLES,
  PUBLIC_SIGNUP_ROLES,
  normalizeSignupRole,
  isPublicSignupRole,
};
