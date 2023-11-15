import {CommandInteraction, InteractionReplyOptions, SlashCommandBuilder, EmbedBuilder} from "discord.js";

export const data = new SlashCommandBuilder()
	.setName("insightbot-clear-datasets")
	.setDescription("Removes all stored datasets and returns a list of datasets removed");

export async function execute(interaction: CommandInteraction) {
	try {
		// grab all datasets
		const response = await fetch("http://localhost:4321/datasets", {
			method: 'GET'
		});
		const responseData = await response.json();

		if (!('result' in responseData)) {
			return interaction.reply({ content: "Invalid input, please try again" } as InteractionReplyOptions);
		}

		const datasets = responseData.result;
		if (datasets.length === 0) {
			return interaction.reply({ content: "No datasets to delete!" } as InteractionReplyOptions);
		}

		let deletedDatasets = "";
		// delete all datasets
		await interaction.deferReply();
		for (const dataset of datasets) {
			const deleteResponse = await fetch("http://localhost:4321/dataset/" + dataset.id, {
				method: 'DELETE'
			});
			const deleteResponseData = await deleteResponse.json();
			if ('result' in deleteResponseData) {
				deletedDatasets += deleteResponseData.result + "\n";
			} else {
				return interaction.followUp({ content: "Couldn't delete, please try again" } as InteractionReplyOptions);
			}
		}

		const embed = new EmbedBuilder()
			.setTitle(`Removed the following datasets:`)
			.setColor('#fa0707')
			.setDescription(deletedDatasets);
		return interaction.followUp({ embeds: [embed] });
	} catch {
		return interaction.followUp("Invalid command call :(")
	}
}
