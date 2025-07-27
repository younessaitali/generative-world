import type { H3Event, H3EventContext } from 'h3';
import type { z, ZodType } from 'zod/v4';

export default function defineValidatedEventHandler<
  D,
  TBody extends ZodType | undefined = undefined,
  TQuery extends ZodType | undefined = undefined,
  TParams extends ZodType | undefined = undefined,
  ValidatedEvent = H3Event & {
    context: H3EventContext & {
      validated: {
        body: TBody extends ZodType ? z.infer<TBody> : undefined;
        query: TQuery extends ZodType ? z.infer<TQuery> : undefined;
        params: TParams extends ZodType ? z.infer<TParams> : undefined;
      };
    };
  },
>(
  validations: {
    body?: TBody;
    query?: TQuery;
    params?: TParams;
  },
  handler: (event: ValidatedEvent) => Promise<D>,
) {
  return defineEventHandler(async (event) => {
    const errors = new Map<'body' | 'query' | 'params', z.ZodError>();

    const validated: {
      body?: TBody extends ZodType ? z.infer<TBody> : undefined;
      query?: TQuery extends ZodType ? z.infer<TQuery> : undefined;
      params?: TParams extends ZodType ? z.infer<TParams> : undefined;
    } = {};

    if (validations.body) {
      const bodyResult = await readValidatedBody(event, validations.body.safeParse);
      if (bodyResult.error) {
        errors.set('body', bodyResult.error);
      } else {
        validated.body = bodyResult.data as TBody extends ZodType ? z.infer<TBody> : undefined;
      }
    }

    if (validations.query) {
      const queryResult = await getValidatedQuery(event, validations.query.safeParse);
      if (queryResult.error) {
        errors.set('query', queryResult.error);
      } else {
        validated.query = queryResult.data as TQuery extends ZodType ? z.infer<TQuery> : undefined;
      }
    }

    if (validations.params) {
      const paramsResult = await getValidatedRouterParams(event, validations.params.safeParse);
      if (paramsResult.error) {
        errors.set('params', paramsResult.error);
      } else {
        validated.params = paramsResult.data as TParams extends ZodType
          ? z.infer<TParams>
          : undefined;
      }
    }

    if (errors.size > 0) {
      throw createError({
        statusCode: 422,
        data: {
          message: 'Validation error',
          errors: Object.fromEntries(errors),
        },
      });
    }

    event.context.validated = validated;

    return handler(event as ValidatedEvent);
  });
}
