import { CommandInteraction, InteractionReplyOptions, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
	.setName("insightfacade-echo")
	.setDescription("Replies with provided message")
	.addStringOption(option =>
		option.setName("message")
			.setDescription("The message to echo")
	);

export async function execute(interaction: CommandInteraction) {
	const messageOption = interaction.options.get("message");
	const message = (messageOption && messageOption["value"]) ? messageOption["value"] : null;

	try {
		const response = await fetch("http://localhost:4321/echo/" + message);
		const responseData = await response.json();

		if ('result' in responseData) {
			return interaction.reply({ content: responseData.result } as InteractionReplyOptions);
		} else {
			return interaction.reply({ content: responseData.err } as InteractionReplyOptions);
		}
	} catch {
		return interaction.reply("Invalid command call :(")
	}
}
