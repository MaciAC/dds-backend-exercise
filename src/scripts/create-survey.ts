import fs = require('fs');
import path = require('path');

process.loadEnvFile('.env');

const strapiBaseURL = 'http://localhost:1337/api';
const authToken     = process.env.AUTH_TOKEN || '';

type Locale = string;

interface SurveyLocale {
  description: string;
  questions: Array<{
    content: string;
    toAggregate: boolean;
    answers: Array<{ content: string }>;
  }>;
}

interface CreatedIDs {
  answers: Record<Locale, string[][]>;
  questions: Record<Locale, string[]>;
  survey: Record<Locale, string>;
}

// Load surveyData from external JSON
const jsonPath = path.resolve(__dirname, 'survey-data.json');
const surveyData: Record<Locale, SurveyLocale> = JSON.parse(
  fs.readFileSync(jsonPath, 'utf-8')
);

const created: CreatedIDs = { answers: {}, questions: {}, survey: {} };

const locales = Object.keys(surveyData);
const defaultLocale = locales[0];

async function createEnglishAnswers() {
  created.answers[defaultLocale] = [];
  const questions = surveyData[defaultLocale].questions;

  for (let q = 0; q < questions.length; q++) {
    created.answers[defaultLocale][q] = [];
    const answers = questions[q].answers;

    for (let a = 0; a < answers.length; a++) {
      const content = answers[a].content;
      const res = await fetch(`${strapiBaseURL}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ data: { content }, locale: defaultLocale }),
      });
      const { data } = await res.json() as any;
      created.answers[defaultLocale][q][a] = data.documentId;
    }
  }
}

async function createLocalizedAnswers(locale: Locale) {
  if (locale === defaultLocale) return;
  created.answers[locale] = [];
  const questions = surveyData[locale].questions;

  for (let q = 0; q < questions.length; q++) {
    created.answers[locale][q] = [];
    const answers = questions[q].answers;

    for (let a = 0; a < answers.length; a++) {
      const content    = answers[a].content;
      const documentId = created.answers[defaultLocale][q][a];
      const res = await fetch(
        `${strapiBaseURL}/answers/${documentId}?locale=${locale}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ data: { content } }),
        }
      );
      const { data } = await res.json() as any;
      created.answers[locale][q][a] = data.documentId;
    }
  }
}

async function createEnglishQuestions() {
  created.questions[defaultLocale] = [];
  const questions = surveyData[defaultLocale].questions;

  for (let q = 0; q < questions.length; q++) {
    const { content, toAggregate } = questions[q];
    const answerIds = created.answers[defaultLocale][q];
    const res = await fetch(`${strapiBaseURL}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        data: { content, toAggregate, answers: answerIds },
        locale: defaultLocale,
      }),
    });
    const { data } = await res.json() as any;
    created.questions[defaultLocale][q] = data.documentId;
  }
}

async function createLocalizedQuestions(locale: Locale) {
  if (locale === defaultLocale) return;
  created.questions[locale] = [];
  const questions = surveyData[locale].questions;

  for (let q = 0; q < questions.length; q++) {
    const { content, toAggregate } = questions[q];
    const answerIds    = created.answers[locale][q];
    const documentId   = created.questions[defaultLocale][q];
    const res = await fetch(
      `${strapiBaseURL}/questions/${documentId}?locale=${locale}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: { content, toAggregate, answers: answerIds },
        }),
      }
    );
    const { data } = await res.json() as any;
    created.questions[locale][q] = data.documentId;
  }
}

async function createEnglishSurvey() {
  const description = surveyData[defaultLocale].description;
  const questionIds = created.questions[defaultLocale];
  const res = await fetch(`${strapiBaseURL}/surveys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      data: { description, questions: questionIds },
      locale: defaultLocale,
    }),
  });
  const { data } = await res.json() as any;
  created.survey[defaultLocale] = data.documentId;
}

async function createLocalizedSurvey(locale: Locale) {
  if (locale === defaultLocale) return;
  const description  = surveyData[locale].description;
  const questionIds  = created.questions[locale];
  const documentId   = created.survey[defaultLocale];
  const res = await fetch(
    `${strapiBaseURL}/surveys/${documentId}?locale=${locale}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        data: { description, questions: questionIds },
      }),
    }
  );
  const { data } = await res.json() as any;
  created.survey[locale] = data.documentId;
}

async function main() {
  console.log('Creating surveys...');
  console.log('Locales:', locales.join(', '));
  // 1) Answers
  await createEnglishAnswers();
  for (const locale of locales) {
    console.log(`Creating localized answers for locale "${locale}"...`);
    await createLocalizedAnswers(locale);
  }

  // 2) Questions
  await createEnglishQuestions();
  for (const locale of locales) {
    console.log(`Creating localized questions for locale "${locale}"...`);
    await createLocalizedQuestions(locale);
  }

  // 3) Survey
  await createEnglishSurvey();
  for (const locale of locales) {
    console.log(`Creating localized survey for locale "${locale}"...`);
    await createLocalizedSurvey(locale);
  }

  console.log('Survey creation complete for locales:', locales.join(', '));
}

main().catch(console.error);
