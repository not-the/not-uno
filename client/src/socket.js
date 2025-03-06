import { io } from 'socket.io-client'
import { store } from './Util'

/** Boolean representing whether or not the app is in a production environment */
const isProduction = process.env.NODE_ENV === 'production';

// "undefined" means the URL will be computed from the `window.location` object
const serverURL = isProduction ?
    "https://uno-server1.notkal.com:443" : // Production endpoint
    'http://localhost:443'; // Development

const userData = store("user_data");
const socket = io(serverURL, { secure:true, query:userData });

// Connection state
let socketConnectionStatus = false; 
socket.on('connect', () => socketConnectionStatus = true);
socket.on('reconnect', () => socketConnectionStatus  = true);
socket.on('disconnect', () => socketConnectionStatus  = false);

// Ready event
socket.emit("ready");

export { socket, isProduction, socketConnectionStatus, serverURL }
