
const express = require("express");

const router = express.Router();

const Handover = require("../models/Handover");
const Claim = require("../models/Claim");
const { protect } = require("../middleware/auth");

// =====================================
// ADMIN: RECORD HANDOVER
// =====================================

router.post("/", protect, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Only admin can record handover."
            });
        }

        const { claimId, location, notes } = req.body;

        if (!claimId || !location || !location.trim()) {
            return res.status(400).json({
                message: "Claim ID and location are required."
            });
        }

        const claim = await Claim.findById(claimId)
            .populate("item");

        if (!claim || !claim.item) {
            return res.status(404).json({
                message: "Claim or item not found."
            });
        }

        if (claim.status !== "approved") {
            return res.status(400).json({
                message: "Only approved claims can be handed over."
            });
        }

        const existing = await Handover.findOne({
            claim: claim._id
        });

        if (existing) {
            return res.status(409).json({
                message: "Handover already recorded."
            });
        }

        const handover = await Handover.create({
            item: claim.item._id,
            claim: claim._id,
            owner: claim.claimant,
            handedOverBy: req.user._id,
            location: location.trim(),
            remarks: notes || ""
        });

        const savedHandover = await Handover.findById(
            handover._id
        )
            .populate("item")
            .populate("owner", "name studentId email")
            .populate("claim");

        res.status(201).json({
            message: "Handover recorded successfully!",
            handover: savedHandover
        });

    } catch (error) {
        console.error("Handover Error:", error);

        res.status(500).json({
            message: error.message || "Could not record handover."
        });
    }
});

// =====================================
// ADMIN: VIEW ALL HANDOVERS
// =====================================

router.get("/", protect, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Only admin can view handover records."
            });
        }

        const handovers = await Handover.find()
            .populate("item")
            .populate("owner", "name studentId email")
            .populate("handedOverBy", "name email")
            .populate("claim")
            .sort({ createdAt: -1 });

        res.json({ handovers });

    } catch (error) {
        console.error("Handover Fetch Error:", error);

        res.status(500).json({
            message: "Could not load handover records."
        });
    }
});

// =====================================
// STUDENT: VIEW OWN HANDOVERS
// =====================================

router.get("/mine", protect, async (req, res) => {
    try {
        const handovers = await Handover.find({
            owner: req.user._id
        })
            .populate("item")
            .populate("claim")
            .sort({ createdAt: -1 });

        res.json({ handovers });

    } catch (error) {
        res.status(500).json({
            message: "Could not load your handovers."
        });
    }
});

module.exports = router;
