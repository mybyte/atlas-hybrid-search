import { baseRouter } from "../../../middleware/router";

const router = baseRouter.clone();
// Handle /api/embed/model route
router.get(async (req, res) => {
    res.status(200).json({
        provider: req.model.provider,
        model:req.model.model,
        dimensions: req.model.dimensions,
    });
});

export default router.handler();