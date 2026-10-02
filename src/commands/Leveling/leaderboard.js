import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { getLeaderboard, getLevelingConfig, getXpForLevel } from '../../services/leveling/leveling.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

/**
 * Creates a text-based progress bar
 */
function createProgressBar(currentXP, requiredXP, barSize = 8) {
  const progress = Math.min(Math.max(currentXP / requiredXP, 0), 1);
  const filledBlocks = Math.round(progress * barSize);
  const emptyBlocks = barSize - filledBlocks;
  return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
}

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription("Shows the server's level leaderboard")
    .setDMPermission(false),
  category: 'Leveling',

  async execute(interaction, config, client) {
    await InteractionHelper.safeDefer(interaction);

    const levelingConfig = await getLevelingConfig(client, interaction.guildId);

    if (!levelingConfig?.enabled) {
      await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          new EmbedBuilder()
            .setColor('#f1c40f')
            .setDescription('⚠️ The leveling system is currently disabled on this server.')
        ],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const leaderboard = await getLeaderboard(client, interaction.guildId, 10);

    if (leaderboard.length === 0) {
      throw new TitanBotError(
        'No leaderboard data found',
        ErrorTypes.DATABASE,
        'No level data found yet. Start chatting to gain XP!'
      );
    }

    const leaderboardText = await Promise.all(
      leaderboard.map(async (user, index) => {
        try {
          const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
          const userMention = member?.user.toString() || `<@${user.userId}>`;
          const xpForNextLevel = getXpForLevel(user.level + 1);
          
          // Progress Bar Calculation
          const progressBar = createProgressBar(user.xp, xpForNextLevel);
          const xpFormatted = user.xp.toLocaleString();
          const nextXpFormatted = xpForNextLevel.toLocaleString();

          // Badges for Top Ranks
          let rankBadge = `\`#${index + 1}\``;
          if (index === 0) rankBadge = '🥇 **#1**';
          else if (index === 1) rankBadge = '🥈 **#2**';
          else if (index === 2) rankBadge = '🥉 **#3**';

          return `${rankBadge}${userMention}\n┗ 📜 **Level ${user.level}** │ \`[${progressBar}]\` \`${xpFormatted} / ${nextXpFormatted} XP\``;
        } catch {
          return `\`#${index + 1}\` Error loading user <@${user.userId}>`;
        }
      })
    );

    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${interaction.guild.name} — Leaderboard`)
      .setColor('#5865F2') // Discord Blurple color
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || null)
      .setDescription(leaderboardText.join('\n\n'))
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`, 
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp();

    await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    logger.debug(`Leaderboard displayed for guild ${interaction.guildId}`);
  }
};
