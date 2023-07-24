const Router = require('express-promise-router');
const router = Router();

const AiController = require('../controller/AiController');
const SbtController = require('../controller/SbtController');
const JobController = require('../controller/JobController');

router.get('/healthcheck', healthcheck);

router.get('/sbt/balance/:address', SbtController.balance);
router.get('/sbt/detail/:sbt_id', SbtController.detail);
router.get('/sbt/account/:address', SbtController.account);
router.post('/sbt/search', SbtController.search);
router.post('/sbt/profile/update/:sbt_id', SbtController.updateProfile);

router.post('/ai/analysis', AiController.analysis);

router.get('/job', JobController.index);
router.get('/job/detail/:id', JobController.detail);
router.post('/job/create', JobController.create);
router.get('/job/check/:id', JobController.check);
router.post('/job/update/:id', JobController.update);
router.get('/job/recommend/:id', JobController.recommend);
router.post('/job/offer', JobController.offer);
router.post('/job/application', JobController.application);


function healthcheck(req, res, next) {
	return res.sendStatus(200);
}


module.exports = router;

