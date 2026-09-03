import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mokominoteRouter from "./mokominote";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mokominoteRouter);

export default router;
