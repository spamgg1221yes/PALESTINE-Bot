import { fileURLToPath } from "url";
import path from "path";
import botConfig, { validateConfig } from "./bot.js";
import { shopConfig as shop } from "./shop/index.js";
import { pgConfig } from "./database/postgres.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appConfig = {
  paths: {
    root: path.join(__dirname, "../.."),
    commands: path.join(__dirname, "../commands"),
    events: path.join(__dirname, "../events"),
    config: __dirname,
    utils: path.join(__dirname, "../utils"),
    services: path.join(__dirname, "../services"),
    handlers: path.join(__dirname, "../handlers"),
    interactions: path.join(__dirname, "../interactions"),
  },

  bot: {
    ...botConfig,
    token: process.env.DISCORD_TOKEN || process.env.TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,

    shop: {
      ...botConfig.shop,
      ...shop,
    },
  },

  // -------------------------------------------------------------
  // STAFF APPLICATIONS & TERMS AND CONDITIONS
  // -------------------------------------------------------------
  staffSystem: {
    serverTag: "GAZA",
    requiredInvites: 5,
    termsAndConditions: [
      "Adopt our server tag (GAZA) in your profile or nickname.",
      "Invite at least 5 new members to the server.",
      "Stay active and engaged in the chat.",
      "All requirements must be verified and completed before final role assignment."
    ],
    applications: {
      admin: {
        title: "Admin Application",
        questions: [
          {
            id: "q1",
            label: "Experience & Motivation",
            question: "What prior experience do you have in server administration or staff leadership, and why are you applying for Admin on PALESTINE?",
            required: true
          },
          {
            id: "q2",
            label: "Emergency Response",
            question: "Scenario: A serious conflict or raid occurs while senior leadership is offline. What immediate step-by-step actions will you take to protect the server and restore order?",
            required: true
          },
          {
            id: "q3",
            label: "Availability & Staff Management",
            question: "How many hours per week can you dedicate to the server, and how would you handle a situation where a staff member under you breaks a rule?",
            required: true
          }
        ]
      }
    },
    moderatorGuidelines: {
      title: "Moderator Rules & Guidelines",
      rules: [
        {
          id: 1,
          topic: "Language Policy",
          description: "If any member speaks a language other than English in the general chat, politely remind them to use English and guide them to use #global-discussion for other languages."
        },
        {
          id: 2,
          topic: "Handling Toxicity & Abuse",
          description: "If anyone uses offensive language, abuses, or spreads toxicity, immediately issue a timeout based on severity."
        },
        {
          id: 3,
          topic: "Maintaining Chat Activity",
          description: "Moderators must keep the chat lively, engage with members, and help revive dead chats by starting healthy conversations or asking questions."
        },
        {
          id: 4,
          topic: "Enforcing Server Rules",
          description: "Ensure all members follow community guidelines. Actively monitor and take immediate action against spam, self-promotion, or unsafe links."
        },
        {
          id: 5,
          topic: "Assisting New Members",
          description: "Welcome newcomers, answer basic questions about the server, and guide them on server mechanics to ensure a comfortable environment."
        },
        {
          id: 6,
          topic: "Professional Conduct",
          description: "Always remain calm, fair, and professional while dealing with members. Do not misuse permissions, and set a positive example for the community."
        }
      ]
    }
  },

  // PostgreSQL configuration - Primary production database
  postgresql: {
    ...pgConfig,
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: {
      enabled: process.env.LOG_TO_FILE === "true",
      path: path.join(__dirname, "../../logs"),
      maxSize: "20m",
      maxFiles: "14d",
      zippedArchive: true,
    },
    console: {
      enabled: true,
      colorize: true,
      timestamp: true,
    },
    sentry: {
      enabled: process.env.SENTRY_DSN ? true : false,
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
    },
  },

  api: {
    port: process.env.PORT || 3000,
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100,
    },
  },

  shop,

  features: {
    ...botConfig.features,
    music: botConfig.features?.music ?? true,
  },

  env: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV !== "production",
};

Object.freeze(appConfig);

export default appConfig;
