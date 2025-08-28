export default () => ({
  initBreakdownStats(targets: any[], dimensions: any[]) {
    const breakdownStats: any = {};
    targets.forEach((t) => {
      breakdownStats[t.documentId] = {};
      t.answers.forEach((ta: any) => {
        breakdownStats[t.documentId][ta.documentId] = {
          totalCount: 0,
          dimensions: {},
        };
        dimensions.forEach((d) => {
          breakdownStats[t.documentId][ta.documentId].dimensions[d.documentId] = {};
          d.answers.forEach((da: any) => {
            breakdownStats[t.documentId][ta.documentId].dimensions[d.documentId][da.documentId] = 0;
          });
        });
      });
    });
    return breakdownStats;
  },

  aggregateResponses(newResponses: any[], baselineStats: any, dimensions: any[], targets: any[]) {
    // Start with baseline stats or initialize fresh
    const breakdownStats = baselineStats ?? this.initBreakdownStats(targets, dimensions);

    newResponses.forEach((ur) => {
      const chosen = ur.content;

      // Dimension answers chosen
      const chosenDims: Record<string, string | null> = {};
      dimensions.forEach((d) => {
        const match = d.answers.find((a: any) => chosen.includes(a.documentId));
        chosenDims[d.documentId] = match ? match.documentId : null;
      });

      // Target answers chosen and aggregate counts
      targets.forEach((t) => {
        const match = t.answers.find((a: any) => chosen.includes(a.documentId));
        if (!match) return;
        const targetAnswerId = match.documentId;

        breakdownStats[t.documentId][targetAnswerId].totalCount++;

        for (const [dimQId, dimAnswerId] of Object.entries(chosenDims)) {
          if (dimAnswerId) {
            breakdownStats[t.documentId][targetAnswerId].dimensions[dimQId][dimAnswerId]++;
          }
        }
      });
    });

    return breakdownStats;
  },

  formatAggregatedStats(breakdownStats: any, surveyQuestions: any[]) {
    // Prepare localized text maps
    const questionTextById: Record<string, string> = {};
    const answerTextById: Record<string, string> = {};
    surveyQuestions.forEach((q) => {
      questionTextById[q.documentId] = q.content ?? "";
      q.answers?.forEach((a: any) => {
        answerTextById[a.documentId] = a.content ?? "";
      });
    });

    // Format aggregated stats for API response
    const formattedBreakdownStats = Object.entries(breakdownStats).map(([targetId, answersObj]) => {
      const formattedAnswers = Object.entries(answersObj).map(([ansId, obj]: any) => ({
        answer: answerTextById[ansId] || ansId,
        totalCount: obj.totalCount,
        breakdowns: Object.entries(obj.dimensions).map(([dimId, dimAnswers]: any) => ({
          by: questionTextById[dimId] || dimId,
          answers: Object.entries(dimAnswers).map(([dimAnswerId, count]) => ({
            answer: answerTextById[dimAnswerId] || dimAnswerId,
            count,
          })),
        })),
      }));

      const questionTotal = formattedAnswers.reduce((sum, a) => sum + a.totalCount, 0);

      return {
        question: questionTextById[targetId] || targetId,
        totalCount: questionTotal,
        answers: formattedAnswers,
      };
    });

    return formattedBreakdownStats;
  },
});
