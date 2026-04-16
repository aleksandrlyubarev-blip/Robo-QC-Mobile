import { Router, type IRouter } from "express";
import healthRouter from "./health";
import specRouter from "./spec";
import inspectionRouter from "./inspection";
import reportRouter from "./report";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/specs", specRouter);
router.use("/inspections", inspectionRouter);
router.use("/reports", reportRouter);

export default router;
