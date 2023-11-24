import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
	.setName("ping")
	.setDescription("Replies with Pong!");

export async function execute(interaction: CommandInteraction) {
	console.log("Command executed:", interaction.commandName);
	return interaction.reply("Pong!");
}
