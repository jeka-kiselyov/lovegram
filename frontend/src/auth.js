// const Protocol = require('./protocol/Protocol.js');
// require('./thParty.js');

// import Protocol from './protocol/Protocol.js';
// import Offline from './utils/Offline.js';
import User from './state/User.js';
// Don't ask me why

const config = require('./state/Config.js');
const AuthInterface = require('./ui/AuthInterface.js');
const UI = require('./utils/UI.js');
const Icon = require('./ui/icons/Icon.js');
const Button = require('./ui/auth/Button.js');
const UIInput = require('./ui/auth/UIInput.js');
const Checkbox = require('./ui/icons/Checkbox.js');
const EventTarget = require('./utils/EventTarget.js');
const Storage = require('./protocol/Storage.js');
const TGS = require('./utils/TGS.js');

const AvatarPreview = require('./ui/auth/AvatarPreview.js');
import PerfectScrollbar from 'perfect-scrollbar';

const API = require('./protocol/API.js');

class Auth {

    constructor(options) {
        this._config = config;

        this._protocol = new API({app: this});
    	// this._protocol = new Protocol({app: this});
    	this._user = new User({app: this});

    	this._interface = new AuthInterface({user: this._user, app: this});
    	this._interface.render();
	}
}

window.classes = {
	UI: UI,
	Icon: Icon,
    Checkbox: Checkbox,
    Button: Button,
    UIInput: UIInput,
	EventTarget: EventTarget,
	Storage: Storage,
    TGS: TGS,
    AvatarPreview: AvatarPreview,
    PerfectScrollbar: PerfectScrollbar,
};

window.auth = new Auth();

// load mt library and dialogs/messages apps after auth app is initialized
// so we don't load app.js script in parallel
window.onload = function() {
    ['mtp', 'app'].forEach((name)=>{
        const tag = document.createElement("script");
        tag.src = name+".js";
        document.getElementsByTagName("body")[0].appendChild(tag);
    });

    const link = document.createElement("link");
    link.href = "./assets/css/app.css";
    link.type = "text/css";
    link.rel = "stylesheet";
    link.media = "screen,print";

    document.getElementsByTagName("body")[0].appendChild(link);
};
