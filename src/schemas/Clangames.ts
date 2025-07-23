import mongoose from "mongoose";

const ClangameMemberSchema = new mongoose.Schema({
    // Define your member schema fields here
    playerTag: {
        type: String,
        required: true,
    },
    playerName: {
        type: String,
        required: true,
    },
    startingScore:
    {
        type: Number,
        required: true,
        default: 0
    },
    endingScore: {
        type: Number,
        required: true,
        default: 0
    },
    totalScore:
    {
        type: Number,
        required: true,
        default: 0
    }
});

const ClangameSchema = new mongoose.Schema({
    // Define your schema fields here
    clanTag: {
        type: String,
        required: true,
    },
    month: {
        type: String,
        required: true,
    },
    members: [ClangameMemberSchema],
    totalClanScore: {
        type: Number,
        required: true,
    }
});

const ClangameModel = mongoose.model("Clangame", ClangameSchema);

export default ClangameModel;