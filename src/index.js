require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

client.once(Events.ClientReady, (readyClient) => {
  console.log("━━━━━━━━━━━━━━━━━━━━");
  console.log(" EMOX is online!");
  console.log(" Logged in as:", readyClient.user.tag);
  console.log(" Servers:", readyClient.guilds.cache.size);
  console.log("━━━━━━━━━━━━━━━━━━━━");
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    return interaction.reply({
      content: "🏓 Pong! EMOX latency: " + client.ws.ping + "ms"
    });
  }

  if (interaction.commandName === "help") {
    const embed = new EmbedBuilder()
      .setTitle("🤖 EMOX")
      .setDescription("One Bot. Everything You Need.")
      .addFields(
        { name: "🛡️ Moderation", value: "Ban, kick, timeout, warn, purge" },
        { name: "🎫 Community", value: "Tickets, welcome, roles, logs" },
        { name: "🎉 Fun", value: "Giveaways, games, levels" },
        { name: "⚙️ Utility", value: "Server info, user info, ping" }
      )
      .setFooter({ text: "EMOX • All-in-one Discord Bot" });

    return interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
