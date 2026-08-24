const bcrypt = require("bcryptjs");
const { signToken } = require("../utils/jwt");
const userRepository = require("../repositories/userRepository");
const { resolveCompanyAccess } = require("../services/companyAccess");
const {
    PUBLIC_SIGNUP_ROLES,
    normalizeSignupRole,
    isPublicSignupRole,
} = require("../constants/userRoles");

async function publicUser(user) {
    const companyAccess = await resolveCompanyAccess(user);
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company || "",
        requiresPasswordReset: Boolean(user.requiresPasswordReset),
        onboardingComplete: Boolean(user.onboardingComplete),
        onboardingData: user.onboardingData || null,
        welxPoints: Number(user.welxPoints || 0),
        companyAccess,
    };
}

exports.signup = async (req, res) => {
    try {
        const { name, email, password, role, company } = req.body;
        const normalizedName = typeof name === "string" ? name.trim() : "";
        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
        const normalizedRole = normalizeSignupRole(role);
        const normalizedCompany = typeof company === "string" ? company.trim() : "";

        if (!normalizedName || !normalizedEmail || typeof password !== "string" || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }

        if (!isPublicSignupRole(normalizedRole)) {
            return res.status(400).json({
                message: `Role must be one of: ${PUBLIC_SIGNUP_ROLES.join(", ")}`,
            });
        }

        if (normalizedRole === "employer" && !normalizedCompany) {
            return res.status(400).json({ message: "Company / organization is required for employer accounts" });
        }

        const existingUser = await userRepository.findByEmail(normalizedEmail);
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await userRepository.create({
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            role: normalizedRole,
            ...(normalizedRole === "employer" ? { company: normalizedCompany } : {}),
        });
        const token = signToken(user);
        res.status(201).json({ token, user: await publicUser(user) });
    } catch (err) {
        if (err?.code === 11000) {
            return res.status(400).json({ message: "Email already registered" });
        }

        if (err?.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }

        res.status(500).json({ message: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
        const user = await userRepository.findByEmail(normalizedEmail);
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        const token = signToken(user);
        res.json({ token, user: await publicUser(user) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
