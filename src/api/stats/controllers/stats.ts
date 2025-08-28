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
      // Fetch survey WITH locale
      const surveyData = (await strapi.entityService.findMany(
        "api::survey.survey",
        {
          filters: { documentId: surveyDocumentId } as any,
          populate: { questions: { populate: { answers: true } } },
          locale,
        }
      )) as any[];

      if (!surveyData?.length) ctx.throw(404, "Survey not found");
      const surveyRaw = surveyData[0] as any;
      const surveyId = surveyRaw.id;

      // Fetch responses
      const userResponses = (await strapi.entityService.findMany(
        "api::user-response.user-response",
        {
          filters: { survey: surveyId } as any,
          fields: ['content'],  // Select only the "content" field
        }
      )) as any[];
      console.log("User Responses took ", Date.now() - start_time, "ms");
      // === Separate dimensions vs targets ===
      const dimensions = surveyRaw.questions.filter((q: any) => q.toAggregate);
      const targets = surveyRaw.questions.filter((q: any) => !q.toAggregate);

      // === Setup breakdown structure ===
      const breakdownStats: Record<
        string, // targetQ
        Record<
          string, // targetAnswer
          {
            totalCount: number;
            dimensions: Record<
              string, // dimensionQ
              Record<string, number> // dimensionAnswer -> count
            >;
          }
        >
      > = {};

      targets.forEach((t: any) => {
        breakdownStats[t.documentId] = {};
        t.answers.forEach((ta: any) => {
          breakdownStats[t.documentId][ta.documentId] = {
            totalCount: 0,
            dimensions: {},
          };
          dimensions.forEach((d: any) => {
            breakdownStats[t.documentId][ta.documentId].dimensions[d.documentId] = {};
            d.answers.forEach((da: any) => {
              breakdownStats[t.documentId][ta.documentId].dimensions[d.documentId][
                da.documentId
              ] = 0;
            });
          });
        });
      });

      // === Aggregate ===
      userResponses.forEach((ur: any) => {
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

          // Increment total count for that answer
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

      // === Prepare localized maps ===
      const questionTextById: Record<string, string> = {};
      const answerTextById: Record<string, string> = {};
      surveyRaw.questions.forEach((q: any) => {
        questionTextById[q.documentId] = q.content ?? "";
        q.answers?.forEach((a: any) => {
          answerTextById[a.documentId] = a.content ?? "";
        });
      });

      // === Format into API response ===
      const formattedBreakdownStats = Object.entries(breakdownStats).map(
        ([targetId, answersObj]) => {
          const formattedAnswers = Object.entries(answersObj).map(([ansId, obj]) => ({
            answer: answerTextById[ansId] || ansId,
            totalCount: obj.totalCount,
            breakdowns: Object.entries(obj.dimensions).map(([dimId, dimAnswers]) => ({
              by: questionTextById[dimId] || dimId,
              answers: Object.entries(dimAnswers).map(([dimAnswerId, count]) => ({
                answer: answerTextById[dimAnswerId] || dimAnswerId,
                count,
              })),
            })),
          }));

          const questionTotal = formattedAnswers.reduce(
            (sum, a) => sum + a.totalCount,
            0
          );

          return {
            question: questionTextById[targetId] || targetId,
            totalCount: questionTotal,
            answers: formattedAnswers,
          };
        }
      );

      ctx.body = {
        aggregatedStats: formattedBreakdownStats,
        locale,
      };
      console.log("Response took ", Date.now() - start_time, "ms");
    } catch (err: any) {
      ctx.throw(err.status ?? 500, err.message);
    }
  },
};
