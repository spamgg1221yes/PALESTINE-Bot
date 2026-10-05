import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { pgConfig } from "../database/postgres.js"; // Adjust path to your PG pool

export default {
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
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser("target") || interaction.user;
    const guildId = interaction.guildId;

    try {
      // Query PostgreSQL database for staff activity
      const statsQuery = `
        SELECT 
          messages_count,
          timeouts_given,
          kicks_given,
          bans_given,
          warnings_given,
          active_minutes_today,
          last_active_at
        FROM staff_activity
        WHERE guild_id = $1 AND user_id = $2;
      `;

      const result = await pgConfig.query(statsQuery, [guildId, targetUser.id]);
      const stats = result.rows[0] || {
        messages_count: 0,
        timeouts_given: 0,
        kicks_given: 0,
        bans_given: 0,
        warnings_given: 0,
        active_minutes_today: 0,
        last_active_at: null,
      };

      // Convert active minutes into hours & minutes
      const hours = Math.floor(stats.active_minutes_today / 60);
      const minutes = stats.active_minutes_today % 60;
      const timeFormatted = `${hours}h${minutes}m`;

      const lastActiveFormatted = stats.last_active_at
        ? `<t:${Math.floor(new Date(stats.last_active_at).getTime() / 1000)}:R>`
        : "No activity recorded";

      // Build stats embed
      const embed = new EmbedBuilder()
        .setTitle(`🛡️ Moderation Statistics — ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setColor(0x0099ff)
        .addFields(
          { name: "💬 Messages Sent", value: `\`${stats.messages_count.toLocaleString()}\``, inline: true },
          { name: "⏱️ Active Today", value: `\`${timeFormatted}\``, inline: true },
          { name: "🕒 Last Active", value: lastActiveFormatted, inline: true },
          { name: "⚠️ Warnings Issued", value: `\`${stats.warnings_given}\``, inline: true },
          { name: "🔇 Timeouts / Mutes", value: `\`${stats.timeouts_given}\``, inline: true },
          { name: "🔨 Kicks / Bans", value: `\`${stats.kicks_given} K / ${stats.bans_given} B\``, inline: true }
        )
        .setFooter({ text: "PALESTINE Staff Tracking System" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error fetching modstats:", error);
      await interaction.editReply({
        content: "❌ An error occurred while retrieving staff statistics from PostgreSQL.",
      });
    }
  },
};
