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

// Concurrent runner utility to limit parallelism
async function runConcurrently(items, worker, concurrency) {
  const results = [];
  const executing = new Set();

  for (const item of items) {
    // Run the worker for the current item
    const p = Promise.resolve().then(() => worker(item));
    results.push(p);

    // Add the executing promise to the set
    executing.add(p);

    // When it finishes, remove from set
    const clean = () => executing.delete(p);
    p.then(clean).catch(clean);

    // If max concurrency reached, wait for one to finish
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  // Wait for all remaining tasks to finish
  return Promise.all(results);
}

// Read n_requests and n_concurrent from command-line arguments
const args = process.argv.slice(2);
const n_requests = parseInt(args[0], 10) || 50;  // default 50
const n_concurrent = 5;

(async () => {
  try {
    const surveys = await getSurveys();
    const survey = surveys[0];
    console.log(`Creating ${n_requests} random responses for: ${survey.description}`);
    console.log(`Using concurrency of ${n_concurrent}`);

    const tasks = Array.from({ length: n_requests }, () => generateRandomResponse(survey));

    await runConcurrently(tasks, async (responsePayload, index) => {
      const response = await postUserResponse(responsePayload);
      if (response.errors) throw Error(JSON.stringify(response.errors)); // Throw error on errors
      return response;
    }, n_concurrent);

    console.log("\nAll random responses have been submitted.");
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
})();
