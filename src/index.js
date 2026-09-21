require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "settings.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "{}");

const loadData = () => {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return {}; }
};
const saveData = () => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

const data = loadData();
const cooldowns = new Map();
const giveaways = new Map();
const spamTracker = new Map();
let developerId = null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const guildData = (guildId) => {
  data[guildId] ??= { warnings: {}, xp: {}, economy: {}, welcomeChannel: null, logChannel: null, automod: false, autoreplies: {}, lastDaily: {}, lastWork: {} };
  return data[guildId];
};

function designAdvice(topic) {
  const t = topic.toLowerCase();
  if (t.includes("thumbnail")) return "Build around one main subject, 2–4 words of large text, strong contrast, and a clear foreground/background separation. Check readability at phone size.";
  if (t.includes("logo")) return "Start with a simple silhouette, test it in monochrome, then add color. Make sure it works as a tiny profile icon and as a large mark.";
  if (t.includes("banner")) return "Keep important text inside safe areas, establish one visual hierarchy, and match the banner to the brand's primary colors and typography.";
  if (t.includes("overlay")) return "Keep gameplay space clear, use consistent panels and typography, and avoid excessive animation that distracts from the stream.";
  return "Use hierarchy, contrast, alignment, repetition and whitespace. Start simple, then add effects only when they improve the message.";
}

function gamingAdvice(topic) {
  const t = topic.toLowerCase();
  if (t.includes("sensitivity")) return "Sensitivity depends on device, FPS, touch layout and play style. Change one setting at a time and test with a consistent drill before locking it in.";
  if (t.includes("fps") || t.includes("performance")) return "Reduce expensive effects first, keep a stable frame-rate target, watch temperatures, and avoid settings that cause thermal throttling.";
  if (t.includes("stream")) return "Choose resolution and bitrate based on your upload bandwidth and encoder hardware. Test locally before going live.";
  if (t.includes("thumbnail")) return "Use the actual game's visual language while keeping your own branding: one focal subject, high contrast and readable text.";
  return "I can help break down controls, performance, streaming, recording, content strategy and gaming graphics.";
}

async function log(guild, message) {
  const cfg = guildData(guild.id);
  if (!cfg.logChannel) return;
  const channel = guild.channels.cache.get(cfg.logChannel);
  if (channel?.isTextBased()) channel.send({ content: "📝 " + message }).catch(() => {});
}

client.once(Events.ClientReady, async (c) => {
  try {
    const app = await c.application.fetch();
    developerId = app.owner?.id || null;
  } catch (error) {
    console.error("Could not resolve EMOX developer:", error);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━");
  console.log(" EMOX is online!");
  console.log(" Logged in as:", c.user.tag);
  console.log(" Servers:", c.guilds.cache.size);
  console.log("━━━━━━━━━━━━━━━━━━━━");
  c.user.setActivity("With Emo", { type: 0 });
});

client.on(Events.GuildMemberAdd, async (member) => {
  const cfg = guildData(member.guild.id);
  if (!cfg.welcomeChannel) return;
  const channel = member.guild.channels.cache.get(cfg.welcomeChannel);
  if (!channel?.isTextBased()) return;
  channel.send({ content: `👋 Welcome <@${member.id}> to **${member.guild.name}**!` }).catch(() => {});
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  const cfg = guildData(message.guild.id);

  const autoreply = Object.entries(cfg.autoreplies || {}).find(([trigger]) => message.content.toLowerCase().includes(trigger.toLowerCase()));
  if (autoreply) {
    await message.reply(autoreply[1]).catch(() => {});
  }

  if (cfg.automod && !message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
    const spamKey = `${message.guild.id}:${message.author.id}`;
    const timestamps = (spamTracker.get(spamKey) || []).filter(t => Date.now() - t < 6000);
    timestamps.push(Date.now());
    spamTracker.set(spamKey, timestamps);
    if (timestamps.length >= 6) {
      await message.delete().catch(() => {});
      await log(message.guild, `AUTOMOD: removed spam from ${message.author.tag}`);
      return;
    }
  }
  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  if ((cooldowns.get(key) || 0) > now) return;
  cooldowns.set(key, now + 60000);

  cfg.xp[message.author.id] = (cfg.xp[message.author.id] || 0) + Math.floor(Math.random() * 8) + 5;
  cfg.economy[message.author.id] ??= 100;
  saveData();
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === "emox_ticket_create") {
        const existing = interaction.guild.channels.cache.find(
          c => c.name === `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18)}`
        );
        if (existing) return replyError(interaction, "You already have a ticket.");
        const channel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18)}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
          ]
        });
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("emox_ticket_close").setLabel("Close Ticket").setStyle(ButtonStyle.Danger)
        );
        await channel.send({ content: `🎫 <@${interaction.user.id}>`, embeds: [
          new EmbedBuilder().setTitle("🎫 EMOX Support").setDescription("Describe your issue. A staff member will help you soon.")
        ], components: [row] });
        return interaction.reply({ content: `✅ Ticket created: <#${channel.id}>`, ephemeral: true });
      }
      if (interaction.customId === "emox_ticket_close") {
        await interaction.reply({ content: "🔒 Closing ticket..." });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 1500);
        return;
      }
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;
    const member = interaction.member;
    const guild = interaction.guild;

    if (commandName === "gfx") {
      const topic = interaction.options.getString("topic");
      const embed = new EmbedBuilder().setTitle("🎨 EMOX • Graphic Design Knowledge")
        .setDescription(topic
          ? `**${topic}**\n\n${designAdvice(topic)}`
          : "I can help with thumbnails, logos, banners, overlays, branding, typography, color theory, composition, Photoshop, Lightroom, CapCut and Alight Motion.")
        .addFields(
          { name: "🖼️ Thumbnails", value: "Strong focal subject, readable text, contrast, depth and clean hierarchy." },
          { name: "🎯 Branding", value: "Keep logo shapes simple, scalable and recognizable at small sizes." },
          { name: "📐 Composition", value: "Use visual hierarchy, spacing, alignment and a clear focal point." },
          { name: "🌈 Color", value: "Use a controlled palette and sufficient contrast for readability." }
        ).setFooter({ text: "EMOX • Graphic Design Assistant" });
      return interaction.reply({ embeds: [embed] });
    }

    if (commandName === "gaming") {
      const topic = interaction.options.getString("topic");
      const embed = new EmbedBuilder().setTitle("🎮 EMOX • Gaming Knowledge")
        .setDescription(topic
          ? `**${topic}**\n\n${gamingAdvice(topic)}`
          : "I can help with gaming setup, FPS optimization, controls, sensitivity concepts, streaming, recording, thumbnails, esports branding and game content.")
        .addFields(
          { name: "🎯 Performance", value: "Prioritize stable FPS, sensible graphics settings and low input latency." },
          { name: "📱 Mobile Gaming", value: "Balance resolution, frame rate, thermal load, battery and touch controls." },
          { name: "🎥 Content", value: "Pair strong gameplay with clear thumbnails, titles and consistent branding." },
          { name: "🖥️ Streaming", value: "Tune encoder, bitrate, resolution and frame rate for your hardware and connection." }
        ).setFooter({ text: "EMOX • Gaming Assistant" });
      return interaction.reply({ embeds: [embed] });
    }

    if (commandName === "devsettings") {
      if (!developerId || interaction.user.id !== developerId)
        return replyError(interaction, "Developer-only settings.");

      const action = interaction.options.getSubcommand();
      const cfg = guildData(guild.id);

      if (action === "view") {
        const embed = new EmbedBuilder()
          .setTitle("🛠️ EMOX • Developer Moderation Settings")
          .addFields(
            { name: "🛡️ AutoMod", value: cfg.automod ? "🟢 Enabled" : "🔴 Disabled", inline: true },
            { name: "👋 Welcome", value: cfg.welcomeChannel ? `<#${cfg.welcomeChannel}>` : "Not set", inline: true },
            { name: "📝 Mod Logs", value: cfg.logChannel ? `<#${cfg.logChannel}>` : "Not set", inline: true }
          )
          .setFooter({ text: "EMOX • Developer controls" });
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (action === "automod") {
        const enabled = interaction.options.getBoolean("enabled", true);
        cfg.automod = enabled;
        saveData();
        return interaction.reply({ content: `🛡️ Developer setting: AutoMod is now **${enabled ? "ON" : "OFF"}**.`, ephemeral: true });
      }

      if (action === "welcome") {
        const channel = interaction.options.getChannel("channel");
        cfg.welcomeChannel = channel ? channel.id : null;
        saveData();
        return interaction.reply({ content: channel ? `👋 Welcome channel set to <#${channel.id}>.` : "👋 Welcome channel disabled.", ephemeral: true });
      }

      if (action === "logs") {
        const channel = interaction.options.getChannel("channel");
        cfg.logChannel = channel ? channel.id : null;
        saveData();
        return interaction.reply({ content: channel ? `📝 Moderation log channel set to <#${channel.id}>.` : "📝 Moderation logs disabled.", ephemeral: true });
      }

      if (action === "clearwarnings") {
        const user = interaction.options.getUser("user", true);
        delete cfg.warnings[user.id];
        saveData();
        await log(guild, `DEV: cleared warnings for ${user.tag}`);
        return interaction.reply({ content: `✅ Developer cleared all warnings for **${user.tag}**.`, ephemeral: true });
      }

      if (action === "autoreply") {
        const trigger = interaction.options.getString("trigger", true).trim().toLowerCase();
        const reply = interaction.options.getString("reply", true).trim();
        cfg.autoreplies[trigger] = reply;
        saveData();
        return interaction.reply({ content: `🤖 Auto-reply set: **${trigger}** → ${reply}`, ephemeral: true });
      }

      if (action === "removeautoreply") {
        const trigger = interaction.options.getString("trigger", true).trim().toLowerCase();
        if (!cfg.autoreplies[trigger]) return replyError(interaction, "That auto-reply does not exist.");
        delete cfg.autoreplies[trigger];
        saveData();
        return interaction.reply({ content: `🗑️ Removed auto-reply for **${trigger}**.`, ephemeral: true });
      }

      if (action === "autoreplies") {
        const rows = Object.entries(cfg.autoreplies);
        const text = rows.length ? rows.map(([t,r]) => `• **${t}** → ${r}`).join("\n").slice(0, 3900) : "No auto-replies configured.";
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle("🤖 EMOX • Auto Replies").setDescription(text)], ephemeral: true });
      }
    }

    if (commandName === "ping")
      return interaction.reply({ content: `🏓 Pong! ${client.ws.ping}ms` });

    if (commandName === "help") {
      const embed = new EmbedBuilder().setTitle("🤖 EMOX").setDescription("**One Bot. Everything You Need.**")
        .addFields(
          { name: "🛡️ Moderation", value: "/ban /kick /timeout /warn /purge" },
          { name: "🎫 Community", value: "/ticket /welcome /logchannel" },
          { name: "🎉 Fun", value: "/giveaway" },
          { name: "🏆 Progress", value: "/rank /balance /daily" },
          { name: "⚙️ Utility", value: "/serverinfo /userinfo /avatar" }
        ).setFooter({ text: "EMOX • All-in-one Discord Bot" });
      return interaction.reply({ embeds: [embed] });
    }

    if (commandName === "serverinfo") {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle("📊 " + guild.name)
        .addFields(
          { name: "Members", value: String(guild.memberCount), inline: true },
          { name: "Channels", value: String(guild.channels.cache.size), inline: true },
          { name: "Created", value: guild.createdAt.toDateString(), inline: true }
        )] });
    }

    if (commandName === "userinfo") {
      const user = interaction.options.getUser("user") || interaction.user;
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle("👤 " + user.tag)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields({ name: "ID", value: user.id }, { name: "Created", value: user.createdAt.toDateString() })] });
    }

    if (commandName === "avatar") {
      const user = interaction.options.getUser("user") || interaction.user;
      return interaction.reply({ content: user.displayAvatarURL({ size: 1024, extension: "png" }) });
    }

    if (["ban", "kick", "timeout"].includes(commandName)) {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers) && commandName !== "ban")
        return replyError(interaction, "You need moderation permissions.");
      if (commandName === "ban" && !member.permissions.has(PermissionFlagsBits.BanMembers))
        return replyError(interaction, "You need Ban Members permission.");
      const user = interaction.options.getUser("user", true);
      const target = await guild.members.fetch(user.id).catch(() => null);
      const reason = interaction.options.getString("reason") || "No reason provided";
      if (!target) return replyError(interaction, "That user is not in this server.");
      if (!target.manageable) return replyError(interaction, "I cannot manage that member.");
      if (commandName === "ban") await target.ban({ reason });
      if (commandName === "kick") await target.kick(reason);
      if (commandName === "timeout") await target.timeout(interaction.options.getInteger("minutes", true) * 60000, reason);
      await log(guild, `${commandName.toUpperCase()}: ${user.tag} — ${reason}`);
      return interaction.reply({ content: `✅ ${user.tag} has been ${commandName === "timeout" ? "timed out" : commandName + "ed"}.` });
    }

    if (commandName === "warnings") {
      const user = interaction.options.getUser("user", true);
      const cfg = guildData(guild.id);
      const list = cfg.warnings[user.id] || [];
      if (!list.length) return interaction.reply({ content: `✅ **${user.tag}** has no warnings.` });
      const text = list.map((w, i) => `**#${i + 1}** — ${w.reason} <t:${Math.floor(w.at / 1000)}:R>`).join("\n");
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`⚠️ Warnings • ${user.tag}`).setDescription(text.slice(0, 3900))] });
    }

    if (commandName === "clearwarnings") {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return replyError(interaction, "You need moderation permissions.");
      const user = interaction.options.getUser("user", true);
      const cfg = guildData(guild.id);
      delete cfg.warnings[user.id];
      saveData();
      await log(guild, `CLEARED WARNINGS: ${user.tag}`);
      return interaction.reply({ content: `✅ Cleared warnings for **${user.tag}**.` });
    }

    if (commandName === "automod") {
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) return replyError(interaction, "You need Manage Server permission.");
      const enabled = interaction.options.getBoolean("enabled", true);
      guildData(guild.id).automod = enabled;
      saveData();
      return interaction.reply({ content: `🛡️ EMOX AutoMod is now **${enabled ? "ON" : "OFF"}**.` });
    }

    if (commandName === "leaderboard") {
      const cfg = guildData(guild.id);
      const rows = Object.entries(cfg.xp).sort((a,b) => b[1] - a[1]).slice(0, 10);
      const text = rows.length ? rows.map(([id, xp], i) => `${i + 1}. <@${id}> — **${xp} XP**`).join("\n") : "No XP data yet.";
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle("🏆 EMOX XP Leaderboard").setDescription(text)] });
    }

    if (commandName === "work") {
      const cfg = guildData(guild.id);
      const last = cfg.lastWork[interaction.user.id] || 0;
      if (Date.now() - last < 3600000) return replyError(interaction, "You can work again in about an hour.");
      const earned = Math.floor(Math.random() * 151) + 100;
      cfg.economy[interaction.user.id] = (cfg.economy[interaction.user.id] ?? 100) + earned;
      cfg.lastWork[interaction.user.id] = Date.now();
      saveData();
      return interaction.reply({ content: `💼 You worked and earned **${earned} coins**!` });
    }

    if (commandName === "pay") {
      const target = interaction.options.getUser("user", true);
      const amount = interaction.options.getInteger("amount", true);
      if (target.bot || target.id === interaction.user.id) return replyError(interaction, "Choose another human user.");
      const cfg = guildData(guild.id);
      const from = cfg.economy[interaction.user.id] ?? 100;
      if (from < amount) return replyError(interaction, "You don't have enough coins.");
      cfg.economy[interaction.user.id] = from - amount;
      cfg.economy[target.id] = (cfg.economy[target.id] ?? 100) + amount;
      saveData();
      return interaction.reply({ content: `💸 Sent **${amount} coins** to **${target.tag}**.` });
    }

    if (commandName === "8ball") {
      const answers = ["Yes.", "Definitely.", "Probably.", "Ask again later.", "Maybe.", "Unlikely.", "No."];
      const question = interaction.options.getString("question", true);
      return interaction.reply({ content: `🎱 **${question}**\n> ${answers[Math.floor(Math.random() * answers.length)]}` });
    }

    if (commandName === "warn") {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return replyError(interaction, "You need moderation permissions.");
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason") || "No reason provided";
      const cfg = guildData(guild.id);
      cfg.warnings[user.id] ??= [];
      cfg.warnings[user.id].push({ reason, by: interaction.user.id, at: Date.now() });
      saveData();
      await log(guild, `WARN: ${user.tag} — ${reason}`);
      return interaction.reply({ content: `⚠️ Warned **${user.tag}**. Total warnings: ${cfg.warnings[user.id].length}` });
    }

    if (commandName === "purge") {
      if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return replyError(interaction, "You need Manage Messages permission.");
      const amount = interaction.options.getInteger("amount", true);
      await interaction.channel.bulkDelete(amount, true);
      return interaction.reply({ content: `🧹 Deleted up to ${amount} messages.`, ephemeral: true });
    }

    if (commandName === "ticket") {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return replyError(interaction, "You need Manage Channels permission.");
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("emox_ticket_create").setLabel("Create Ticket").setEmoji("🎫").setStyle(ButtonStyle.Primary)
      );
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle("🎫 EMOX Tickets").setDescription("Press the button below to open a private support ticket.")], components: [row] });
    }

    if (commandName === "welcome" || commandName === "logchannel") {
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) return replyError(interaction, "You need Manage Server permission.");
      const channel = interaction.options.getChannel("channel", true);
      const cfg = guildData(guild.id);
      if (commandName === "welcome") cfg.welcomeChannel = channel.id;
      else cfg.logChannel = channel.id;
      saveData();
      return interaction.reply({ content: `✅ ${commandName === "welcome" ? "Welcome" : "Log"} channel set to <#${channel.id}>.` });
    }

    if (commandName === "rank") {
      const cfg = guildData(guild.id);
      const xp = cfg.xp[interaction.user.id] || 0;
      return interaction.reply({ content: `🏆 **${interaction.user.username}** has **${xp} XP**.` });
    }

    if (commandName === "balance") {
      const cfg = guildData(guild.id);
      const balance = cfg.economy[interaction.user.id] ?? 100;
      cfg.economy[interaction.user.id] = balance;
      saveData();
      return interaction.reply({ content: `💰 Your balance is **${balance} coins**.` });
    }

    if (commandName === "daily") {
      const cfg = guildData(guild.id);
      cfg.economy[interaction.user.id] ??= 100;
      cfg.economy[interaction.user.id] += 250;
      saveData();
      return interaction.reply({ content: "🎁 You received **250 coins** from your daily reward!" });
    }

    if (commandName === "giveaway") {
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) return replyError(interaction, "You need Manage Server permission.");
      const minutes = interaction.options.getInteger("minutes", true);
      const prize = interaction.options.getString("prize", true);
      const endsAt = Date.now() + minutes * 60000;
      const msg = await interaction.reply({ content: `🎉 **GIVEAWAY** — ${prize}\nReact with 🎉 to enter!\nEnds <t:${Math.floor(endsAt / 1000)}:R>`, fetchReply: true });
      await msg.react("🎉");
      giveaways.set(msg.id, { channelId: msg.channel.id, prize, endsAt });
      setTimeout(async () => {
        const g = giveaways.get(msg.id);
        if (!g) return;
        const channel = client.channels.cache.get(g.channelId);
        const giveawayMsg = await channel?.messages.fetch(msg.id).catch(() => null);
        const reaction = giveawayMsg?.reactions.cache.get("🎉");
        const users = reaction ? (await reaction.users.fetch()).filter(u => !u.bot).map(u => u) : [];
        const winner = users.length ? users[Math.floor(Math.random() * users.length)] : null;
        if (winner) channel.send(`🎊 Giveaway ended! **${winner.tag}** won **${g.prize}**!`);
        else channel?.send(`🎊 Giveaway ended for **${g.prize}**, but nobody entered.`);
        giveaways.delete(msg.id);
      }, minutes * 60000);
      return;
    }
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) interaction.followUp({ content: "❌ Something went wrong.", ephemeral: true }).catch(() => {});
    else interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }).catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);
