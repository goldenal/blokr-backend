import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/** Documents a `Paginated<T>` response ({ items, total, page, pageSize }) for the given item type. */
export const ApiPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
) =>
  applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: `Paginated list of ${model.name}`,
      schema: {
        allOf: [
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              total: { type: 'number', example: 42 },
              page: { type: 'number', example: 1 },
              pageSize: { type: 'number', example: 20 },
            },
          },
        ],
      },
    }),
  );
