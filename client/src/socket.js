import { io } from 'socket.io-client'

const isProduction = process.env.NODE_ENV === 'production';

// "undefined" means the URL will be computed from the `window.location` object
const serverURL = isProduction ?
    "https://uno-server1.notkal.com:443" : // Production endpoint
    'http://localhost:443'; // Development

const socket = io(serverURL, { secure:true });

// Connection state
let socketConnectionStatus = false; 
socket.on('connect', () => socketConnectionStatus = true);
socket.on('reconnect', () => socketConnectionStatus  = true); 
socket.on('disconnect', () => socketConnectionStatus  = false); 

export { socket, isProduction, socketConnectionStatus, serverURL }
