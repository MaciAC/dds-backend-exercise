const axios = require('axios');

process.loadEnvFile('.env');

const API_BASE = "http://localhost:1337/api";
const AUTH_TOKEN = process.env.AUTH_TOKEN;

console.log(AUTH_TOKEN);

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    "Content-Type": "application/json",
  }
});

// Utility: random pick from array
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate one random response payload for a survey
function generateRandomResponse(survey) {
  // For each question, pick one random answer (if answers exist)
  const chosenAnswers = survey.questions.map(q => {
    if (Array.isArray(q.answers) && q.answers.length > 0) {
      // Pick one answer.documentId randomly
      return pickRandom(q.answers).documentId;
    }
    // If question has no answers, skip
    return null;
  }).filter(Boolean); // Filter out nulls
  return {
    survey: survey.documentId,
    content: chosenAnswers
  };
}

// 1. Get survey definition
async function getSurveys() {
  const res = await api.get(`/surveys?locale=en`);
  return res.data.data;
}

// 2. Post user response
async function postUserResponse(responsePayload) {
  const payload = { data: responsePayload };
  const res = await api.post(`/user-responses`, payload);
  return res.data;
}

// Example runner: generate N fake responses per survey!
const N = 500000; // Number of fake users to create

(async () => {
  try {
    const surveys = await getSurveys();
    const survey = surveys[0];
    console.log(`Creating ${N} random responses for: ${survey.description}`);

    for (let i = 0; i < N; i++) {
      const responsePayload = generateRandomResponse(survey);
      const response = await postUserResponse(responsePayload);
      console.log(`Submitted response ${i + 1}:`, response);
    }

    console.log("\nAll random responses have been submitted.");

  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
})();
