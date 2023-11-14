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
		try {
			await commands[commandName as keyof typeof commands].execute(interaction);
		} catch (err) {
			console.log("Caught error executing command");
			console.log(err);
		}
		console.log("Command finished:", commandName)

	}
});
console.log("Logging in");
client.login(config.DISCORD_TOKEN).then();
