import { Application, oakCors } from "../deps.ts";
import { makeTodayFormat } from "../shared/tools.ts";
import patients_router from "./patients_router.ts";
import alerts_router from "./alerts_router.ts";
import rounds_router from "./rounds_router.ts";

const PORT = 8000;

const app = new Application();
const patientRouter = patients_router();
const alertRouter = alerts_router();
const roundRouter = rounds_router();

app.use(oakCors());
app.use(patientRouter.routes());
app.use(alertRouter.routes());
app.use(roundRouter.routes());

console.log(makeTodayFormat());
console.log(`Starting server at http://localhost:${PORT}/`);
console.log("Quit the server with CONTROL-C.");
app.listen({ port: PORT });
