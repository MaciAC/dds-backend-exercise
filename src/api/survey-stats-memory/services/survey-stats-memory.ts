import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::survey-stats-memory.survey-stats-memory', ({ strapi }) => ({
  // Add custom method to get stats memory by survey ID
  async getBySurveyId(surveyId: number) {
    const statsArray = await strapi.entityService.findMany('api::survey-stats-memory.survey-stats-memory', {
      filters: { survey: { id: surveyId } },
      limit: 1,
    });
    return statsArray.length ? statsArray[0] : null;
  },

  // Add custom method to create or update stats memory
  async upsertStatsMemory(surveyId: number, stats: any, existingStatsMemoryId?: number) {
    if (existingStatsMemoryId) {
      return await strapi.entityService.update(
        'api::survey-stats-memory.survey-stats-memory',
        existingStatsMemoryId,
        { data: { stats } }
      );
    } else {
      return await strapi.entityService.create('api::survey-stats-memory.survey-stats-memory', {
        data: { survey: surveyId, stats },
      });
    }
  },
}));
