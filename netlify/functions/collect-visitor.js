const { connect, getModels } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  let payload;
  try { payload = JSON.parse(event.body); } catch(e){ return { statusCode: 400, body: 'Invalid JSON' }; }

  const { visitorId, firstVisit, lastVisit, visitCount, isReturning, pagePath, pageTitle, userAgent, referrer, timestamp } = payload;
  if (!visitorId || !timestamp) return { statusCode: 400, body: 'visitorId and timestamp required' };

  try{
    await connect();
    const { Visitor, VisitEvent } = getModels();

    // Upsert visitor (atomic-ish)
    await Visitor.findOneAndUpdate(
      { visitorId },
      {
        $min: { firstVisit: new Date(firstVisit || timestamp) },
        $max: { lastVisit: new Date(lastVisit || timestamp) },
        $inc: { visitCount: typeof visitCount === 'number' ? visitCount - 0 : 1 },
        $set: { userAgent: userAgent || null, lastPath: pagePath || null }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();

    const ev = new VisitEvent({
      visitorId,
      timestamp: new Date(timestamp),
      isReturning: !!isReturning,
      pagePath: pagePath || null,
      pageTitle: pageTitle || null,
      userAgent: userAgent || null,
      referrer: referrer || null
    });
    await ev.save();

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch(err){
    console.error('collect error', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};