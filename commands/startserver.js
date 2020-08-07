const { Program, Command } = require('lovacli');

const Server = require('../server/Server.js');

class Handler extends Command {
    setup(progCommand) {
        progCommand.description('Start the server');
    }

    async handle(args, options, logger) {
        let settings = {};
        try {
            settings = require('../settings/settings.js');
        } catch(e) {
            logger.error("Can not load settings from settings/settings.js");
            settings = {};
        };

        let serverOptions = settings.server || {};
        serverOptions.logger = logger;

        serverOptions.beforeInit = (fastify)=>{
            fastify.register(require('fastify-compress'), { global: false });
        };

        let server = new Server(serverOptions); 
        try {
            await server.init();
        } catch(e) {
            console.log(e);
        }    
    }
};

module.exports = Handler;