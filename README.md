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

- `KEEP_LOGS` - If defined, server and individual room logs will be stored to arrays for later viewing (development only, not for use in production. logs are stored in memory and are never cleared)

- `DISCORD_WEBHOOK_URL` - If defined, server events will be logged to this webhook

- `WEBHOOK_LOG_MODE` - Can be 'all' or 'uncaughtExceptions'. All logs everything that is also sent to server.log(). 'uncaughtExceptions' will only use the webhook for crash events.
