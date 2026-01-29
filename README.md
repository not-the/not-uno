![NOT UNO](https://github.com/not-the/not-uno/blob/main/client/public/banner_rounded.png?raw=true)

> ### Online multiplayer UNO made with React + Socket.io

---

# Development

### Client
Made with create-react-app. To run:
```bash
cd ./client
npm start
```

**Client Config**
Create a `/client/.env` file (or define environment variables using your hosting platform)

- `REACT_APP_SERVER_URL` (Optional) Server URL to connect to. Defaults to http://localhost:443


### Server
Run server:
```bash
# Development server
cd ./server
npm start

# Production server
# NODE_ENV is automatically set to 'production' using the 'cross-env' package
cd ./server
npm run prod
```

**Server Config**
Create a `/server/.env` file (or define environment variables using your hosting platform)

- `NODE_ENV` If set to anything other than 'production', the server will assume it is in development mode.

- `KEEP_LOGS` (Optional) If defined, server and individual room logs will be stored to arrays for later viewing (development only, not for use in production. logs are stored in memory and are never cleared).

- `DISCORD_WEBHOOK_URL` If defined, server events will be logged to this webhook.

- `WEBHOOK_LOG_MODE` Can be 'all' or 'uncaughtExceptions'. 'all' logs everything that is also sent to server.log(). 'uncaughtExceptions' will only use the  Discord webhook for crash events.

- `DEBUG_ACCESS_KEY` (Optional) Adding ?key=\<DEBUG_ACCESS_KEY\> to the end of the page URL will allow access to the debug panel. Leave undefined to disable it.
