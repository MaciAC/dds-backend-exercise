const { createCoreController } = require('@strapi/strapi').factories;
const { errors } = require('@strapi/utils');

module.exports = createCoreController('api::user-response.user-response', ({ strapi }) => ({
  async create(ctx) {
    const { survey, answers } = ctx.request.body.data;

    // Check for required data
    if (!Array.isArray(answers) || answers.length === 0 || !survey) {
      throw new errors.ApplicationError('Answers and survey documentId must be provided');
    }

    // Fetch the survey by documentId with its questions and their answers
    const surveyDataResponse = await strapi.entityService.findMany('api::survey.survey', {
        filters: { documentId: survey },
        populate: {
            questions: { 
            populate: { answers: true } 
            }
        }
    });
    
    if (surveyDataResponse === undefined || surveyDataResponse.length == 0) {
      throw new errors.ApplicationError('Survey not found');
    }
    
    const surveyData = surveyDataResponse[0]

    // Build a set of valid question and answer documentIds for this survey
    const questionDocIds = surveyData.questions.map(q => q.documentId);
    const answerToQuestionDocIdMap = new Map();
    surveyData.questions.forEach(q => {
      q.answers.forEach(a => {
        answerToQuestionDocIdMap.set(a.documentId, q.documentId);
      });
    });

   // Check each answer belongs to a question from this survey (by documentId)
    const answerQuestionDocIds = answers.map(aid => answerToQuestionDocIdMap.get(aid));
    if (answerQuestionDocIds.some(qid => qid === undefined || !questionDocIds.includes(qid))) {
    throw new errors.ApplicationError('Some answers do not belong to the survey');
    }

    // Count answers per question
    const questionAnswerCounts = {};
    answerQuestionDocIds.forEach(qid => {
    if (!questionAnswerCounts[qid]) {
        questionAnswerCounts[qid] = 0;
    }
    questionAnswerCounts[qid]++;
    });
    // Check that each question has exactly one answer
    for (const qid of questionDocIds) {
    if (questionAnswerCounts[qid] !== 1) {
        throw new errors.ApplicationError('You must provide exactly one answer per question');
    }
    }

    return await super.create(ctx);
  },
}));
