// Enable source maps
import "source-map-support/register";

import * as errorHandler from "koa-error";

import { default as app, port } from "./app";

if (process.env.NODE_ENV === "development") {
    app.use(errorHandler());
}

const server = app.listen(port, () => {
    // tslint:disable:no-console
    console.log(`  Node.js Koa TS server launched and listening on port ${port}`);
    console.log(`  Press Ctrl+C to stop`);
    console.log();
});

export default server;
