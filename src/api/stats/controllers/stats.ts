import { Context } from "koa";

export default {
  getAggregatedStats: async (ctx: Context) => {
    try {
      const { surveyDocumentId } = ctx.params;
      const locale = ctx.query.locale || null;

      if (!surveyDocumentId) {
        ctx.throw(400, "Survey documentId must be provided");
      }

      // Fetch survey WITHOUT locale - stable IDs for aggregation
      const surveyDataRaw = (await strapi.entityService.findMany(
        "api::survey.survey",
        {
          filters: { documentId: surveyDocumentId } as any,
          populate: {
            questions: { populate: { answers: true } },
          },
        }
      )) as any[];

      if (!surveyDataRaw || surveyDataRaw.length === 0) {
        ctx.throw(404, "Survey not found");
      }
      const surveyRaw = surveyDataRaw[0] as any;

      if (!surveyRaw.questions || !Array.isArray(surveyRaw.questions)) {
        ctx.throw(500, "Survey questions data missing or malformed");
      }

      // Get survey primary id for filtering user responses
      const surveyEntities = (await strapi.entityService.findMany(
        "api::survey.survey",
        {
          filters: { documentId: surveyDocumentId } as any,
          // no fields restriction - fetch full entity
        }
      )) as any[];

      if (!surveyEntities.length) {
        ctx.throw(404, "Survey not found");
      }
      const surveyId = surveyEntities[0].id;

      // Fetch user responses filtered by survey id (aggregation independent of locale)
      const userResponses = (await strapi.entityService.findMany(
        "api::user-response.user-response",
        {
          filters: { survey: surveyId } as any,
          populate: { answers: true },
        }
      )) as any[];

      // Fetch survey WITH locale to get localized question and answer texts for display
      const surveyDataLocalized = (await strapi.entityService.findMany(
        "api::survey.survey",
        {
          filters: { documentId: surveyDocumentId } as any,
          populate: {
            questions: { populate: { answers: true } },
          },
          locale,
        }
      )) as any[];
      if (!surveyDataLocalized || surveyDataLocalized.length === 0) {
        ctx.throw(404, "Survey not found");
      }
      const surveyLocalized = surveyDataLocalized[0] as any;

      // Build stable maps by documentId from raw survey for aggregation keys
      const aggregatedStats: Record<string, Record<string, number>> = {};
      surveyRaw.questions.forEach((q: any) => {
        aggregatedStats[q.documentId] = {};
        if (q.answers && Array.isArray(q.answers)) {
          q.answers.forEach((a: any) => {
            aggregatedStats[q.documentId][a.documentId] = 0;
          });
        }
      });

      // Aggregate counts by documentId, independent from locale
      userResponses.forEach((ur: any) => {
        if (ur.answers && Array.isArray(ur.answers)) {
          ur.answers.forEach((answer: any) => {
            const answerDocId = answer.documentId;
            for (const question of surveyRaw.questions) {
              if (question.answers.find((a: any) => a.documentId === answerDocId)) {
                aggregatedStats[question.documentId][answerDocId]++;
                break;
              }
            }
          });
        }
      });

      // Map localized texts by documentId from localized survey data
      const questionTextById: Record<string, string> = {};
      const answerTextById: Record<string, string> = {};

      surveyLocalized.questions.forEach((q: any) => {
        questionTextById[q.documentId] = q.content ?? "";
        if (q.answers && Array.isArray(q.answers)) {
          q.answers.forEach((a: any) => {
            answerTextById[a.documentId] = a.content ?? "";
          });
        }
      });

      // Format output with localized text and aggregated counts
      const formattedAggregatedStats = Object.entries(aggregatedStats).map(
        ([questionDocId, answers]) => ({
          question: questionTextById[questionDocId] || "",
          answers: Object.entries(answers).map(([answerDocId, count]) => ({
            answer: answerTextById[answerDocId] || "",
            count,
          })),
        })
      );

      ctx.body = {
        aggregatedStats: formattedAggregatedStats,
        locale,
      };
    } catch (err: any) {
      ctx.throw(err.status ?? 500, err.message);
    }
  },
};
