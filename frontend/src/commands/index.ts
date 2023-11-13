import * as ping from "./ping";
import * as echo from "./echo";
import * as courseAvg from "./courseAvg";

export const commands = {
	ping,
	"insightfacade-echo": echo,
	"insightbot-course-avg": courseAvg
};
