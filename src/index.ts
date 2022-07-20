import Fastify from 'fastify';
import got from 'got';
import { Static, Type } from '@sinclair/typebox';

const GetVisitorSchema = Type.Object({
  path: Type.String(),
});

const server = Fastify();

server.get<{Params: Static<typeof GetVisitorSchema>}>('/api/visitors/:path', {
  schema: {
    params: GetVisitorSchema,
  },
}, async (request, reply) => {
  try {
    const { path } = request.params;
    const response: any = await got.get(new URL(
      `/api/v1/stats/aggregate?site_id=${process.env.PLAUSIBLE_SITE_ID}&metrics=visitors&period=custom&date=2019-01-01,${new Date().toISOString().slice(0, 10)}&filters=event:page${encodeURIComponent(`==/${path}`)}`,
      process.env.PLAUSIBLE_URL || 'https://plausible.io',
    ), {
      headers: {
        Authorization: `Bearer ${process.env.PLAUSIBLE_API_KEY}`,
      },
    }).json();
    const visitors = response.results?.visitors?.value;
    if (!Number.isInteger(visitors)) {
      return reply.status(502).send({
        message: 'Invalid response from Plausible',
        error: 'Bad Gateway',
        statusCode: 502,
      });
    }
    return reply.header('cache-control', 'public, max-age=60').send({
      statusCode: 200,
      path,
      visitors,
    });
  } catch (e) {
    return reply.status(500).send({
      message: 'Error occurred when trying to fetch the stats',
      error: 'Internal Server Error',
      statusCode: 500,
    });
  }
});

server.listen({
  port: 3000,
  host: process.env.LISTEN_HOST || '0.0.0.0',
});
