## Domestic data streamers - backend exercise

This is a REST API created using Strapi. It is part of the technical test for the position of Backend Developer at DDS.

### Installation and running instructions:

# prerequisites
NodeJS, specific version 20.x.x installed on your system. If you don't have it already, I recommend installing it using NVM (Node Version Manager) from https://github.com/nvm-sh/nvm

`nvm install 20`

`nvm use 20`

# installation steps

1. Clone this repository to your local machine.
2. Run `nvm use 20` to make sure that Node.js v20.x.x is being used as it is required for Strapi v5.
3. Install dependencies by running `npm install`.
4. Duplicate .env.example file into .env as per a testing purposes we can left the dummy env vars as they are.

# setup 
5. Start the server with `npm run develop`. The server will be available on http://localhost:1337/
6. Access to the admin panel in http://localhost:1337/ and create an account. You can access the admin panel after logging in with the credentials provided during registration.
7. For easier testing we will use the Full-access token generated when creating the user. To get it go to Settings > API Tokens and select the Full access token, then copy the value of the Token field. This token should be included in all requests made to the API as a Bearer token in the Authorization header. You can check the Postman collection that we shared.
8. Paste the copied token in hte .env file under AUTH_TOKEN variable.
```
AUTH_TOKEN=your_token_here
```
9. Open a new terminal and run the script "scripts/create-survey.ts" to create a new survey with the data in scripts/survey-data.json (we have created a json file with the sample data from the exercise):
```
npx ts-node src/scripts/create-survey.ts
```
10. Once the survey has been created, run the script "scripts/fill-survey-dummy-data.ts" to fill the survey with dummy data (by default it inserts 1000 random userResponses):
```
npx ts-node src/scripts/fill-survey-dummy-data.ts
```

At this point the API endpoints are ready to be tested.