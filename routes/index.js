const Router = require('express-promise-router');
const router = Router();

const AiController = require('../controller/AiController');
const SbtController = require('../controller/SbtController');

router.get('/healthcheck', healthcheck);

router.get('/sbt/balance/:address', SbtController.balance);
router.get('/sbt/detail/:sbt_id', SbtController.detail);
router.get('/sbt/account/:address', SbtController.account);
router.post('/sbt/search', SbtController.search);
router.post('/sbt/mint_parameter', SbtController.mint_parameter);

router.post('/ai/analysis', AiController.analysis);

function healthcheck(req, res, next) {
	return res.sendStatus(200);
}


module.exports = router;

