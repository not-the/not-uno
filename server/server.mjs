/* NOT UNO */

// Dependencies
import express from 'express'
import fs from 'fs'
import http from 'http'
import https from 'https'
import { Server } from 'socket.io'
import cors from 'cors'
import axios from 'axios'

// Game data
import data from './data.json' assert { type: 'json' }

// Config
import word_blacklist from './word_blacklist.json' assert { type: 'json' }

// Environment
const isProduction = process.env.NODE_ENV === 'production';
const clientOrigin = isProduction ?
    "https://uno.notkal.com" :  // Production website
    'http://localhost:3000';    // Development


// SSL
let privateKey, certificate;
if(isProduction) {
    const PRIVATE_KEY_LOCATION="/etc/letsencrypt/live/uno-server1.notkal.com/privkey.pem"
    const CERTIFICATE_LOCATION="/etc/letsencrypt/live/uno-server1.notkal.com/fullchain.pem"

    try {
        privateKey = fs.readFileSync(PRIVATE_KEY_LOCATION, 'utf8');
        certificate = fs.readFileSync(CERTIFICATE_LOCATION, 'utf8');
    } catch (error) {
        console.warn("SSL keys not found. Error below:");
        console.warn(error);
    }
}


// Express setup
const app = express();
app.use(cors({
    credentials: true
})); // Use cors package as middleware

/** Express server */
const webServer = isProduction ?
    https.createServer({
        key: privateKey, cert: certificate
    }, app) : // Production, SSL
    http.createServer(app); // Development


/** Socket.io server */
const io = new Server(webServer, {
    cors: {
        // Frontend origin
        origin: clientOrigin,
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
        this.logHistory.push({
            timestamp: Date.now(),
            message,
        })

        // Discord
        if(process.env.WEBHOOK_LOG_MODE === "all" && process.env.DISCORD_WEBHOOK_URL) this.webhook(message);

        /** Create a formatted date from Date object. Defaults to current time.
         * @param {Date} date (Optional) new Date object. Uses the current date is undefined.
         * @returns {String} Provided date in a readable format
         */
        function formattedDate(date=new Date()) {
            let hours = date.getHours();
            let minutes = date.getMinutes();
            let seconds = date.getSeconds();
    
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            minutes = minutes < 10 ? '0' + minutes : minutes;
            seconds = seconds < 10 ? '0' + seconds : seconds;
    
            const monthYear = date.toISOString().split('T')[0];
    
            // Combine time and date
            return `${hours}:${minutes}:${seconds} ${ampm}, ${monthYear}`;
        }
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
    > Client origin: \x1b[33m${clientOrigin}\x1b[0m
    ${word_blacklist === undefined ?
        "> No ./word_blacklist.json provided\n" :
        `> \x1b[33m${word_blacklist?.deny?.length}\x1b[0m blacklisted strings (word_blacklist.json)`
    }`, false);


// Crash handler
process.on("uncaughtException", error => {
    // Log
    console.error(error);

    // Write crash log to file here
    // ...
    
    // Webhook
    if(process.env.WEBHOOK_LOG_MODE === "uncaughtExceptions") {
        server.webhook(`[Server] uncaughtException\n\`\`\`${JSON.stringify(error, Object.getOwnPropertyNames(error))}\`\`\``);
    }
});


// Game cleanup
const cleanupTimer = setInterval(server.performCleanup, server.cleanupPeriod);

// Storing custom decks in memory is temporary- make this a database instead
const customDecks = {};


/** Modules */
import socketConnection from './modules/socket.connection.mjs'
import { arrRandom, capitalizeFirstLetter } from './modules/utils.mjs'
// import { hostname } from 'os'
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

// Discord OAuth2
app.get("/auth/discord", async (req, res) => {
    const url = process.env.DISCORD_AUTH_URL;

    res.redirect(url);
});
app.get("/auth/discord/callback", async (req, res) => {
    if(!req?.query?.code) return console.warn("Discord auth callback: Code is undefined");

    const { code } = req.query;

    // Request
    const params = new URLSearchParams({
        client_id: process.env.DISCORD_APP_CLIENT_ID,
        client_secret: process.env.DISCORD_APP_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI
    });

    // Headers
    const headers = {
        'Content-Type':     'application/x-www-form-urlencoded',
        'Accept-Encoding':  'application/x-www-form-urlencoded'
    };

    try {
        // Discord API
        const response = await axios.post('https://discord.com/api/oauth2/token',
            params,
            { headers }
        );

        // Get user info
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${response.data.access_token}`,
                ...headers
            }
        })

        console.log(userResponse);
        console.log(userResponse.data.global_name);
        console.log(`https://cdn.discordapp.com/avatars/${userResponse.data.id}/${userResponse.data.avatar}`);

        // Redirect
        if(userResponse.data.id === process.env.DEBUG_DISCORD_USER_ID) {
            res.redirect(`http://localhost:3000/?key=${process.env.DEBUG_ACCESS_KEY}`);
            server.log("Authenticated debug user");
        }
        else res.redirect(`http://localhost:3000/`);
    } catch (error) {
        console.warn(error);   
    }
});

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
