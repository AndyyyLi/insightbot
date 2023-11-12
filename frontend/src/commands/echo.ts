import { CommandInteraction, InteractionReplyOptions, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
	.setName("insightfacade-echo")
	.setDescription("Replies with provided message")
	.addStringOption(option =>
		option.setName("message")
			.setDescription("The message to echo")
			.setRequired(true)
	);

export async function execute(interaction: CommandInteraction) {
	const messageOption = interaction.options.get("message");
	const message = (messageOption && messageOption["value"]) ? messageOption["value"] : "No ekko :("

	console.log("Command executed:", interaction.commandName);

	// Reply with an InteractionReplyOptions object
	return interaction.reply({ content: message } as InteractionReplyOptions);
}
