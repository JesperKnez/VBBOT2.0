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
        troops: { type: mongoose.Schema.Types.Mixed },
        heroes: { type: mongoose.Schema.Types.Mixed },
        spells: { type: mongoose.Schema.Types.Mixed },
        heroEquipment: { type: mongoose.Schema.Types.Mixed },
        reminderSubscription: { type: Boolean, default: false },
        isMainAccount: { type: Boolean, default: false },
    }]
});

export interface IUser {
    discordId: string;
    creationDate: Date;
    userName: string;
    displayName: string;
    birthday?: Date | null;
    clashAccounts: {
        playerTag: string;
        playerName: string;
        reminderSubscription?: boolean;
        isMainAccount?: boolean;
    }[];
}

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
