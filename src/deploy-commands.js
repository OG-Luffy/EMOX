require("dotenv").config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");

const userOption = (builder) => builder.addUserOption(o => o.setName("user").setDescription("Target user").setRequired(true));
const reasonOption = (builder) => builder.addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false));

const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Check EMOX latency"),
  new SlashCommandBuilder().setName("help").setDescription("Show EMOX features"),
  new SlashCommandBuilder().setName("serverinfo").setDescription("Show server information"),
  new SlashCommandBuilder().setName("userinfo").setDescription("Show user information").addUserOption(o=>o.setName("user").setDescription("User").setRequired(false)),
  new SlashCommandBuilder().setName("avatar").setDescription("Show a user's avatar").addUserOption(o=>o.setName("user").setDescription("User").setRequired(false)),
  reasonOption(userOption(new SlashCommandBuilder().setName("ban").setDescription("Ban a member"))),
  reasonOption(userOption(new SlashCommandBuilder().setName("kick").setDescription("Kick a member"))),
  reasonOption(userOption(new SlashCommandBuilder().setName("timeout").setDescription("Timeout a member"))
    .addIntegerOption(o=>o.setName("minutes").setDescription("Timeout duration in minutes").setMinValue(1).setMaxValue(40320).setRequired(true))),
  reasonOption(userOption(new SlashCommandBuilder().setName("warn").setDescription("Warn a member"))),
  new SlashCommandBuilder().setName("purge").setDescription("Delete messages").addIntegerOption(o=>o.setName("amount").setDescription("1-100 messages").setMinValue(1).setMaxValue(100).setRequired(true)),
  new SlashCommandBuilder().setName("ticket").setDescription("Post the ticket panel"),
  new SlashCommandBuilder().setName("welcome").setDescription("Set the welcome channel").addChannelOption(o=>o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText).setRequired(true)),
  new SlashCommandBuilder().setName("logchannel").setDescription("Set the moderation log channel").addChannelOption(o=>o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText).setRequired(true)),
  new SlashCommandBuilder().setName("rank").setDescription("Show your XP"),
  new SlashCommandBuilder().setName("balance").setDescription("Show your coin balance"),
  new SlashCommandBuilder().setName("daily").setDescription("Claim 250 daily coins"),
  new SlashCommandBuilder().setName("giveaway").setDescription("Start a giveaway").addIntegerOption(o=>o.setName("minutes").setDescription("Duration in minutes").setMinValue(1).setMaxValue(10080).setRequired(true)).addStringOption(o=>o.setName("prize").setDescription("Prize").setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Deploying EMOX slash commands...");
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log("EMOX commands deployed:", commands.length);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
