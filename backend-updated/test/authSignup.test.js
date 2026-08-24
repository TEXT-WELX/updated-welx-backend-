const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

function loadAuthController() {
  let savedUser = null;

  const fakeUserRepository = {
    findByEmail: async () => null,
    create: async (data) => {
      savedUser = { _id: "user-1", ...data };
      return savedUser;
    },
  };

  const authPath = path.resolve(__dirname, "../src/controllers/auth.js");
  const originalLoad = Module._load;

  Module._load = function mockedLoad(request, parent, isMain) {
    if (request === "../repositories/userRepository" && parent?.filename === authPath) {
      return fakeUserRepository;
    }

    if (request === "bcryptjs") {
      return { hash: async (password) => `hashed:${password}`, compare: async () => true };
    }

    if (request === "../utils/jwt" && parent?.filename === authPath) {
      return { signToken: () => "test-token" };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[authPath];

  try {
    return {
      controller: require(authPath),
      getSavedUser: () => savedUser,
    };
  } finally {
    Module._load = originalLoad;
  }
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("employer signup creates an employer account", async () => {
  const { controller, getSavedUser } = loadAuthController();
  const req = {
    body: {
      name: "WELX Company",
      email: "EMPLOYER@example.com",
      password: "secret123",
      role: "employer",
      company: "WELX Learning Ltd",
    },
  };
  const res = responseRecorder();

  await controller.signup(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.token, "test-token");
  assert.equal(res.body.user.role, "employer");
  assert.equal(res.body.user.email, "employer@example.com");
  assert.equal(res.body.user.company, "WELX Learning Ltd");
  assert.equal(getSavedUser().role, "employer");
  assert.equal(getSavedUser().company, "WELX Learning Ltd");
  assert.equal(getSavedUser().password, "hashed:secret123");
});

test("employer signup requires a company", async () => {
  const { controller, getSavedUser } = loadAuthController();
  const req = {
    body: {
      name: "Employer",
      email: "employer@example.com",
      password: "secret123",
      role: "employer",
    },
  };
  const res = responseRecorder();

  await controller.signup(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /company \/ organization/i);
  assert.equal(getSavedUser(), null);
});

test("public signup rejects the admin role", async () => {
  const { controller, getSavedUser } = loadAuthController();
  const req = {
    body: {
      name: "Not Admin",
      email: "admin@example.com",
      password: "secret123",
      role: "admin",
    },
  };
  const res = responseRecorder();

  await controller.signup(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /student, employee, employer/);
  assert.equal(getSavedUser(), null);
});
