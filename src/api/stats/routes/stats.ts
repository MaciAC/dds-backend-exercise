export default {
  routes: [
    {
     method: 'GET',
     path: '/stats/:surveyDocumentId',
     handler: 'stats.getAggregatedStats',
     config: {
       policies: [],
       middlewares: [],
     },
    },
  ],
};
