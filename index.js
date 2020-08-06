const express = require('express');
const cors = require('cors');
const app = express();
const fetch = require('node-fetch');
const readline = require('readline');
const url = require("url").URL;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

const port = 3001;

class APICache {
    constructor(_url, _expiryMs) {
        this.url = _url;
        this.cachedResponse = undefined;
        this.expiry = _expiryMs;
        this.lastRequest = 0;
    }

    async getData(force = false) {
        if (Date.now() - this.lastRequest < this.expiry && !force) {
            return Promise.resolve(this.cachedResponse);
        } else {
            const response = await fetch(this.url);
            const output = await response.json();
            this.cachedResponse = output;
            this.lastRequest = Date.now();
            return output;
        }
    }

    nextRefresh() {
        const difference = this.expiry - (Date.now() - this.lastRequest);
        return difference <= 0 ? 0 : difference;
    }

    get path() {
        const url = new URL(this.url);
        const pathname = url.pathname;
        const domain = url.host.split('.').slice(-2,-1);
        return `/${domain}${pathname}`;
    }
}

const cache = new APICache("https://api.github.com/users/josiaspiri/repos", 60000);

app.use(cors());
app.listen(port);

app.get(cache.path, (req, res) => {
    cache.getData(false).then(res.send.bind(res))
});

rl.on('line', line => {
    switch (line) {
        case "exit":
            app.close();
            rl.close();
            break;
        case "info":
            console.log(`Next refresh in: ${cache.nextRefresh()}ms.`);
            break;
        case "update":
            cache.getData(true).then(console.log)
            break;
    }
});