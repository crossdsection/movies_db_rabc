'use strict';

const Hapi = require('@hapi/hapi');
const Routes = require('./controllers/index');
const Mongoose = require('mongoose');
const config = require('./config');

const init = async () => {

    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    await Mongoose.connect(config.dbURL);

    server.route(Routes);

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();