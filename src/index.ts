import Fastify, { FastifyReply } from 'fastify';
import got from 'got';
import { Static, Type } from '@sinclair/typebox';

const GetVisitorSchema = Type.Object({
  path: Type.String(),
});

const server = Fastify();

server.get('/', (_, reply) => reply
  .header('cache-control', 'public, max-age=86400')
  .send('https://github.com/ouuan/plausible-visitor-count'));

async function handleRequest(reply: FastifyReply, path?: string) {
  try {
    reply.header('Access-Control-Allow-Origin', '*');
    const response: any = await got.get(new URL(
      `/api/v1/stats/aggregate?site_id=${process.env.PLAUSIBLE_SITE_ID}&metrics=visitors&period=custom&date=2019-01-01,${new Date().toISOString().slice(0, 10)}${path === undefined ? '' : `&filters=event:page%3D%3D%2F${path}`}`,
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
    return reply.header('cache-control', 'public, max-age=300').send({
      statusCode: 200,
      path,
      visitors,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return reply.status(500).send({
      message: 'Error occurred when trying to fetch the stats',
      error: 'Internal Server Error',
      statusCode: 500,
    });
  }
}

server.get<{Params: Static<typeof GetVisitorSchema>}>('/api/visitors/:path', {
  schema: {
    params: GetVisitorSchema,
  },
}, async (request, reply) => {
  const { path } = request.params;
  return handleRequest(reply, path);
});

server.get('/api/visitors', async (_, reply) => handleRequest(reply));

server.listen({
  port: 3000,
  host: process.env.LISTEN_HOST || '0.0.0.0',
});
