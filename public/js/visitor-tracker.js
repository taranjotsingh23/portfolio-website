(function () {
  const VISITOR_KEY = 'portfolio_visitor_v1';
  const COOKIE_NAME = 'portfolio_vid';
  const COOKIE_EXPIRE_DAYS = 3650; // 10 years
  const ENDPOINT = '/.netlify/functions/collect-visitor';

  function nowISO(){ return new Date().toISOString(); }
  function daysBetween(a,b){ return Math.round(Math.abs((new Date(b)-new Date(a)) / (1000*60*60*24))); }
  function generateId(){
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'vid-' + Math.random().toString(36).slice(2,10) + '-' + Date.now().toString(36);
  }
  function setCookie(name, value, days){
    const d = new Date(); d.setTime(d.getTime() + (days*24*60*60*1000));
    document.cookie = name + "=" + encodeURIComponent(value) + ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
  }
  function getCookie(name){
    const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return v ? decodeURIComponent(v.pop()) : null;
  }

  function loadVisitor(){
    try {
      const raw = localStorage.getItem(VISITOR_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e){}
    const c = getCookie(COOKIE_NAME);
    if (c) return { visitorId: c };
    return null;
  }
  function saveVisitor(data){
    try { localStorage.setItem(VISITOR_KEY, JSON.stringify(data)); }
    catch(e){ setCookie(COOKIE_NAME, data.visitorId, COOKIE_EXPIRE_DAYS); }
  }

  async function sendToServer(payload){
    try{
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
    }catch(err){
      // network blocked / offline -> ignore silently
      console.warn('analytics send failed', err);
    }
  }

  function recordVisit(opts = {}){
    const now = nowISO();
    let v = loadVisitor();
    if (!v || !v.visitorId){
      v = {
        visitorId: generateId(),
        firstVisit: now,
        lastVisit: now,
        visitCount: 1,
        isReturning: false
      };
    } else {
      v.firstVisit = v.firstVisit || now;
      v.visitCount = (typeof v.visitCount === 'number' ? v.visitCount : 0) + 1;
      v.isReturning = true;
      v.daysSinceLastVisit = v.lastVisit ? daysBetween(v.lastVisit, now) : null;
      v.lastVisit = now;
    }

    v.lastPath = opts.pagePath || location.pathname;
    v.userAgent = navigator.userAgent || null;
    saveVisitor(v);

    const payload = {
      visitorId: v.visitorId,
      firstVisit: v.firstVisit,
      lastVisit: v.lastVisit,
      visitCount: v.visitCount,
      isReturning: v.isReturning,
      pagePath: v.lastPath,
      pageTitle: opts.pageTitle || document.title,
      userAgent: v.userAgent,
      referrer: document.referrer || null,
      timestamp: now
    };

    // non-blocking send
    sendToServer(payload);
    return v;
  }

  // Auto-run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => recordVisit({ send: true }));
  } else recordVisit({ send: true });

  // Expose for SPA route changes
  window.__PortfolioAnalytics = { recordVisit };
})();