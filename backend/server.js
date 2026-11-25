
const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// DATABASE
const connectDB = require("./config/db");

// ROUTES
const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");
const claimRoutes = require("./routes/claimRoutes");
const handoverRoutes = require("./routes/handoverRoutes");

// =====================================
// CREATE EXPRESS APP FIRST
// =====================================

const app = express();

// =====================================
// SECURITY
// =====================================

app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: "cross-origin"
        }
    })
);

// =====================================
// CORS
// =====================================

app.use(cors({
    origin: [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5501",
        "http://127.0.0.1:5501"
    ],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// =====================================
// JSON DATA
// =====================================

app.use(express.json({ limit: "10mb" }));

// =====================================
// UPLOAD IMAGES
// =====================================

const uploadPath = path.join(__dirname, "uploads");

app.use("/uploads", express.static(uploadPath));

// =====================================
// LOGIN RATE LIMIT
// =====================================

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false
});

// =====================================
// HOME API
// =====================================

app.get("/", (req, res) => {
    res.json({
        message: "Welcome to CampusFind API",
        status: "Backend is running",
        steps: [
            "Report",
            "Match",
            "Verify",
            "Handover"
        ]
    });
});

// =====================================
// REGISTER ALL API ROUTES
// =====================================

app.use("/api/auth", authLimiter, authRoutes);

app.use("/api/items", itemRoutes);

app.use("/api/claims", claimRoutes);

app.use("/api/handovers", handoverRoutes);

// =====================================
// PAGE NOT FOUND
// =====================================

app.use((req, res) => {
    res.status(404).json({
        message: "API route not found"
    });
});

// =====================================
// ERROR HANDLER
// =====================================

app.use((error, req, res, next) => {
    console.error("Server Error:", error);

    res.status(500).json({
        message: error.message || "Internal server error"
    });
});

// =====================================
// SERVER PORT
// =====================================

const PORT = process.env.PORT || 5000;

// =====================================
// START SERVER
// =====================================

async function startServer() {
    try {

        await connectDB();

        app.listen(PORT, () => {
            console.log(
                `CampusFind running at http://localhost:${PORT}`
            );
        });

    } catch (error) {

        console.error(
            "Server startup failed:",
            error.message
        );

        process.exit(1);
    }
}

startServer();
