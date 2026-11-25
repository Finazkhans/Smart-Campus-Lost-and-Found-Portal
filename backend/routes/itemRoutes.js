
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const Item = require("../models/Item");
const { protect } = require("../middleware/auth");

const router = express.Router();

// CREATE UPLOADS FOLDER
const uploadPath = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// MULTER STORAGE
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1000000) +
            path.extname(file.originalname).toLowerCase();

        cb(null, uniqueName);
    }
});

// IMAGE VALIDATION
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Please upload an image file only."));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// ADMIN CHECK
function adminOnly(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            message: "Admin access required."
        });
    }

    next();
}


// STEP 1: REPORT LOST OR FOUND ITEM
router.post(
    "/",
    protect,
    upload.single("image"),
    async (req, res) => {
        try {
            const {
                title,
                description,
                category,
                type,
                location,
                itemDate
            } = req.body;

            if (
                !title ||
                !description ||
                !category ||
                !type ||
                !location ||
                !itemDate
            ) {
                return res.status(400).json({
                    message: "Please fill all required details."
                });
            }

            if (!["lost", "found"].includes(type)) {
                return res.status(400).json({
                    message: "Invalid item type."
                });
            }

            const item = await Item.create({
                title,
                description,
                category,
                type,
                location,
                itemDate,

                imageUrl: req.file
                    ? `/uploads/${req.file.filename}`
                    : "",

                reporter: req.user._id,
                status: "pending"
            });

            res.status(201).json({
                message:
                    "Report submitted successfully! Waiting for admin approval.",
                item
            });

        } catch (error) {
            console.error("Report Error:", error);

            res.status(500).json({
                message: "Could not report item."
            });
        }
    }
);


// STEP 2: BROWSE APPROVED ITEMS
router.get("/", async (req, res) => {
    try {
        const { q, type } = req.query;

        const filter = {
            status: "approved"
        };

        if (type && ["lost", "found"].includes(type)) {
            filter.type = type;
        }

        if (q) {
            filter.$or = [
                { title: { $regex: q, $options: "i" } },
                { description: { $regex: q, $options: "i" } },
                { category: { $regex: q, $options: "i" } },
                { location: { $regex: q, $options: "i" } }
            ];
        }

        const items = await Item.find(filter)
            .populate("reporter", "name")
            .sort({ createdAt: -1 });

        res.json({ items });

    } catch (error) {
        console.error("Browse Error:", error);

        res.status(500).json({
            message: "Could not load items."
        });
    }
});


// STEP 3: ADMIN - VIEW PENDING REPORTS
router.get(
    "/admin/pending",
    protect,
    adminOnly,
    async (req, res) => {
        try {
            const items = await Item.find({
                status: "pending"
            }).sort({ createdAt: -1 });

            res.json({ items });

        } catch (error) {
            console.error("Pending Reports Error:", error);

            res.status(500).json({
                message: "Could not load pending reports."
            });
        }
    }
);


// STEP 3: ADMIN - APPROVE OR REJECT REPORT
router.patch(
    "/:id/review",
    protect,
    adminOnly,
    async (req, res) => {
        try {
            const { decision } = req.body;

            if (!["approved", "rejected"].includes(decision)) {
                return res.status(400).json({
                    message: "Invalid review decision."
                });
            }

            const item = await Item.findById(req.params.id);

            if (!item) {
                return res.status(404).json({
                    message: "Item not found."
                });
            }

            if (item.status !== "pending") {
                return res.status(400).json({
                    message: "This report has already been reviewed."
                });
            }

            item.status = decision;
            await item.save();

            res.json({
                message: `Report ${decision} successfully.`,
                item
            });

        } catch (error) {
            console.error("Review Error:", error);

            res.status(500).json({
                message: "Could not review report."
            });
        }
    }
);


// STEP 4: FIND MATCHING ITEMS
router.get("/:id/matches", protect, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({
                message: "Item not found."
            });
        }

        const oppositeType =
            item.type === "lost" ? "found" : "lost";

        const matches = await Item.find({
            _id: { $ne: item._id },
            type: oppositeType,
            category: {
                $regex: "^" + item.category.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                ) + "$",
                $options: "i"
            },
            status: "approved"
        }).sort({ createdAt: -1 });

        res.json({
            message: matches.length
                ? "Possible matching items found."
                : "No matching items found yet.",
            matches
        });

    } catch (error) {
        console.error("Matching Error:", error);

        res.status(500).json({
            message: "Matching failed."
        });
    }
});

module.exports = router;
