/* NOT UNO */

// Dependencies
import express from 'express'
import fs from 'fs'
import http from 'http'
import https from 'https'
import { Server } from 'socket.io'
import cors from 'cors'

// Modules
import socketConnection from './modules/socket.connection.mjs'
import { arrRandom, capitalizeFirstLetter, formattedDate } from './modules/utils.mjs'

// Game data
import data from './data.json' with { type: 'json' }

// Config
import word_blacklist from '../word_blacklist.json' with { type: 'json' }


// Environment
const isProduction = process.env.NODE_ENV === 'production';
const clientUrl = process.env.CLIENT_URL;
const SSL_MODE = process.env.SSL_MODE === "true" ? true : false

// SSL
let privateKey, certificate;
if(SSL_MODE) {
    try {
        privateKey = fs.readFileSync(process.env.PRIVATE_KEY_LOCATION, 'utf8');
        certificate = fs.readFileSync(process.env.CERTIFICATE_LOCATION, 'utf8');
    } catch (error) {
        console.warn("SSL keys not found. Make sure you have both PRIVATE_KEY_LOCATION and CERTIFICATE_LOCATION defined in .env and that they lead to valid files. Or to start in http mode instead, set SSL_MODE to \"false\" in .env. Error below:");
        throw new Error(error)
    }
}


// Express setup
const app = express();
app.use(cors()); // Use cors package as middleware

/** Express server */
const webServer = SSL_MODE
    // https
    ? https.createServer({
        key: privateKey,
        cert: certificate,
    }, app)
    // http
    : http.createServer(app);


/** Socket.io server */
const io = new Server(webServer, {
    cors: {
        // Frontend origin
        origin: clientUrl,
        methods: ["GET", "POST"]
    }
});

// Socket.io pre-connect middleware
io.use((socket, next) => {
    // Profile
    const name = socket.handshake?.query?.name;
    const avatar = socket.handshake?.query?.avatar;
    socket.name = name ?? getRandomName();
    socket.avatar = avatar ?? arrRandom(data.avatars);

    // Elevate
    if(socket.handshake?.query?.key === process.env.DEBUG_ACCESS_KEY) {
        socket.elevated = true;
        socket.emit("elevated");
    }

    next();

    // copied from app.js. Might convert to an api endpoint
    function getRandomName() {
        const adjective = capitalizeFirstLetter(arrRandom(data.names.adjectives));
        const noun = arrRandom(data.names.nouns);
        return `${adjective} ${noun}`;
    }
});


/** Server object (unrelated to express/socket.io, scroll up for those) */
const server = {
    usersRooms: {},
    games: {},
    // users: {},

    /** Server statistics since process was started. Resets when server is closed */
    stats: {
        startup_time: Date.now(),
        total_connections: 0,
        total_games: 0,

        /** Server uptime in milliseconds */
        get uptime_ms() {
            return Date.now() - this.startup_time;
        },

        /** Returns uptime in the form of a human-readable string
         * @returns {String}
         */
        getUptime() {
            const minutes = server.stats.uptime_ms / 60000;
            const hours = minutes / 60;
            const days = hours / 24;
    
            if(days >= 2) return `${days.toFixed(1)} days`; // Days (more than 48 hours)
            if(minutes >= 60) return `${hours.toFixed(1)} hours`; // Hours
            return `${minutes.toFixed(1)} minutes`; // Minutes
        }
    },


    logHistory: [],

    /** Console logging shorthand w/ fancy formatting and timestamps
     * @param {String} message Message to log to console
     */
    log(message, includeTimestamp=true) {
        // Timestamp
        const timestamp = !includeTimestamp ? "" : `\u001b[1;36m[${formattedDate()}]\u001b[0m `;

        const full = `${timestamp}${message}`;

        // Console
        console.log(full);

        // History
        if(process.env.KEEP_LOGS !== undefined) this.logHistory.push({
            timestamp: Date.now(),
            message,
            cleanMessage: message.replace(/\033\[[0-9;]*m/g, "") // Message with console formatting codes removed
        })

        // Discord
        if(process.env.WEBHOOK_LOG_MODE === "all" && process.env.DISCORD_WEBHOOK_URL) this.webhook(message);
    },

    // Cleanup config
    maxGameAge: 172800000, // 48 hours
    cleanupPeriod: 43200000, // 12 hours

    /** Loops all game object and removes closed games older than maxGameAge */
    performCleanup() {
        for(const [roomID, game] of Object.entries(server.games)) {
            if(!game.roomClosed) continue;
            if(
                (game.roomClosedTimestamp + server.maxGameAge) < Date.now() // Over max age
            ) game.destroy();
        }
    },

    /** Sends a message */
    webhook(msg) {
        // URL
        const webhookURL = process.env.DISCORD_WEBHOOK_URL;
        if(!webhookURL) return; // Not specified

        // JSON data
        const data = JSON.stringify({
            content: msg.replace(/\033\[[0-9;]*m/g, "") // Remove console formatting codes
        });

        const url = new URL(webhookURL);

        // https request
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }
        const req = https.request(options, (res) => {
            res.on("data", d => process.stdout.write(d));
        });

        // Error
        req.on('error', err => console.error(err));

        // Send
        req.write(data);
        req.end();
    }
}


// Startup message
server.log(
    `
    \x1b[47m\x1b[30m  Starting Not UNO server...  \x1b[0m
    > Environment: \x1b[33m${process.env.NODE_ENV}\x1b[0m
    > Client origin: \x1b[33m${clientUrl}\x1b[0m
    ${word_blacklist === undefined ?
        "> No ./word_blacklist.json provided\n" :
        `> \x1b[33m${word_blacklist?.deny?.length}\x1b[0m blacklisted strings (word_blacklist.json)`
    }`, false);


// Crash handler
import processUncaughtException from './modules/process.uncaughtException.mjs'
process.on("uncaughtException", processUncaughtException);


// Game cleanup
const cleanupTimer = setInterval(server.performCleanup, server.cleanupPeriod);

// Storing custom decks in memory is temporary- make this a database instead
const customDecks = {};


// Export
export { io, data, word_blacklist, server, isProduction };


// Listeners
io.on("connection", socketConnection);


// API site confirmation
app.get('/', (req, res) => {
    const clientsCount = io.sockets.server.engine.clientsCount;
    const responseJSON = {
        // Status
        online_users:   clientsCount,
        games:          Object.keys(server.games).length,
        games_active:   Object.entries(server.games).filter(i => !i[1].roomClosed).length,
        games_closed:   Object.entries(server.games).filter(i => i[1].roomClosed).length,

        // Statistics
        uptime: server.stats.getUptime(),
        serverStats: server.stats,
    };

    // Debug
    if(!isProduction) {
        responseJSON.debug = {
            // allusers: clients,
            allgames: server.games,
            usersRooms: server.usersRooms
        }
    }

    // Respond w/ JSON
    res.send(responseJSON);
})

// avatars.json
app.get('/data.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
})


// Listen
// const port = 3001;
const port = 443;
webServer.listen(port, () => {
    console.log(`Listening on port \x1b[36m${port}\x1b[0m\n`);
})
