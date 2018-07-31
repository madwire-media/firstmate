import * as Koa from "koa";
import * as compression from "koa-compress";
import * as logger from "koa-logger";
import * as router from "koa-router";

const app = new Koa();
const routes = new router();

routes
    .get("/", (ctx) => {
        ctx.body = "(⌐■_■) #Yeeeaaahhh Booooooy!!!!!!!";
    });

export const port: number = (process.env.PORT && +process.env.PORT) || 3000;
app.use(logger());
app.use(compression());
app.use(routes.routes());

export default app;
