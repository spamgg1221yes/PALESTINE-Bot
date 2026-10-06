import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import pool from "../../database/postgres.js"; // Adjust this import path if your db client is in a different directory

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
    await interaction.deferReply();

    // Default to the user running the command if no target is specified
    const targetUser = interaction.options.getUser("target") || interaction.user;
    const guildId = interaction.guildId;

    try {
      // 1. Fetch stats from PostgreSQL database
      const query = `
        SELECT 
          messages_count, 
          timeouts_given, 
          kicks_given, 
          bans_given, 
          warnings_given, 
          active_minutes_today, 
          last_active_at
        FROM staff_activity 
        WHERE guild_id = $1 AND user_id = $2
      `;

      const result = await pool.query(query, [guildId, targetUser.id]);

      // 2. Fallback values if the user has no recorded stats yet
      const stats = result.rows[0] || {
        messages_count: 0,
        timeouts_given: 0,
        kicks_given: 0,
        bans_given: 0,
        warnings_given: 0,
        active_minutes_today: 0,
        last_active_at: null,
      };

      // 3. Format last active timestamp
      const lastActiveFormatted = stats.last_active_at
        ? `<t:${Math.floor(new Date(stats.last_active_at).getTime() / 1000)}:R>`
        : "No activity recorded";

      // 4. Build the Embed Response
      const statsEmbed = new EmbedBuilder()
        .setTitle(`📊 Staff Activity Statistics — ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setColor(0x00ff7f) // Green theme
        .addFields(
          {
            name: "💬 Chat Activity",
            value: `• **Total Messages:** \`${stats.messages_count}\`\n• **Active Time Today:** \`${stats.active_minutes_today} mins\``,
            inline: false,
          },
          {
            name: "🛡️ Moderation Actions Taken",
            value: [
              `• **Timeouts:** \`${stats.timeouts_given}\``,
              `• **Warnings:** \`${stats.warnings_given}\``,
              `• **Kicks:** \`${stats.kicks_given}\``,
              `• **Bans:** \`${stats.bans_given}\``,
            ].join("\n"),
            inline: false,
          },
          {
            name: "🕒 Last Active",
            value: lastActiveFormatted,
            inline: false,
          }
        )
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      // 5. Send reply
      return await interaction.editReply({ embeds: [statsEmbed] });

    } catch (error) {
      console.error("Error executing /modstats command:", error);
      return await interaction.editReply({
        content: "❌ An error occurred while fetching staff statistics from the database.",
      });
    }
  },
};
