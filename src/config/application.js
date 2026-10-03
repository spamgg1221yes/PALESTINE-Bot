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
      "All requirements must be verified before final role assignment."
    ],
    applications: {
      admin: {
        title: "Admin Application",
        questions: [
          { id: "q1", label: "Past Experience", question: "What is your past Admin experience?", required: true },
          { id: "q2", label: "Motivation", question: "Why do you want Admin on PALESTINE?", required: true },
          { id: "q3", label: "Emergency Scenario", question: "How will you handle a raid if leaders are away?", required: true },
          { id: "q4", label: "Staff Supervision", question: "How would you deal with a breaking staff member?", required: true },
          { id: "q5", label: "Weekly Commitment", question: "How many hours per week can you dedicate?", required: true }
        ]
      },
      moderator: {
        title: "Moderator Application",
        questions: [
          { id: "q1", label: "Motivation", question: "Why do you want Moderator on PALESTINE?", required: true },
          { id: "q2", label: "Past Experience", question: "What prior moderation experience do you have?", required: true },
          { id: "q3", label: "Moderation Handling", question: "How will you handle toxicity, spam, or abuse?", required: true },
          { id: "q4", label: "Chat Engagement", question: "How will you keep chat active and welcoming?", required: true },
          { id: "q5", label: "Activity & Timezone", question: "What is your weekly activity and time zone?", required: true }
        ]
      }
    },
    moderatorGuidelines: {
      title: "Moderator Rules & Guidelines",
      rules: [
        { id: 1, topic: "Language Policy", description: "If any member speaks a language other than English in general chat, remind them to use English and guide them to #global-discussion for other languages." },
        { id: 2, topic: "Handling Toxicity & Abuse", description: "If anyone uses offensive language, abuses, or spreads toxicity, immediately issue a timeout based on severity." },
        { id: 3, topic: "Maintaining Chat Activity", description: "Keep chat lively, engage with members, and help revive dead chats by starting healthy conversations." },
        { id: 4, topic: "Enforcing Server Rules", description: "Ensure all members follow rules. Monitor and take immediate action against spam, self-promotion, or unsafe links." },
        { id: 5, topic: "Assisting New Members", description: "Welcome newcomers, answer basic questions, and guide them on server mechanics." },
        { id: 6, topic: "Professional Conduct", description: "Remain calm, fair, and professional. Do not misuse permissions, and set a good example." }
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
