import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { getLeaderboard, getLevelingConfig, getXpForLevel } from '../../services/leveling/leveling.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

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
            .setColor('#ED4245')
            .setDescription('🚫 **The leveling system is currently disabled on this server.**')
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

    const top3 = [];
    const rest = [];

    await Promise.all(
      leaderboard.map(async (user, index) => {
        try {
          const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
          const userMention = member?.user.toString() || `<@${user.userId}>`;
          const xpForNext = getXpForLevel(user.level + 1);

          if (index === 0) {
            top3[0] = `👑 **#1** │ ${userMention}\n> Level \`${user.level}\` • \`${user.xp.toLocaleString()}/${xpForNext.toLocaleString()} XP\``;
          } else if (index === 1) {
            top3[1] = `🥈 **#2** │ ${userMention}\n> Level \`${user.level}\` • \`${user.xp.toLocaleString()}/${xpForNext.toLocaleString()} XP\``;
          } else if (index === 2) {
            top3[2] = `🥉 **#3** │ ${userMention}\n> Level \`${user.level}\` • \`${user.xp.toLocaleString()}/${xpForNext.toLocaleString()} XP\``;
          } else {
            rest[index - 3] = `\`#${(index + 1).toString().padStart(2, '0')}\` ${userMention} — **Lvl ${user.level}** (\`${user.xp.toLocaleString()} XP\`)`;
          }
        } catch {
          if (index < 3) top3[index] = `\`#${index + 1}\` Error loading user <@${user.userId}>`;
          else rest[index - 3] = `\`#${index + 1}\` Error loading user <@${user.userId}>`;
        }
      })
    );

    const embed = new EmbedBuilder()
      .setTitle(`✨ ${interaction.guild.name} Top Activity`)
      .setColor('#2F3136')
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || null);

    if (top3.length > 0) {
      embed.addFields({ name: '🔥 Top Champions', value: top3.join('\n\n'), inline: false });
    }

    if (rest.length > 0) {
      embed.addFields({ name: '⚡ Contenders', value: rest.join('\n'), inline: false });
    }

    embed
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`, 
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp();

    await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    logger.debug(`Leaderboard displayed for guild ${interaction.guildId}`);
  }
};
