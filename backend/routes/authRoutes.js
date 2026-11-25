
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

function createToken(user) {
    return jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
}

function publicUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId
    };
}

// REGISTER
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, studentId } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Please fill all required fields."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email: normalizedEmail,
            passwordHash,
            studentId: studentId || ""
        });

        res.status(201).json({
            message: "Registration successful.",
            token: createToken(user),
            user: publicUser(user)
        });

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            message: "Registration failed."
        });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Enter email and password."
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        }).select("+passwordHash");

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        res.json({
            message: "Login successful.",
            token: createToken(user),
            user: publicUser(user)
        });

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            message: "Login failed."
        });
    }
});

// LOGGED-IN USER
router.get("/me", protect, (req, res) => {
    res.json({
        user: publicUser(req.user)
    });
});

module.exports = router;
