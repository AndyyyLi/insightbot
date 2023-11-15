import * as ping from "./ping";
import * as echo from "./echo";
import * as courseAvg from "./courseAvg";
import * as addDataset from "./addDataset";
import * as clearDatasets from "./clearDatasets";

export const commands = {
	ping,
	"insightbot-echo": echo,
	"insightbot-course-avg": courseAvg,
	"insightbot-add-dataset": addDataset,
	"insightbot-clear-datasets": clearDatasets
};
