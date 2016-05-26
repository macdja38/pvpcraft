/**
 * Created by macdja38 on 2016-05-09.
 */

var url = require('url');

module.exports = class {
    constructor() {
        const http = require('http');

        const hostname = '0.0.0.0';
        const port = 80;

        const server = http.createServer((req, res) => {
            console.log(req.query);
            var url_parts = url.parse(req.url, true);
            console.log(url_parts);
            var query = url_parts.query;
            console.log(query);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Hello World\n');
        });

        server.listen(port, hostname, () => {
            console.log(`Server running at http://${hostname}:${port}/`);
        });
    }
};