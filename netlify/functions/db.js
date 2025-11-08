const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('Please set MONGODB_URI env var');

let isConnected = false;
async function connect(){
  if (isConnected) return mongoose;
  await mongoose.connect(MONGODB_URI);
  isConnected = true;
  return mongoose;
}

function getModels(){
  try {
    return { Visitor: mongoose.model('Visitor'), VisitEvent: mongoose.model('VisitEvent') };
  } catch(e) {}
  const visitorSchema = new mongoose.Schema({
    visitorId: { type: String, required: true, unique: true },
    firstVisit: Date,
    lastVisit: Date,
    visitCount: { type: Number, default: 0 },
    userAgent: String,
    lastPath: String
  }, { timestamps: true });

  const visitEventSchema = new mongoose.Schema({
    visitorId: { type: String, required: true },
    timestamp: { type: Date, required: true },
    isReturning: { type: Boolean, required: true },
    pagePath: String,
    pageTitle: String,
    userAgent: String,
    referrer: String
  }, { timestamps: true });

  const Visitor = mongoose.model('Visitor', visitorSchema);
  const VisitEvent = mongoose.model('VisitEvent', visitEventSchema);
  return { Visitor, VisitEvent };
}

module.exports = { connect, getModels };