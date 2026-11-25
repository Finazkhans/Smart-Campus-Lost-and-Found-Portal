
const express = require("express");
const mongoose = require("mongoose");

const Claim = require("../models/Claim");
const Item = require("../models/Item");
const { protect } = require("../middleware/auth");

const router = express.Router();

// =====================================
// STEP 1: STUDENT SUBMITS CLAIM
// =====================================

router.post("/", protect, async (req, res) => {
    try {
        const { itemId, message } = req.body;

        if (!itemId || !message || message.trim().length < 5) {
            return res.status(400).json({
                message: "Enter item details and explanation."
            });
        }

        if (!mongoose.isValidObjectId(itemId)) {
            return res.status(400).json({
                message: "Invalid item ID."
            });
        }

        const item = await Item.findById(itemId);

        if (!item || item.status !== "approved" || item.type !== "found") {
            return res.status(404).json({
                message: "Found item is not available for claims."
            });
        }

        if (String(item.reporter) === String(req.user._id)) {
            return res.status(400).json({
                message: "You cannot claim your own item."
            });
        }

        const existingClaim = await Claim.findOne({
            item: itemId,
            claimant: req.user._id,
            status: { $in: ["pending", "approved"] }
        });

        if (existingClaim) {
            return res.status(409).json({
                message: "You already submitted a claim for this item."
            });
        }

        const claim = await Claim.create({
            item: itemId,
            claimant: req.user._id,
            message: message.trim()
        });

        res.status(201).json({
            message: "Claim submitted successfully!",
            claim
        });

    } catch (error) {
        console.error("Submit Claim Error:", error);

        res.status(500).json({
            message: "Could not submit claim."
        });
    }
});

// =====================================
// STEP 2: STUDENT VIEWS OWN CLAIMS
// =====================================

router.get("/mine", protect, async (req, res) => {
    try {
        const claims = await Claim.find({
            claimant: req.user._id
        })
        .populate("item")
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            claims
        });

    } catch (error) {
        console.error("My Claims Error:", error);

        res.status(500).json({
            message: "Could not load your claims."
        });
    }
});

// =====================================
// STEP 3: ADMIN VIEWS PENDING CLAIMS
// =====================================

router.get("/admin/pending", protect, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin access required."
            });
        }

        const claims = await Claim.find({
            status: "pending"
        })
        .populate("item")
        .populate("claimant", "name studentId email")
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            claims
        });

    } catch (error) {
        console.error("Pending Claims Error:", error);

        res.status(500).json({
            message: "Could not load pending claims."
        });
    }
});

// =====================================
// STEP 4: ADMIN APPROVES OR REJECTS
// =====================================

router.patch("/:id/decision", protect, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Only admin can approve or reject claims."
            });
        }

        const { decision } = req.body;

        if (!["approved", "rejected"].includes(decision)) {
            return res.status(400).json({
                message: "Invalid decision."
            });
        }

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid claim ID."
            });
        }

        const claim = await Claim.findById(req.params.id)
            .populate("item");

        if (!claim || !claim.item) {
            return res.status(404).json({
                message: "Claim or item not found."
            });
        }

        if (claim.status !== "pending") {
            return res.status(400).json({
                message: "This claim has already been reviewed."
            });
        }

        claim.status = decision;
        claim.verifiedBy = req.user._id;

        await claim.save();

        if (decision === "approved") {
            claim.item.status = "claimed";
            await claim.item.save();
        }

        res.json({
            success: true,
            message: `Claim ${decision} successfully.`,
            claim
        });

    } catch (error) {
        console.error("Claim Decision Error:", error);

        res.status(500).json({
            message: "Could not update claim."
        });
    }
});

module.exports = router;
