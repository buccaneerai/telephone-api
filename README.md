# telephone-api
> ☎️ Handles telephone logic and receives raw audio from a phone call over a WebSocket

## Running it locally

```
> ⚠️ This service makes use of private npm packages, so you'll need to be authenticated to use our company's private npm registry.

### Service dependencies
This service may use other microservices as dependencies.  You'll need to run those locally (using docker) or connect to a running cluster.  The URLs should be provided as environment variables.

### `.env` file
This project receives configuration inputs via the `dotenv` package.
```bash
cp local.env
.env
```
> ⚠️ You'll need to fill in the blanks.  Some of the environment variables include secret keys that are not tracked in .git.

### Run the app
```bash
yarn dev
```

### Understanding the telephone workflow
1. A telephone workflow is initiated by hitting the GraphQL API. This creates a `telephoneCall` document in the database. It includes a temporary secret token and other metadata to manage the workflow.
2. The GraphQL API hits `POST` `/calls` in the `telephone-api`.  This triggers a Twilio call to be created. Twilio will dial into the telephone number that is provided.
3. Twilio will then stream the audio data from the call to the `telephone-api`'s WebSocket endpoint (which must be provided when the call is created).
4. The audio data is then transmitted to the WebSocket (codec=mulaw, sampleRate=8000Hz, bitDepth=8, channels=1).
5. The WebSocket pipeline forwards the data to downstream servers.

## How to test the WebSocket with input real data

### Simulating an audio stream
```bash
yarn cli simulate
```
This will stream Mulaw audio data from a sample file up to the WebSocket server.

### Receiving a real audio stream from Twilio

With your server running locally, you can use an SSH tunnel service like ngrok to expose the local server to the public internet.
```bash
ngrok http 9085
```
> ‼️ Remember, if you do this, anyone on the internet can send requests to your server.

Now set `BASE_URL` in your `.env` file to `yourdomain.ngrok.io`.

Now when someone hits `POST` `localhost:3010/call`, the call we be made on Twilio and audio data will be forwarded to your WebSocket server.


## References
- [Make an Outbound Call](https://www.twilio.com/docs/voice/quickstart/node#make-an-outgoing-phone-call-with-nodejs)
- [Sending Dialtones like PIN Numbers](https://www.twilio.com/docs/voice/twiml/number)
- [Media Stream From an Outgoing Call](https://www.twilio.com/docs/voice/api/media-streams)
- [Media Stream From an Inbound Call](https://www.twilio.com/docs/voice/twiml/stream)
