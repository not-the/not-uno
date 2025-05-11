import { io } from 'socket.io-client'
import { store } from './Util'

/** Boolean representing whether or not the app is in a production environment */
const isProduction = process.env.NODE_ENV === 'production';

// "undefined" means the URL will be computed from the `window.location` object
const serverURL = isProduction ?
    "https://uno-server1.notkal.com:443" : // Production endpoint
    'http://localhost:443'; // Development


const URLKey = new URL(window.location).searchParams.get("key");

const handshakeData = {
    ...store("user_data"),
    autoJoin: window.location.hash.substring(1),
    rejoin_key: localStorage.getItem("notuno_rejoin_key"),
    key: URLKey
};
const socket = io(serverURL, { secure:true, query:handshakeData });

// Connection state
let socketConnectionStatus = false; 
let hasDisconnected = false;
socket.on('connect', () => {
    socketConnectionStatus = true;

    // Reconnect
    if(!hasDisconnected) return;

    // Rejoin
    const hash = window.location.hash.substring(1);
    if(hash.length === 0) return;
    socket.emit("join", {
        roomID: hash,
        spectate: false,
        rejoin_key: localStorage.getItem("notuno_rejoin_key")});
});
socket.on('disconnect', () => {
    socketConnectionStatus  = false;
    hasDisconnected = true;
});

// Ready event
socket.emit("ready");

export { socket, isProduction, socketConnectionStatus, serverURL }
