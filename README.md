## Domestic data streamers - backend exercise

This is a REST API created using Strapi. It is part of the technical test for the position of Backend Developer at DDS.

### Installation and running instructions:

# Pre-requisites
Node js 20 as it is required for Strapi v5. Recommended way to manage different versions of node is nvm:
https://nodejs.org/en/download/
```
➜ nvm install 20
➜ nvm use 20
```
# Installation

1. Clone this repository to your local machine.
```
➜ git clone git@github.com:MaciAC/dds-backend-exercise.git
```
2. Make sure that Node.js v20.x.x is being used as it is required for Strapi v5.
```
➜ cd dds-backend-exercise
➜ dds-backend-exercise git:(master) nvm use 20
```
3. Install dependencies.
```
➜ dds-backend-exercise git:(master) npm install
```

# Setup and start the application
1. Duplicate .env.example file into .env as per a testing purposes we can left the dummy env vars as they are.

```
➜ dds-backend-exercise git:(master) cp .env.example .env
```

2. Start the server. It will be available on http://localhost:1337/

```
➜ dds-backend-exercise git:(master) npm run develop
```

3. Access to the admin panel in http://localhost:1337/ and Sign In, this will create an admin user. At this point the Databse structure is created but we have no data yet.

For easier testing we will use the Full-access token generated when creating the user. In a prodution environment we would create a dedicated tokens for each service or client with the only needed permissions.

4. Get the full access token by logging in to the admin panel and going to `Settings > API Tokens` and select the Full access token, then copy the value of the Token field. This token should be included in all requests made to the API as a Bearer token in the Authorization header. You can check the Postman collection that we shared.

Strapi is configured so only 'en' locale exists by default. For us to be able to insert data using more languages we need to add them manually. It can only be done through the Admin Panel. Go to `Settings > Internationalization > + Add new locale` and add Spanish ('es') for our case.

Now we will use two scripts to insert some data into our database so we can test the API endpoints.

5. Paste the token in the .env file under AUTH_TOKEN variable.

```
AUTH_TOKEN=your_token_here
```

6. Open a new terminal and run the script "scripts/create-survey.ts" to create a new survey with the data in scripts/survey-data.json (we have created a json file with the sample data from the exercise):

```
➜ dds-backend-exercise git:(master) npx ts-node src/scripts/create-survey.ts
```

7. Once the survey has been created, run the script "scripts/fill-survey-dummy-data.ts" to fill the survey with dummy data (by default it creates 50 random userResponses):
```
➜ dds-backend-exercise git:(master) npx ts-node src/scripts/fill-survey-dummy-data.ts
```
To insert an specific number of responses instead of the default 50 we can pass it as an argument
```
➜ dds-backend-exercise git:(master) npx ts-node src/scripts/fill-survey-dummy-data.ts 1000
```

At this point the API endpoints are ready to be tested. The API endpoints are documented in the postman collection that we shared.