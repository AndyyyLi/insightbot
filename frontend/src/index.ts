import { Client } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";

const client = new Client({
	intents: ["Guilds", "GuildMessages", "DirectMessages"],
});

client.once("ready", () => {
	console.log("Discord bot is ready! 🤖");
});

client.on("guildCreate", async (guild) => {
	await deployCommands({ guildId: guild.id });
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) {
		return;
	}
	const { commandName } = interaction;
	console.log("Command received:", commandName);

	if (commands[commandName as keyof typeof commands]) {
		await commands[commandName as keyof typeof commands].execute(interaction);
		console.log("Command finished:", commandName)

	}
});

client.login(config.DISCORD_TOKEN).then();
