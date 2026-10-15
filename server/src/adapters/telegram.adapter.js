import { Bot, InlineKeyboard } from 'grammy';
import { config } from '../config/env.js';
import { Group } from '../models/Group.js';
import { Check } from '../models/Check.js';
import { processIncomingMessage, hashSender } from '../services/orchestrator.service.js';

let bot = null;

// Track pending custom edits from installers: Map<installerUserId, checkId>
const pendingEdits = new Map();

/**
 * Sends a message to a Telegram group.
 * Strictly callable ONLY from approval handlers per ANTIGRAVITY_RULES.md.
 */
export async function sendToGroup(groupExternalId, text, replyToMessageId = null) {
  if (!bot) throw new Error('Telegram bot is not initialized');
  const options = {};
  if (replyToMessageId) {
    const parsedId = parseInt(replyToMessageId, 10);
    if (!isNaN(parsedId)) {
      options.reply_to_message_id = parsedId;
    }
  }
  return await bot.api.sendMessage(groupExternalId, text, options);
}

/**
 * Sends a one-time disclosure message when the bot joins or interacts with a group.
 */
export async function sendGroupDisclosure(groupExternalId) {
  if (!bot) return;
  const disclosureText = 
    `🛡️ *SachCheck is present in this group.*\n\n` +
    `I help identify forwarded misinformation and fact-check checkable claims.\n` +
    `• *Never auto-posts:* I will never post corrections directly into this chat on my own.\n` +
    `• *Human-in-the-loop:* Private alerts are sent exclusively to the installer, who approves every response.\n` +
    `• *Privacy first:* No member names are ever logged or shamed.\n\n` +
    `Group members can chat freely without worry! 🙏`;

  try {
    await bot.api.sendMessage(groupExternalId, disclosureText, { parse_mode: 'Markdown' });
  } catch (err) {
    console.warn(`[Telegram] Could not send disclosure to group ${groupExternalId}:`, err.message);
  }
}

/**
 * Sends a private nudge to the installer with analysis details and inline action buttons.
 */
export async function sendPrivateNudge(check, group) {
  if (!bot || !group?.installerChatId) {
    return;
  }

  const verdictLabel = check.verdict ? check.verdict.toUpperCase().replace('_', ' ') : 'UNVERIFIED';
  const confidencePct = check.confidence ? Math.round(check.confidence * 100) : 0;
  const groupName = group.name || 'Your Telegram Group';

  let tacticsText = 'None detected';
  if (check.tactics && check.tactics.length > 0) {
    tacticsText = check.tactics.map((t) => `• *${t.code.replace(/_/g, ' ')}:* ${t.explanation}`).join('\n');
  }

  let sourcesText = 'No external fact checks found';
  if (check.sources && check.sources.length > 0) {
    sourcesText = check.sources.map((s) => `• [${s.publisher || 'Source'}](${s.url}): ${s.title}`).join('\n');
  }

  let variantsText = 'No draft replies available';
  if (check.replyVariants && check.replyVariants.length > 0) {
    variantsText = check.replyVariants.map((v) => `*${v.tone.toUpperCase()}:*\n"${v.text}"`).join('\n\n');
  }

  const messageText = 
    `⚠️ *SachCheck Alert: Misinformation Detected*\n` +
    `📍 *Group:* ${groupName}\n\n` +
    `💬 *Original Message:*\n"${check.text}"\n\n` +
    `🔍 *Claim:* ${check.gate?.claimText || 'N/A'}\n` +
    `⚖️ *Verdict:* *${verdictLabel}* (${confidencePct}% confidence)\n\n` +
    `🎯 *Manipulation Tactics:*\n${tacticsText}\n\n` +
    `🔗 *Verified Sources:*\n${sourcesText}\n\n` +
    `📝 *Suggested Family Replies:*\n${variantsText}\n\n` +
    `*Select an action to correct this in the group:*`;

  const keyboard = new InlineKeyboard()
    .text('🕊️ Send Polite Correction (Gentle)', `approve:${check._id}:gentle`)
    .row()
    .text('📋 Send Factual', `approve:${check._id}:factual`)
    .row()
    .text('⚡ Send Short', `approve:${check._id}:short`)
    .row()
    .text('✏️ Edit Reply First', `edit:${check._id}`)
    .text('❌ Dismiss', `dismiss:${check._id}`);

  try {
    await bot.api.sendMessage(group.installerChatId, messageText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error(`[Telegram] Failed to send private nudge to installer ${group.installerChatId}:`, err.message);
  }
}

/**
 * Initializes and starts the grammY Telegram bot.
 */
export async function initTelegramBot() {
  if (!config.telegramBotToken) {
    console.warn('[Telegram] No TELEGRAM_BOT_TOKEN provided. Telegram adapter will run in mock mode.');
    return null;
  }

  try {
    bot = new Bot(config.telegramBotToken);

    // ==========================================
    // 1. Group Member Update: Bot added to group
    // ==========================================
    bot.on('my_chat_member', async (ctx) => {
      const status = ctx.myChatMember.new_chat_member.status;
      const chat = ctx.chat;

      if (['member', 'administrator'].includes(status) && ['group', 'supergroup'].includes(chat.type)) {
        const externalId = chat.id.toString();
        const installerId = ctx.from.id.toString();

        let group = await Group.findOne({ platform: 'telegram', externalId });
        if (!group) {
          group = new Group({
            platform: 'telegram',
            externalId,
            name: chat.title || 'Telegram Group',
            installerRef: hashSender(installerId),
            installerChatId: installerId,
            nudgeThreshold: config.nudgeThreshold,
          });
        } else {
          group.installerChatId = installerId;
        }

        await group.save();

        // Send one-time disclosure
        await sendGroupDisclosure(externalId);
        group.disclosureSentAt = new Date();
        await group.save();

        // Notify installer in private
        try {
          await bot.api.sendMessage(
            installerId,
            `🎉 *SachCheck is now linked to "${chat.title}"!*\n\n` +
            `I have posted a disclosure message in the group.\n` +
            `When dubious forwards appear in the group, you will receive private alerts here with respectful replies you can approve.`
          );
        } catch (_) {}
      }
    });

    // ==========================================
    // 2. Private Chat Commands
    // ==========================================
    bot.command('start', async (ctx) => {
      if (ctx.chat.type !== 'private') return;

      const installerId = ctx.from.id.toString();
      const payload = ctx.match?.trim(); // optional deep-link payload e.g. /start <groupExternalId>

      let linkedGroup = null;
      if (payload) {
        linkedGroup = await Group.findOne({ platform: 'telegram', externalId: payload });
        if (linkedGroup) {
          linkedGroup.installerChatId = installerId;
          linkedGroup.installerRef = hashSender(installerId);
          await linkedGroup.save();
        }
      }

      if (!linkedGroup) {
        linkedGroup = await Group.findOne({ platform: 'telegram', installerChatId: installerId }).sort({ updatedAt: -1 });
      }

      const groupStatus = linkedGroup
        ? `Linked Group: *${linkedGroup.name}*\nNudge Threshold: *${linkedGroup.nudgeThreshold}*\nStatus: *${linkedGroup.isPaused ? 'Paused ⏸️' : 'Active ✅'}*`
        : `_No group currently linked. Add @${bot.botInfo?.username || 'sachCheck_demo_bot'} to your family group to get started!_`;

      const welcome = 
        `👋 *Welcome to SachCheck!*\n\n` +
        `We don't just detect fake news, we help you correct it without fighting with family.\n\n` +
        `📊 *Current Settings:*\n${groupStatus}\n\n` +
        `🛠️ *Available Commands:*\n` +
        `• \`/threshold <0.1 - 1.0>\` — Set confidence threshold for alerts (e.g. \`/threshold 0.75\`)\n` +
        `• \`/pause\` — Temporarily pause fact-checking for the group\n` +
        `• \`/resume\` — Resume fact-checking\n` +
        `• \`/status\` — View current group status and threshold`;

      await ctx.reply(welcome, { parse_mode: 'Markdown' });
    });

    bot.command('threshold', async (ctx) => {
      if (ctx.chat.type !== 'private') return;

      const arg = ctx.match?.trim();
      const val = parseFloat(arg);

      if (isNaN(val) || val < 0.1 || val > 1.0) {
        return ctx.reply('⚠️ Please provide a valid threshold between 0.10 and 1.00.\nExample: `/threshold 0.80`', {
          parse_mode: 'Markdown',
        });
      }

      const installerId = ctx.from.id.toString();
      const group = await Group.findOne({ platform: 'telegram', installerChatId: installerId }).sort({ updatedAt: -1 });

      if (!group) {
        return ctx.reply('⚠️ No linked group found. Please add the bot to a group first.');
      }

      group.nudgeThreshold = val;
      await group.save();

      return ctx.reply(`✅ Nudge threshold for *${group.name}* updated to *${val.toFixed(2)}*`, {
        parse_mode: 'Markdown',
      });
    });

    bot.command('pause', async (ctx) => {
      if (ctx.chat.type !== 'private') return;

      const installerId = ctx.from.id.toString();
      const group = await Group.findOne({ platform: 'telegram', installerChatId: installerId }).sort({ updatedAt: -1 });

      if (!group) {
        return ctx.reply('⚠️ No linked group found. Add the bot to a group first.');
      }

      group.isPaused = true;
      await group.save();

      return ctx.reply(`⏸️ Fact-checking *paused* for group *${group.name}*. No alerts will be sent.`, {
        parse_mode: 'Markdown',
      });
    });

    bot.command('resume', async (ctx) => {
      if (ctx.chat.type !== 'private') return;

      const installerId = ctx.from.id.toString();
      const group = await Group.findOne({ platform: 'telegram', installerChatId: installerId }).sort({ updatedAt: -1 });

      if (!group) {
        return ctx.reply('⚠️ No linked group found. Add the bot to a group first.');
      }

      group.isPaused = false;
      await group.save();

      return ctx.reply(`▶️ Fact-checking *resumed* for group *${group.name}*.`, {
        parse_mode: 'Markdown',
      });
    });

    bot.command('status', async (ctx) => {
      if (ctx.chat.type !== 'private') return;

      const installerId = ctx.from.id.toString();
      const group = await Group.findOne({ platform: 'telegram', installerChatId: installerId }).sort({ updatedAt: -1 });

      if (!group) {
        return ctx.reply('ℹ️ No active group linked.');
      }

      const totalChecks = await Check.countDocuments({ groupId: group._id });
      const nudgedChecks = await Check.countDocuments({ groupId: group._id, status: { $in: ['nudged', 'approved'] } });

      return ctx.reply(
        `📌 *Group Status:* ${group.name}\n` +
        `• Threshold: *${group.nudgeThreshold}*\n` +
        `• Mode: *${group.isPaused ? 'Paused ⏸️' : 'Active ✅'}*\n` +
        `• Total messages scanned: *${totalChecks}*\n` +
        `• Dubious claims flagged: *${nudgedChecks}*`,
        { parse_mode: 'Markdown' }
      );
    });

    // ==========================================
    // 3. Callback Queries: Approve, Edit, Dismiss
    // ==========================================
    bot.callbackQuery(/^approve:([a-f0-9]{24}):(gentle|factual|short)$/, async (ctx) => {
      const checkId = ctx.match[1];
      const tone = ctx.match[2];

      const check = await Check.findById(checkId).populate('groupId');
      if (!check) {
        return ctx.answerCallbackQuery({ text: 'Check record not found.' });
      }

      if (!['nudged', 'completed'].includes(check.status)) {
        return ctx.answerCallbackQuery({ text: `Cannot approve: check is already ${check.status}.` });
      }

      const variant = check.replyVariants?.find((v) => v.tone === tone);
      const replyText = variant ? variant.text : '';

      if (!replyText) {
        return ctx.answerCallbackQuery({ text: 'Selected reply text not found.' });
      }

      // Check anti-hallucination URL rule
      const allowedUrls = new Set((check.sources || []).map((s) => s.url.trim()));
      const urlMatches = replyText.match(/https?:\/\/[^\s)\]>]+/g) || [];
      for (const url of urlMatches) {
        if (!allowedUrls.has(url)) {
          return ctx.answerCallbackQuery({ text: 'Error: ungrounded URL in reply.' });
        }
      }

      // 1. Post to group via sendToGroup (Human-in-the-loop: only approve handler posts)
      const groupExternalId = check.groupId?.externalId;
      if (groupExternalId) {
        try {
          await sendToGroup(groupExternalId, replyText, check.messageId);
        } catch (postErr) {
          console.error(`[Telegram] Failed to post reply to group ${groupExternalId}:`, postErr.message);
          return ctx.answerCallbackQuery({ text: 'Failed to post message to group.' });
        }
      }

      // 2. Mark approved in DB
      const postedAt = new Date();
      check.status = 'approved';
      check.approvedReply = {
        tone,
        text: replyText,
        edited: false,
        postedAt,
      };
      await check.save();

      // 3. Update nudge message in private chat
      await ctx.editMessageText(
        `✅ *Correction Posted to Group!*\n\n` +
        `*Tone:* ${tone.toUpperCase()}\n` +
        `*Posted Message:*\n"${replyText}"\n\n` +
        `_Posted at ${postedAt.toLocaleTimeString()}_`,
        { parse_mode: 'Markdown' }
      );

      return ctx.answerCallbackQuery({ text: 'Correction sent to the group!' });
    });

    bot.callbackQuery(/^edit:([a-f0-9]{24})$/, async (ctx) => {
      const checkId = ctx.match[1];
      pendingEdits.set(ctx.from.id, checkId);

      await ctx.reply(
        '✏️ *Send your edited reply as a text message here.*\n' +
        'Once sent, it will be posted directly to the group as a correction to the original message.',
        { parse_mode: 'Markdown' }
      );

      return ctx.answerCallbackQuery({ text: 'Ready for your edited text' });
    });

    bot.callbackQuery(/^dismiss:([a-f0-9]{24})$/, async (ctx) => {
      const checkId = ctx.match[1];
      const check = await Check.findById(checkId);

      if (check) {
        check.status = 'dismissed';
        await check.save();
      }

      await ctx.editMessageText(
        `❌ *Nudge Dismissed*\n\n` +
        `No correction was posted to the group. The check has been archived as dismissed.`,
        { parse_mode: 'Markdown' }
      );

      return ctx.answerCallbackQuery({ text: 'Dismissed. Nothing posted.' });
    });

    // ==========================================
    // 4. Message Ingestion (Group + Private text)
    // ==========================================
    bot.on('message:text', async (ctx) => {
      // Handle pending custom edit in private chat
      if (ctx.chat.type === 'private') {
        const checkId = pendingEdits.get(ctx.from.id);
        if (checkId) {
          const editedText = ctx.message.text.trim();
          pendingEdits.delete(ctx.from.id);

          const check = await Check.findById(checkId).populate('groupId');
          if (!check) {
            return ctx.reply('⚠️ Check not found.');
          }

          // Anti-hallucination check on custom text
          const allowedUrls = new Set((check.sources || []).map((s) => s.url.trim()));
          const urlMatches = editedText.match(/https?:\/\/[^\s)\]>]+/g) || [];
          for (const url of urlMatches) {
            if (!allowedUrls.has(url)) {
              return ctx.reply(
                `❌ The link \`${url}\` was not verified by our fact-checkers.\n` +
                `Per safety rules, only verified links can be shared. Please edit again.`
              );
            }
          }

          const groupExternalId = check.groupId?.externalId;
          if (groupExternalId) {
            try {
              await sendToGroup(groupExternalId, editedText, check.messageId);
            } catch (err) {
              return ctx.reply(`❌ Could not send to group: ${err.message}`);
            }
          }

          const postedAt = new Date();
          check.status = 'approved';
          check.approvedReply = {
            tone: 'custom',
            text: editedText,
            edited: true,
            postedAt,
          };
          await check.save();

          return ctx.reply(
            `✅ *Custom correction posted to group!*\n\n"${editedText}"`,
            { parse_mode: 'Markdown' }
          );
        }
        return;
      }

      // Group message ingestion
      if (['group', 'supergroup'].includes(ctx.chat.type)) {
        const externalId = ctx.chat.id.toString();
        const text = ctx.message.text;

        // Skip bot messages or empty texts
        if (!text || ctx.from.is_bot) return;

        let group = await Group.findOne({ platform: 'telegram', externalId });
        if (!group) {
          group = new Group({
            platform: 'telegram',
            externalId,
            name: ctx.chat.title || 'Telegram Group',
            installerRef: hashSender(ctx.from.id),
            nudgeThreshold: config.nudgeThreshold,
          });
          await group.save();
        }

        // Send one-time disclosure if not yet sent
        if (!group.disclosureSentAt) {
          await sendGroupDisclosure(externalId);
          group.disclosureSentAt = new Date();
          await group.save();
        }

        // If group is paused, ignore incoming messages
        if (group.isPaused) {
          return;
        }

        // Process message through orchestrator
        const check = await processIncomingMessage({
          platform: 'telegram',
          groupId: group._id,
          messageId: ctx.message.message_id.toString(),
          senderRef: ctx.from.id.toString(),
          text,
        });

        console.log(`[Telegram] Ingested message from "${group.name}": ${text.substring(0, 40)}... (Check ID: ${check._id})`);
      }
    });

    // Start bot polling
    bot.start({
      onStart: (botInfo) => {
        console.log(`[Telegram] Bot started as @${botInfo.username} (ID: ${botInfo.id})`);
      },
    });

    return bot;
  } catch (err) {
    console.error('[Telegram] Failed to start Telegram bot:', err.message);
    return null;
  }
}

