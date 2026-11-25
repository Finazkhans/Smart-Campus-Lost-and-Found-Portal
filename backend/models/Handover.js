
const mongoose = require("mongoose");

const handoverSchema = new mongoose.Schema({

    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: true
    },

    claim: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Claim",
        required: true,
        unique: true
    },

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    handedOverBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    location: {
        type: String,
        required: true,
        trim: true
    },

    handoverDate: {
        type: Date,
        default: Date.now
    },

    remarks: {
        type: String,
        default: ""
    }

}, { timestamps: true });

module.exports = mongoose.model("Handover", handoverSchema);
