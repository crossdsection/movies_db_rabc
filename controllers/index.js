const MovieController = require('./movies');

const routes = [];
function addToRoutes(controller) {
    for( const route of controller ) {
        routes.push(route);
    }
}
addToRoutes(MovieController);

module.exports = routes;