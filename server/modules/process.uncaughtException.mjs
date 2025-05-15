import fs from 'fs'

// Modules
import { server } from "../server.mjs";
import { formattedDate } from "./utils.mjs";

/** process.on uncaughtException event handler */
export default function processUncaughtException(error) {
    // Log
    console.error(error);

    // Write to file
    const filename = "./latest-log.json";
    const logComplete =
`{
"statement": "An uncaughtException event occured at ${formattedDate()} [${Date.now()}]
The error is below, followed by server.logHistory, then a list of game objects",
"stack": "${error.stack}",
"serverLog": [
    ${server.logHistory.map(entry => {
        return `    "
    ${formattedDate(new Date(entry.timestamp))} [${entry.timestamp}]
    ${entry.cleanMessage}
    "`;
    }).join(",\n")}
],

"games": ${JSON.stringify(Object.fromEntries(
    Object.entries(server.games).map(([key, game]) => {
        const clone = game.publicClone(false);
        clone.log = game.getLog;
        return [key, clone];
    })
), null, 4)}

}`;

    // Write
    fs.writeFile(filename, logComplete, err => {
        if(err) {
            console.error(`ERROR WRITING TO ${filename}. Details below:`);
            console.error(err);
        }
        else server.log(`Saved uncaughtException to ${filename}`);
    });
    
    // Webhook
    if(process.env.WEBHOOK_LOG_MODE === "uncaughtExceptions") {
        server.webhook(`[Server] uncaughtException\n\`\`\`${JSON.stringify(error, Object.getOwnPropertyNames(error))}\`\`\``);
    }
}
