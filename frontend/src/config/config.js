module.exports = {
	debug: true, 		// show debug messages in console
	appId: 1015231,		// TG API app ID
	appHash: 'a2848ae779266495f3cd3803f81d91e9',
	defaultDC: 2,
	keepNotDefaultNetworkers: true, // keep all networkers in state. Faster after page reload, but may be errors in protocol
	persistState: true, // persist session state between page loads
	test: false,		// connect to test tg network
	ssl: true,			// connect to ssl tg servers
	websockets: true,	// use websockets (true) or http/s requests (false). Keep it to true if using service worker.
	poll: false,			// enable poll for state difference, better to switch off when debuging other parts
	pollInterval: 2000, // poll interval in ms,
	persistMediaCache: true, // keep media cached between browser sessions
	persistServiceWorkerCache: true, // cache scripts and styles between sessions
	maxParallelConnections: 3, /// Count of websocket connections to media servers,
};