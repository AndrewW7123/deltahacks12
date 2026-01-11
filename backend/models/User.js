import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Primary Key
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    // Questionnaire Data
    displayName: {
      type: String,
      trim: true,
    },
    profilePhoto: {
      type: String, // URL to profile photo/avatar
      trim: true,
    },
    heightFeet: {
      type: Number,
      min: 0,
    },
    heightInches: {
      type: Number,
      min: 0,
      max: 11, // Can't be 12 or more inches
    },
    weightLbs: {
      type: Number,
      min: 0,
    },
    hairLength: {
      type: String,
      enum: ["BALD", "SHORT", "MEDIUM", "LONG"],
      trim: true,
    },
    hairType: {
      type: String,
      enum: ["STRAIGHT", "CURLY"],
      trim: true,
    },

    // Calculated Goals (from showerAlgorithm)
    idealTimeRange: {
      min: {
        type: Number,
        min: 0,
      },
      max: {
        type: Number,
        min: 0,
      },
    },
    idealTemp: {
      type: Number,
      min: 0,
    },

    // Daily Score Tracking
    dailyScores: [
      {
        date: {
          type: Date,
          required: true,
        },
        totalPoints: {
          type: Number,
          default: 0,
        },
        showerCount: {
          type: Number,
          default: 0,
        },
        cleanEnvCoins: {
          type: Number,
          default: 0,
        },
        soapTokenCoins: {
          type: Number,
          default: 0,
        },
        showers: [
          {
            time: {
              type: Number, // Duration in seconds
              required: true,
            },
            temperature: {
              type: Number, // Temperature in Celsius
              required: true,
            },
            points: {
              type: Number,
              required: true,
            },
            cleanEnvCoins: {
              type: Number,
              default: 0,
            },
            soapTokenCoins: {
              type: Number,
              default: 0,
            },
            timestamp: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],

    // Total Lifetime Stats
    totalPoints: {
      type: Number,
      default: 0,
    },
    totalShowers: {
      type: Number,
      default: 0,
    },
    totalCleanEnvCoins: {
      type: Number,
      default: 0,
    },
    totalSoapTokenCoins: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Create indexes for better query performance
userSchema.index({ walletAddress: 1 });
userSchema.index({ status: 1 });

const User = mongoose.model("User", userSchema);

export default User;

