const { connect, getModels } = require('./db');

exports.handler = async (event) => {
  // optional simple auth: pass ?secret=MYSECRET where MYSECRET is set in env STATS_SECRET
  const qs = event.queryStringParameters || {};
  const requiredSecret = process.env.STATS_SECRET;
  if (requiredSecret && qs.secret !== requiredSecret) {
    return { statusCode: 401, body: JSON.stringify({ ok:false, error:'unauthorized' }) };
  }

  const start = qs.start ? new Date(qs.start) : null;
  const end = qs.end ? new Date(qs.end) : new Date();

  try{
    await connect();
    const { VisitEvent } = getModels();
    const match = {};
    if (start && end) match.timestamp = { $gte: start, $lte: end };
    else if (start) match.timestamp = { $gte: start };
    else if (end) match.timestamp = { $lte: end };

    const agg = await VisitEvent.aggregate([
      { $match: match },
      { $group: { _id: '$isReturning', count: { $sum: 1 } } }
    ]).exec();

    let returning = 0, fresh = 0;
    agg.forEach(r => { if (r._id === true) returning = r.count; else fresh = r.count; });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        start: start ? start.toISOString() : null,
        end: end ? end.toISOString() : null,
        newVisits: fresh,
        returningVisits: returning,
        totalEvents: fresh + returning
      })
    };
  } catch(err){
    console.error('get-stats error', err);
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};