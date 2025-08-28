/**
 * survey service
 */
import { factories } from '@strapi/strapi';

type Params = {
  populate?: any;
  [key: string]: any;
};

export default factories.createCoreService('api::survey.survey', ({ strapi }) => ({
  async find(...args) {
    // Extract the existing arguments and modify the populate parameter
    const params = ((args[0] ?? {}) as Params);

    // Set default populate if not already specified
    params.populate = {
        questions: {
            populate: {
            answers: true
            }
        }
    };
    
    // Call the parent find method with our modified parameters
    const { results, pagination } = await super.find(params);
    
    return { results, pagination };
  },
  async findOne(id: string | number, ...args) {
  // If no explicit populate provided, set the default one
    const params = (args[0] ?? {}) as Params;
    if (!params.populate) {
        params.populate = {
        questions: {
            populate: {
            answers: true,
            },
        },
        };
    }

    // Call super.findOne with the id and modified params
    const result = await super.findOne(id, params);

    return result;
  }
}));