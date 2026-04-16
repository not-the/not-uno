import { data, word_blacklist } from "../server.ts"
import { getGameByUser } from "./socket.connection.mjs";

// copied from app.js. Might convert to an api endpoint
function getRandomName() {
    const adjective = capitalizeFirstLetter(arrRandom(data.names.adjectives));
    const noun = arrRandom(data.names.nouns);
    return `${adjective} ${noun}`;
}

/** Takes in a socket and a newUser object and updates the user's username/avatar
 * @param {*} socket 
 * @param {*} newUser 
 * @returns 
 */
export function setUser(socket, newUser) {
    // Type check
    if(typeof newUser !== 'object') return;
    if(newUser.name === '' || typeof newUser.name !== 'string') return;
    if(typeof newUser?.avatar !== 'string') return;

    const toastInvalidUsername = {
        title: "Invalid username",
        msg: `Maximum username length is 32 characters.`
    };

    // Length requirement
    if(newUser?.name.length > 32) return socket.emit("toast", toastInvalidUsername);

    // Word blacklist
    if(word_blacklist !== undefined) {
        if(word_blacklist.deny.some((word) => newUser.name.includes(word))) {
            return socket.emit("toast", toastInvalidUsername);
        }
    }

    // Ratelimit
    const ratelimit = (socket?.name_changes??0) > 100 ?
        15000 : // 15 seconds (if user has updated themselves 100+ times)
        250; // 0.25 seconds
    if(
        socket?.name_changes >= 5 &&
        Date.now() <= (socket?.name_last_changed??0) + ratelimit
    ) return socket.emit("toast", {
        title: "Wait before trying again"
    })

    // Update socket
    Object.assign(socket, {
        name:               newUser?.name   ?? socket?.name   ?? getRandomName(),
        avatar:             newUser?.avatar ?? socket?.avatar ?? arrRandom(data.avatars),
        socketID:           socket.id,
        name_changes:       (socket?.name_changes??0) + 1,
        name_last_changed:  Date.now() // Timestamp
    })

    // Emit new profile
    const profile = {
        name:   socket.name,
        avatar: socket.avatar,
    }
    if(socket.elevated) profile.elevated = true;
    socket.emit("myProfile", profile);

    // Update
    getGameByUser(socket)?.updateClients();
}
