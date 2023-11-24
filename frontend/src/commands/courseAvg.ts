import {CommandInteraction, InteractionReplyOptions, SlashCommandBuilder, EmbedBuilder} from "discord.js";

export const data = new SlashCommandBuilder()
	.setName("insightbot-course-avg")
	.setDescription("Replies with list of professors that taught the provided course within a specified dataset")
	.addStringOption(option =>
		option.setName("dataset")
			.setDescription("Dataset ID")
			.setRequired(true)
	)
	.addStringOption(option =>
		option.setName("course")
			.setDescription("Course code")
			.setRequired(true)
	);

export async function execute(interaction: CommandInteraction) {
	const datasetOption = interaction.options.get("dataset");
	const datasetID = (datasetOption && datasetOption["value"]) ? datasetOption["value"] : null;

	const courseOption = interaction.options.get("course");
	const courseMessage = (courseOption && courseOption["value"]) ? courseOption["value"] : null;
	const [courseDept, courseID] = (typeof courseMessage === "string") ?
		[courseMessage.split(' ')[0].toLowerCase(), courseMessage.split(' ')[1]] :
		[null, null];

	const query = {
		"WHERE": {
			"AND": [
				{
					"IS": {
						[`${datasetID}_dept`]: courseDept
					}
				},
				{
					"IS": {
						[`${datasetID}_id`]: courseID
					}
				},
				{
					"NOT": {
						"IS": {
							[`${datasetID}_instructor`]: ""
						}
					}
				}
			]
		},
		"OPTIONS": {
			"COLUMNS": [
				`${datasetID}_instructor`,
				"instructorAvg"
			],
			"ORDER": "instructorAvg"
		},
		"TRANSFORMATIONS": {
			"GROUP": [
				`${datasetID}_instructor`
			],
			"APPLY": [
				{
					"instructorAvg": {
						"AVG": `${datasetID}_avg`
					}
				}
			]
		}
	};

	try {
		const response = await fetch("http://localhost:4321/query", {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(query),
		});
		const responseData = await response.json();

		if ('result' in responseData && responseData.result.length > 0) {
			const embed = new EmbedBuilder()
				.setTitle(`Course averages for ${courseDept} ${courseID} instructors in the ${datasetID} dataset \n`)
				.setColor('#0099ff')

			const formattedData = responseData.result.map((entry: any) => {
				const instructor = entry[`${datasetID}_instructor`];
				const avg = entry.instructorAvg;
				return `${instructor}: ${avg}`;
			});
			embed.setDescription(formattedData.join('\n'));

			return interaction.reply({ embeds: [embed] });
		} else {
			return interaction.reply({ content: "Invalid input, please try again" } as InteractionReplyOptions);
		}
	} catch {
		return interaction.reply("Invalid command call :(")
	}
}
