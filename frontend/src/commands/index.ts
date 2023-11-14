import * as ping from "./ping";
import * as echo from "./echo";
import * as courseAvg from "./courseAvg";
import * as addDataset from "./addDataset"

export const commands = {
	ping,
	"insightfacade-echo": echo,
	"insightbot-course-avg": courseAvg,
	"insightbot-add-dataset": addDataset
};
