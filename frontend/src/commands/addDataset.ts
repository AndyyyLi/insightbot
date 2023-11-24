import {CommandInteraction, InteractionReplyOptions, SlashCommandBuilder, EmbedBuilder} from "discord.js";

export const data = new SlashCommandBuilder()
	.setName("insightbot-add-dataset")
	.setDescription("Inserts dataset zip file into database and replies with list of currently added datasets")
	.addStringOption(option => option
		.setRequired(true)
		.setName("dataset")
		.setDescription("Dataset ID")
	)
	.addAttachmentOption(option => option
		.setRequired(true)
		.setName("dataset-zip")
		.setDescription("Dataset zip file to insert")
	);

export async function execute(interaction: CommandInteraction) {
	await interaction.deferReply();
	const datasetOption = interaction.options.get("dataset");
	const id = (datasetOption && datasetOption["value"]) ? datasetOption["value"] : null;

	const datasetZipOption = interaction.options.get("dataset-zip");
	if (!(datasetZipOption && datasetZipOption.attachment)) {
		return interaction.reply("No dataset attached!");
	}
	const datasetURL = datasetZipOption.attachment.url;
	const datasetZip = datasetURL.substring(0, datasetURL.indexOf(".zip") + 4);

	try {
		const zipResponse = await fetch(datasetZip);
		const zipArrBuff = await zipResponse.arrayBuffer();

		const response = await fetch("http://localhost:4321/dataset/" + id + "/sections", {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/x-zip-compressed',
			},
			body: Buffer.from(zipArrBuff),
		});
		const responseData = await response.json();

		if ('result' in responseData) {
			let addedDatasets = "";
			for (let id of responseData.result) {
				addedDatasets += id + "\n";
			}
			const embed = new EmbedBuilder()
				.setTitle(`Add successful! Currently added datasets:`)
				.setColor('#05fa57')
				.setDescription(addedDatasets);
			return interaction.followUp({ embeds: [embed] });
		} else {
			return interaction.followUp({ content: "Invalid input, please try again " +
					"(Note: the zip file should contain a courses folder which contains the sections files)" } as
				InteractionReplyOptions);
		}
	} catch {
		return interaction.reply("Invalid command call :(")
	}
}
