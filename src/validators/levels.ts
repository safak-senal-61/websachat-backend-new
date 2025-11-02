import Joi from 'joi';

export const leaderboardQuerySchema = Joi.object({
  sort: Joi.string()
    .valid('level', 'xp')
    .optional()
    .default('level'),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(50),
});