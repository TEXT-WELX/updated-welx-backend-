const test = require("node:test");
const assert = require("node:assert/strict");
const {
  USER_ROLES,
  PUBLIC_SIGNUP_ROLES,
  normalizeSignupRole,
  isPublicSignupRole,
} = require("../src/constants/userRoles");

test("employer is a valid stored and public signup role", () => {
  assert.equal(USER_ROLES.includes("employer"), true);
  assert.equal(PUBLIC_SIGNUP_ROLES.includes("employer"), true);
  assert.equal(isPublicSignupRole("employer"), true);
});

test("signup roles are normalized before validation", () => {
  assert.equal(normalizeSignupRole(" Employer "), "employer");
  assert.equal(isPublicSignupRole(normalizeSignupRole(" Employer ")), true);
});

test("a missing role keeps the existing student default", () => {
  assert.equal(normalizeSignupRole(undefined), "student");
});

test("admin cannot be selected through public signup", () => {
  assert.equal(USER_ROLES.includes("admin"), true);
  assert.equal(isPublicSignupRole("admin"), false);
});
