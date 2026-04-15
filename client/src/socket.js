import { io } from 'socket.io-client'
import { store } from './Util'

/** Boolean representing whether or not the app is in a production environment */
const isProduction = process.env.NODE_ENV === 'production';

// If undefined, the URL will be computed from the `window.location` object (this assumes the server is hosted at the same location)
const serverURL = import.meta.env.VITE_APP_SERVER_URL


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
