class Offline {
	constructor() {
	}

	/**
	 * Clean up promises in service worker. Required for FF to work
	 * @return {[type]} [description]
	 */
	static async clean(persistMediaCache) {
		const cacheName = 'webogram-0.0.1';
		console.error("Clean SW");

		if (!persistMediaCache) {
			await caches.delete(cacheName);
		}


		/// below we are cleaning sw promises. This is required (for FF)
		let sw = Offline.sw;
		if (!sw && navigator.serviceWorker.controller) {
			sw = navigator.serviceWorker.controller;
		}
		if (!sw) {
			let registrations = await navigator.serviceWorker.getRegistrations();
			if (registrations[0]) {
				sw = registrations[0].active;
			} else {
				console.warn(registrations);
			}
		}
		if (sw) {
			sw.postMessage({ command: 'clean' });
		}
	}


	static async fulfillStream(documentId, partN) {
		let sw = Offline.sw;
		if (!sw && navigator.serviceWorker.controller) {
			sw = navigator.serviceWorker.controller;
		}
		if (!sw) {
			let registrations = await navigator.serviceWorker.getRegistrations();
			if (registrations[0]) {
				sw = registrations[0].active;
			} else {
				console.warn(registrations);
			}
		}
		if (sw) {
			sw.postMessage({ command: 'fulfill', documentId: documentId, partN: partN });
		}
	}

	/**
	 * Register service worker if it's not yet registered
	 * @return {[type]} [description]
	 */
	static register(params) {
		let persistMediaCache = false;
		if (params && params.config && params.config.get('persistMediaCache')) {
			persistMediaCache = true;
		}

        Offline.clean(persistMediaCache);

		if('serviceWorker' in navigator) {
		  navigator.serviceWorker.register('./sw.js?2', { scope: Offline.getScope() })
		    .then(function(registration) {
		    	Offline.sw = registration.active;
		    	console.log(registration);
		        console.log('Service Worker Registered');

		        Offline.clean(persistMediaCache);
		    }, /*catch*/ function(error) {
				console.log('Service worker registration failed:', error);
			});
		}
	}

	static unregister() {
		if('serviceWorker' in navigator) {
			navigator.serviceWorker.getRegistrations().then(function(registrations) {
				for (let registration of registrations) {
					registration.unregister();
				}
			});
		}
	}
};

module.exports = Offline;
