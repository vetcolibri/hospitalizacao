import { Application, oakCors } from "../deps.ts";
import { makeTodayFormat } from "../shared/tools.ts";
import routers from "./routers.ts";

const PORT = 8000;

const app = new Application();
const patientRouter = routers();
app.use(oakCors());
app.use(patientRouter.routes());

console.log(makeTodayFormat());
console.log(`Starting server at http://localhost:${PORT}/`);
console.log("Quit the server with CONTROL-C.");
app.listen({ port: PORT });
