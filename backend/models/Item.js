
const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true
        },

        category: {
            type: String,
            required: true
        },

        type: {
            type: String,
            enum: ["lost", "found"],
            required: true
        },

        location: {
            type: String,
            required: true
        },

        itemDate: {
            type: Date,
            required: true
        },

        // Stores the uploaded item's image URL or Base64 data
        imageUrl: {
            type: String,
            default: ""
        },

        reporter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        status: {
            type: String,
            enum: [
                "pending",
                "approved",
                "claimed",
                "returned",
                "rejected"
            ],
            default: "pending"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Item", itemSchema);
