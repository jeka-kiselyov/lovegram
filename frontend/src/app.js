const AppInterface = require('./ui/AppInterface.js');
const Router = require('./utils/Router.js');
// const TestRunner = require('./tests/TestRunner.js');

class App {
    constructor(options) {

    	// new App(); should be called after new Auth(), so we can take some classes for it without including them again
    	this._user = auth._user;
        this._config = auth._config;
    	this._initialized = false;

        this._user.on('state',(state)=>{
            if (state == 'online' && !this._initialized) {
                this.init();
            }
        });

    	if (this._user._state == 'online') {
    		this.init();
    	}

        this._router = new Router();
        this._router.on('peerId', (peerId)=>{
            if (this._user._state == 'online') {
                // alert(peerId);
                this._interface.goTo({
                    peerId: peerId,
                });
            }
        });
	}

    get config() {
        return this._config;
    }

	init() {
		this._initialized = true;

    	this._interface = new AppInterface({user: this._user, app: this});
        this._interface.init();

    	// this._interface.render();
	}
}

window.app = new App();
