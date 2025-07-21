import mongoose from "mongoose";

// Define the schema for the trophy roles

const configSchema = new mongoose.Schema({
    creationDate: { type: Date, default: Date.now },
    devGuildIds: { type: [String], default: [] },
    devUserIds: { type: [String], default: [] },
    devRoleIds: { type: [String], default: [] },
    skipBuiltInValidations: { type: Boolean, default: false },
    bulkRegister: { type: Boolean, default: true },
    trophyRoles: {
        type: [{
            name: { type: String, required: true },
            color: { type: String, required: true }
        }],
        default: [
            {
                name: "Bronze Trophy",
                color: "#b37f54"
            },
            {
                name: "Silver Trophy",
                color: "#c9cac5"
            },
            {
                name: "Gold Trophy",
                color: "#f4e16c"
            },
            {
                name: "Crystal",
                color: "#632185"
            },
            {
                name: "Master",
                color: "#8b8b8b"
            },
            {
                name: "Champion",
                color: "#802119"
            },
            {
                name: "Titan",
                color: "#dcac2f"
            },
            {
                name: "Legendary",
                color: "#834bf0"
            }
        ]
    },
    clanList: {
        type: [{
            name: { type: String, required: true },
            tag: { 
                type: String, 
                required: true,
                validate: {
                    validator: function(v: string) {
                        return v.startsWith('#');
                    },
                    message: 'Tag must start with #'
                }
            }
        }],
        default: []
    }
});

const ConfigModel = mongoose.model("Config", configSchema);

export default ConfigModel;
