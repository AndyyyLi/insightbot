import {CommandInteraction, InteractionReplyOptions, SlashCommandBuilder, EmbedBuilder} from "discord.js";

export const data = new SlashCommandBuilder()
	.setName("insightbot-course-avg")
	.setDescription("Replies with list of professors that teach the provided course in order of highest averages")
	.addStringOption(option =>
		option.setName("course")
			.setDescription("Course code")
			.setRequired(true)
	);

export async function execute(interaction: CommandInteraction) {
	const courseOption = interaction.options.get("course");
	const courseMessage = (courseOption && courseOption["value"]) ? courseOption["value"] : null;

	const [courseDept, courseID] = (typeof courseMessage === "string") ?
		courseMessage.split(' ') : [null, null];

	const query = {
		"WHERE": {
			"AND": [
				{
					"IS": {
						"sections_dept": courseDept
					}
				},
				{
					"IS": {
						"sections_id": courseID
					}
				},
				{
					"NOT": {
						"IS": {
							"sections_instructor": ""
						}
					}
				}
			]
		},
		"OPTIONS": {
			"COLUMNS": [
				"sections_instructor",
				"sections_avg",
				"sections_year"
			],
			"ORDER": "sections_avg"
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

		if ('result' in responseData) {
			const embed = new EmbedBuilder()
				.setTitle(`Course Averages for ${courseDept} ${courseID}`)
				.setColor('#0099ff')
				.setDescription(JSON.stringify(responseData.result, null, 2));
			return interaction.reply({ embeds: [embed] });
		} else {
			return interaction.reply({ content: "Invalid input, please try again" } as InteractionReplyOptions);
		}
	} catch {
		return interaction.reply("Invalid command call :(")
	}
}
