import Fastify, { type FastifyReply } from 'fastify';
import got from 'got';
import { type Static, Type } from '@sinclair/typebox';

const GetVisitorSchema = Type.Object({
  path: Type.String(),
});

const server = Fastify();

server.get('/', (_, reply) => reply.redirect('https://github.com/ouuan/plausible-visitor-count'));

interface PageQuery {
  type: 'page';
  path: string;
}

interface SiteQuery {
  type: 'site';
}

interface RealtimeQuery {
  type: 'realtime';
}

type Query = PageQuery | SiteQuery | RealtimeQuery;

async function handleRequest(reply: FastifyReply, query: Query) {
  try {
    reply.header('Access-Control-Allow-Origin', '*');
    let apiPath;
    if (query.type === 'realtime') {
      apiPath = `/api/v1/stats/realtime/visitors?site_id=${process.env.PLAUSIBLE_SITE_ID}`;
    } else {
      apiPath = `/api/v1/stats/aggregate?site_id=${process.env.PLAUSIBLE_SITE_ID}&metrics=visitors&period=custom&date=2019-01-01,${new Date().toISOString().slice(0, 10)}`;
      if (query.type === 'page') {
        if (query.path.match(/[?&=|;*%]/)) {
          return reply.status(400).send({
            message: 'Invalid path',
            error: 'Bad Request',
            statusCode: 400,
          });
        }
        apiPath += `&${new URLSearchParams({ filters: `event:page==/${query.path}` })}`;
      }
    }
    const response: any = await got.get(new URL(apiPath, process.env.PLAUSIBLE_URL || 'https://plausible.io'), {
      headers: {
        Authorization: `Bearer ${process.env.PLAUSIBLE_API_KEY}`,
      },
    }).json();
    const visitors = query.type === 'realtime' ? response : response.results?.visitors?.value;
    if (!Number.isInteger(visitors)) {
      return reply.status(502).send({
        message: 'Invalid response from Plausible',
        error: 'Bad Gateway',
        statusCode: 502,
      });
    }
    if (query.type === 'realtime') {
      reply.header('Cache-Control', 'public, must-revalidate, max-age=5');
    } else {
      reply.header('Cache-Control', 'public, max-age=300');
    }
    return reply.send({
      statusCode: 200,
      ...query,
      visitors,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(new Date(), e);
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
  return handleRequest(reply, { type: 'page', path });
});

server.get('/api/visitors', async (_, reply) => handleRequest(reply, { type: 'site' }));

server.get('/api/realtime', async (_, reply) => handleRequest(reply, { type: 'realtime' }));

server.listen({
  port: 3000,
  host: process.env.LISTEN_HOST || '0.0.0.0',
});
