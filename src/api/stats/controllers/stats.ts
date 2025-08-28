import { Context } from "koa";

export default {
  getAggregatedStats: async (ctx: Context) => {
    try {
      const { surveyDocumentId } = ctx.params;
      const locale = ctx.query.locale || null;

      if (!surveyDocumentId) {
        ctx.throw(400, "Survey documentId must be provided");
      }

      const surveyData = (await strapi.entityService.findMany(
        "api::survey.survey",
        {
          filters: { documentId: surveyDocumentId } as any,
          populate: { questions: { populate: { answers: true } } },
          locale,
        }
      )) as any[];

      if (!surveyData?.length) ctx.throw(404, "Survey not found");
      const surveyRaw = surveyData[0];
      const surveyId = surveyRaw.id;
      const statsMemoryService = strapi.service('api::survey-stats-memory.survey-stats-memory');
      const statsService = strapi.service('api::stats.stats');

      const statsMemory = await statsMemoryService.getBySurveyDocumentId(surveyDocumentId);

      let baselineStats = null;
      let lastUpdate = null;

      if (statsMemory) {
        baselineStats = statsMemory.stats; // JSON with aggregated results
        lastUpdate = new Date(statsMemory.updatedAt);
      } else {
        baselineStats = null;
        lastUpdate = null;
      }

      // === Fetch only new responses (if memory exists) or all (if not) ===
      const responseFilters: any = { survey: { documentId: surveyDocumentId }};
      if (lastUpdate) {
        responseFilters.createdAt = { $gt: lastUpdate }; // only newer responses
      }

      const newResponses = (await strapi.entityService.findMany(
        "api::user-response.user-response",
        {
          filters: responseFilters,
          fields: ["content"],
        }
      )) as any[];


      const dimensions = surveyRaw.questions.filter((q: any) => q.toAggregate);
      const targets = surveyRaw.questions.filter((q: any) => !q.toAggregate);

      const breakdownStats = statsService.aggregateResponses(newResponses, baselineStats, dimensions, targets);

      const formattedBreakdownStats = statsService.formatAggregatedStats(breakdownStats, surveyRaw.questions);

      await statsMemoryService.upsertStatsMemory(surveyDocumentId, breakdownStats, statsMemory?.id);

      ctx.body = {
        aggregatedStats: formattedBreakdownStats,
        locale,
      };
    } catch (err: any) {
      ctx.throw(err.status ?? 500, err.message);
    }
  },
};
