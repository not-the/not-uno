/* NOT UNO */

// Dependencies
import express from 'express'
import fs from 'fs'
import http from 'http'
import https from 'https'
import 'dotenv/config'
import { Server } from 'socket.io'
import cors from 'cors'

// Game data
import data from './data.json' assert { type: 'json' }

// Config
import word_blacklist from './word_blacklist.json' assert { type: 'json' }

// Express setup
const app = express();
app.use(cors());

// Environment
const isProduction = process.env.NODE_ENV === 'production';
const clientOrigin = isProduction ?
    "https://uno.notkal.com" :  // Production website
    'http://localhost:3000';    // Development


// SSL
let privateKey, certificate;
if(isProduction) {
    try {
        privateKey = fs.readFileSync(process.env.PRIVATE_KEY_LOCATION, 'utf8');
        certificate = fs.readFileSync(process.env.CERTIFICATE_KEY_LOCATION, 'utf8');
    } catch (error) {
        console.warn("SSL keys not found. Error below:");
        console.warn(error);
    }
}


/** Express server */
const expressServer = isProduction ?
    https.createServer({
        key: privateKey, cert: certificate
    }, app) : // Production, SSL
    http.createServer(app); // Development

/** Socket.io server */
const io = new Server(expressServer, {
    cors: {
        // Frontend origin
        origin: clientOrigin,
        methods: ["GET", "POST"]
    }
});

// Startup message
console.log(
    `
    \x1b[47m\x1b[30m  Starting Not UNO server...  \x1b[0m
    > Environment: \x1b[33m${process.env.NODE_ENV}\x1b[0m
    > Client origin: \x1b[33m${clientOrigin}\x1b[0m
    ${word_blacklist === undefined ? "> No ./word_blacklist.json provided\n" : ""}`);



/** Server object (unrelated to express/socket.io, scroll up for those) */
const server = {
    usersRooms: {},
    games: {},
    users: {},

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

    /** Console logging shorthand w/ fancy formatting and timestamps
     * @param {*} message Message to log to console
     */
    log(message) {
        console.log(
            `\u001b[1;36m[${formattedDate()}]\u001b[0m ${message}`
        )
    
        function formattedDate() {
            const currentDate = new Date();
            let hours = currentDate.getHours();
            let minutes = currentDate.getMinutes();
            let seconds = currentDate.getSeconds();
    
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            minutes = minutes < 10 ? '0' + minutes : minutes;
            seconds = seconds < 10 ? '0' + seconds : seconds;
    
            const date = currentDate.toISOString().split('T')[0];
    
            // Combine time and date
            return `${hours}:${minutes}:${seconds} ${ampm}, ${date}`;
        }
    },

    // Cleanup config
    maxGameAge: 172800000, // 48 hours
    cleanupPeriod: 43200000, // 12 hours

    /** Loops all game object and removes closed games older than maxGameAge */
    performCleanup() {
        for(const [roomID, game] of Object.entries(server.games)) {
            if(!game.roomClosed) continue;
            if(game.roomClosedTimestamp + this.maxGameAge < Date.now()) game.destroy();
        }
    }
}

// Game cleanup
const cleanupTimer = setInterval(server.performCleanup, server.cleanupPeriod);

// Storing custom decks in memory is temporary- make this a database instead
const customDecks = {};


/** Modules */
import socketConnection from './modules/socket.connection.mjs'
export { io, data, word_blacklist, server, isProduction };



// Listeners
io.on("connection", socketConnection);


// API site confirmation
app.get('/', (req, res) => {
    const responseJSON = {
        // Status
        online_users:   Object.keys(server.users).length,
        games:          Object.keys(server.games).length,
        games_active:   Object.entries(server.games).filter(i => !i[1].roomClosed).length,
        games_closed:   Object.entries(server.games).filter(i => i[1].roomClosed).length,

        // Statistics
        uptime: server.stats.getUptime(),
        serverStats: server.stats,
    };

    if(!isProduction) {
        responseJSON.debug = {
            usersRooms: server.usersRooms,
            allgames: server.games,
            allusers: server.users
        }
    }

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
expressServer.listen(port, () => {
    console.log(`Listening on port \x1b[36m${port}\x1b[0m\n`);
})
