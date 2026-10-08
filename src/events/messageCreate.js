import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getLevelingConfig, getUserLevelData } from '../services/leveling/leveling.js';
import { addXp } from '../services/leveling/xpSystem.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { parsePrefixCommand } from '../utils/prefixParser.js';
import { supportsPrefixExecution, executePrefixCommand, resolvePrefixAccessKey } from '../utils/messageAdapter.js';
import { resolveCommandAlias, resolveSubcommandAlias } from '../config/commands/commandAliases.js';
import { getPrefixRestriction } from '../config/commands/prefixRestrictions.js';
import { getGuildConfig } from '../services/config/guildConfig.js';
import { getCommandPrefix, getBotMessage, isBotOwner, isCommandCategoryEnabled, isMaintenanceMode } from '../config/bot.js';
import { enforceAbuseProtection, formatCooldownDuration } from '../utils/abuseProtection.js';
import { createEmbed } from '../utils/embeds.js';
import { isCommandEnabled } from '../services/commandAccessService.js';
import {
  getCountingGameConfig,
  saveCountingGameConfig,
  isValidCountingMessage,
  recordCorrectCount,
} from '../services/countingGameService.js';
import pool from '../database/postgres.js'; // Ensure path to your database pool is correct

const MESSAGE_XP_RATE_LIMIT_ATTEMPTS = 12;
const MESSAGE_XP_RATE_LIMIT_WINDOW_MS = 10000;

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    try {
      if (message.author.bot || !message.guild) return;

      logger.debug(`Message received from ${message.author.tag}:${message.content}`);

      // 1. AFK System Handling
      await handleAfk(message);

      // 2. Counting Game Handling
      const countingProcessed = await handleCountingGame(message, client);
      if (countingProcessed) {
        return;
      }

      // 3. Prefix Command Handling
      await handlePrefixCommand(message, client);

      // 4. Leveling System Handling
      await handleLeveling(message, client);
    } catch (error) {
      logger.error('Error in messageCreate event:', error);
    }
  }
};

async function handleAfk(message) {
  try {
    const guildId = message.guild.id;
    const userId = message.author.id;

    // Remove AFK status if the user speaks
    const afkCheck = await pool.query(
      'SELECT timestamp FROM afk_users WHERE guild_id = $1 AND user_id = $2',
      [guildId, userId]
    );

    if (afkCheck.rows.length > 0) {
      await pool.query(
        'DELETE FROM afk_users WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
      );

      // Remove [AFK] prefix from nickname if present
      if (message.guild.members.me.permissions.has('ManageNicknames')) {
        if (message.member.nickname?.startsWith('[AFK] ')) {
          const cleanName = message.member.nickname.replace('[AFK] ', '');
          await message.member.setNickname(cleanName).catch(() => {});
        }
      }

      const welcomeEmbed = createEmbed({
        title: 'Welcome Back!',
        description: `👋 <@${userId}>, I have removed your AFK status.`,
        color: 'success',
      });

      const replyMsg = await message.reply({ embeds: [welcomeEmbed] });
      setTimeout(() => replyMsg.delete().catch(() => {}), 5000);
    }

    // Check if mentioned users are AFK
    if (message.mentions.users.size > 0) {
      for (const [mentionedId, mentionedUser] of message.mentions.users) {
        if (mentionedId === userId || mentionedUser.bot) continue;

        const res = await pool.query(
          'SELECT reason, timestamp FROM afk_users WHERE guild_id = $1 AND user_id = $2',
          [guildId, mentionedId]
        );

        if (res.rows.length > 0) {
          const { reason, timestamp } = res.rows[0];
          const timeAgo = `<t:${Math.floor(timestamp / 1000)}:R>`;

          const notifyEmbed = createEmbed({
            title: 'User is AFK',
            description: `💤 **${mentionedUser.username}** is currently AFK: **${reason}** (${timeAgo})`,
            color: 'warning',
          });

          await message.reply({ embeds: [notifyEmbed] });
        }
      }
    }
  } catch (error) {
    logger.error('Error in AFK handling:', error);
  }
}

async function handlePrefixCommand(message, client) {
  try {
    const guildConfig = await getGuildConfig(client, message.guild.id);
    const prefix = guildConfig?.prefix || getCommandPrefix();
    const parsed = parsePrefixCommand(message.content, prefix);
    
    if (!parsed) {
      return; 
    }

    let { commandName, args } = parsed;
    const musicPrefixShortcut = commandName.toLowerCase();
    const MUSIC_PREFIX_SHORTCUTS = new Set(['leave', 'pause', 'resume', 'skip', 'stop', 'volume']);
    if (MUSIC_PREFIX_SHORTCUTS.has(musicPrefixShortcut)) {
      commandName = 'music';
      args = [musicPrefixShortcut, ...args];
    }

    logger.info(`Prefix command detected: ${commandName}, args:${args.join(', ')}`);

    const resolvedCommandName = resolveCommandAlias(commandName);
    logger.info(`Resolved command name: ${resolvedCommandName}`);
    const command = client.commands.get(resolvedCommandName);

    if (!command) {
      logger.warn(`Command not found: ${resolvedCommandName}`);
      return; 
    }

    if (isMaintenanceMode() && !isBotOwner(message.author.id)) {
      await message.channel.send({
        embeds: [createEmbed({
          title: 'Maintenance Mode',
          description: getBotMessage('maintenanceMode'),
          color: 'warning',
        })],
      }).catch(() => {});
      return;
    }

    if (!isCommandCategoryEnabled(command.category)) {
      await message.channel.send({
        embeds: [createEmbed({
          title: 'Feature Disabled',
          description: getBotMessage('commandDisabled'),
          color: 'error',
        })],
      }).catch(() => {});
      return;
    }

    const restriction = getPrefixRestriction(command, args, resolveSubcommandAlias);
    if (!supportsPrefixExecution(command) || restriction.blocked) {
      if (restriction.blocked && restriction.reason) {
        const embed = createEmbed({
          title: 'Slash Command Only',
          description: `${restriction.reason}\nUse \`/${resolvedCommandName}\` instead.`,
          color: 'info',
        });
        await message.channel.send({ embeds: [embed] }).catch(() => {});
      }
      return;
    }

    if (!(await isCommandEnabled(client, message.guild.id, resolvePrefixAccessKey(command.data, args), command.category))) {
      const embed = createEmbed({
        title: 'Command Disabled',
        description: 'This command has been disabled for this server.',
        color: 'error',
      });
      await message.channel.send({ embeds: [embed] }).catch(() => {});
      return;
    }

    const mockInteractionForProtection = {
      guildId: message.guild.id,
      user: message.author,
    };
    const abuseProtection = await enforceAbuseProtection(
      mockInteractionForProtection,
      command,
      resolvedCommandName,
    );
    if (!abuseProtection.allowed) {
      const formattedCooldown = formatCooldownDuration(abuseProtection.remainingMs);
      const embed = createEmbed({
        title: 'Command Cooldown',
        description: `This command is on cooldown.
