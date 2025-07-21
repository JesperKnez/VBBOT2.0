import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    creationDate: { type: Date, default: Date.now },
    userName: { type: String, required: true },
    displayName: { type: String, required: true },
    birthday: { type: Date, default: null },
    clashAccounts: [{
        playerTag: { type: String, required: true, unique: true },
        playerName: { type: String, required: true },
        reminderSubscription: { type: Boolean, default: false },
    }]
});

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
