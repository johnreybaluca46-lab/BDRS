export function applyCors(req, res) {
    const allowedOrigins = [
        'https://bdrs-a4bd0.web.app', 
        'http://localhost:5173',
        'http://localhost:3000',
        'https://bdrs.vercel.app' // Optional: if accessed directly
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (origin) {
         // Some domains might be preview deployments, for production strictly enforce
         res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
         // No origin (e.g., direct API call), default to production
         res.setHeader('Access-Control-Allow-Origin', 'https://bdrs-a4bd0.web.app');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST, PUT, DELETE, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, X-CSRF-Token, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
}
