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

#### Client .env
Copy `client/.env.example` and rename it to `client/.env` (or define environment variables using your hosting platform)

- `VITE_APP_SERVER_URL` (Optional) Server URL to connect to. Defaults to http://localhost:443


### Server
Run server:
```bash
# Development server
cd ./server
npm run dev

# Production server
# NODE_ENV is automatically set to 'production' using the 'cross-env' package
cd ./server
npm run prod
```

#### Server Config
Copy `server/.env.example` and rename it to `server/.env` (or define environment variables using your hosting platform)

**Environment**
- `NODE_ENV` If set to anything other than 'production', the server will assume it is in development mode.
- `CLIENT_URL` The server will accept connections from this URL

**SSL**
- `SSL_MODE` If "true", the server will start in https mode. PRIVATE_KEY_LOCATION and CERTIFICATE_LOCATION are required when SSL mode is enabled.
- `PRIVATE_KEY_LOCATION` Path to privkey.pem
- `CERTIFICATE_LOCATION` Path to fullchain.pem

**Debug**
- `KEEP_LOGS` (Optional) If defined, server and individual room logs will be stored to arrays for later viewing (development only, not for use in production. logs are stored in memory and are never cleared).
- `DISCORD_WEBHOOK_URL` If defined, server events will be logged to this webhook.
- `WEBHOOK_LOG_MODE` Can be 'all' or 'uncaughtExceptions'. 'all' logs everything that is also sent to server.log(). 'uncaughtExceptions' will only use the  Discord webhook for crash events.
<br>

- `DEBUG_ACCESS_KEY` (Optional) Adding ?key=\<DEBUG_ACCESS_KEY\> to the end of the page URL will allow access to the debug panel. Leave undefined to disable it.
