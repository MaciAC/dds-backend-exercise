import { Context } from "koa";

export default {
  getAggregatedStats: async (ctx: Context) => {
    try {
      const start_time = Date.now();
      const { surveyDocumentId } = ctx.params;
      const locale = ctx.query.locale || null;

      if (!surveyDocumentId) {
        ctx.throw(400, "Survey documentId must be provided");
      }

      // === Fetch survey WITH locale ===
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

      const statsMemory = await statsMemoryService.getBySurveyId(surveyId);

      // Use stats property, not content
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
      const responseFilters: any = { survey: surveyId };
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

      console.log(
        `Fetched ${newResponses.length} new responses in`,
        Date.now() - start_time,
        "ms"
      );

      // === Questions: separate dimensions vs targets ===
      const dimensions = surveyRaw.questions.filter((q: any) => q.toAggregate);
      const targets = surveyRaw.questions.filter((q: any) => !q.toAggregate);

      const breakdownStats = statsService.aggregateResponses(newResponses, baselineStats, dimensions, targets);

      // === Aggregate only new responses ===
      newResponses.forEach((ur: any) => {
        const chosen = ur.content;

        // Dimension answers chosen
        const chosenDims: Record<string, string | null> = {};
        dimensions.forEach((d: any) => {
          const match = d.answers.find((a: any) => chosen.includes(a.documentId));
          chosenDims[d.documentId] = match ? match.documentId : null;
        });

        // Target answers chosen
        targets.forEach((t: any) => {
          const match = t.answers.find((a: any) => chosen.includes(a.documentId));
          if (!match) return;
          const targetAnswerId = match.documentId;

          breakdownStats[t.documentId][targetAnswerId].totalCount++;

          for (const [dimQId, dimAnswerId] of Object.entries(chosenDims)) {
            if (dimAnswerId) {
              breakdownStats[t.documentId][targetAnswerId].dimensions[dimQId][
                dimAnswerId
              ]++;
            }
          }
        });
      });

      // === Localized maps ===
      const questionTextById: Record<string, string> = {};
      const answerTextById: Record<string, string> = {};
      surveyRaw.questions.forEach((q: any) => {
        questionTextById[q.documentId] = q.content ?? "";
        q.answers?.forEach((a: any) => {
          answerTextById[a.documentId] = a.content ?? "";
        });
      });

      const formattedBreakdownStats = statsService.formatAggregatedStats(breakdownStats, surveyRaw.questions);

      await statsMemoryService.upsertStatsMemory(surveyId, breakdownStats, statsMemory?.id);

      ctx.body = {
        aggregatedStats: formattedBreakdownStats,
        locale,
      };
    } catch (err: any) {
      ctx.throw(err.status ?? 500, err.message);
    }
  },
};
