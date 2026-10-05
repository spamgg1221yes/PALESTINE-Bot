import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";

export default {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("modstats")
    .setDescription("View moderation statistics and chat activity for a staff member")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The staff member to view stats for")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    // Your modstats execution logic
  },
};
