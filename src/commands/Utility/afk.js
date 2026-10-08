import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import pool from "../../database/postgres.js"; // Adjust path to your pg pool

export default {
  category: "Utility",
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set your AFK status")
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for going AFK")
        .setRequired(false)
    ),

  async execute(interaction) {
    const reason = interaction.options.getString("reason") || "AFK";
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const timestamp = Date.now();

    try {
      // Insert or update AFK status
      await pool.query(
        `INSERT INTO afk_users (guild_id, user_id, reason, timestamp)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (guild_id, user_id) 
         DO UPDATE SET reason = EXCLUDED.reason, timestamp = EXCLUDED.timestamp`,
        [guildId, userId, reason, timestamp]
      );

      // Optional: Set [AFK] nickname prefix
      if (interaction.guild.members.me.permissions.has("ManageNicknames")) {
        const member = await interaction.guild.members.fetch(userId);
        if (!member.nickname?.startsWith("[AFK] ")) {
          await member.setNickname(`[AFK] ${member.displayName}`).catch(() => {});
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0x00ff7f)
        .setDescription(`💤 <@${userId}> is now AFK: **${reason}**`);

      return await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error setting AFK:", error);
      return await interaction.reply({
        content: "❌ Failed to set your AFK status.",
        ephemeral: true,
      });
    }
  },
};
