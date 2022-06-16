# PACKAGE_NAME
> DESCRIPTION

# FIXME
* Replace "PACKAGE_NAME"
* Replace "DESCRIPTION" (on multiple files of this repository) with your microservice's description.
* Tailor the local.env file to your app
* Add routes to `api.js`
* This app assumes the microservice is an Express.js HTTP API.  If that is not the case, then you can delete the `src` files and replace them with your own.  You can also remove unecessary packages from the package.json

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
