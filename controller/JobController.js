
const AI = require('../model/AI');
const Ethereum = require('../model/Ethereum');
const Mysql = require("../model/Mysql");
const SBT = require('../model/SBT');

const ai = new AI();
const ethereum = new Ethereum();
const mysql = new Mysql(process.env.DB_HOST, process.env.DB_USER, process.env.DB_PASS, process.env.DB_NAME, 3306);
const sbt = new SBT();

module.exports = {

  index: async (req, res, next) => {

    const job_ids = req.body.job_ids || [];
    let jobs = [];

    if(job_ids.length > 0) {
      let sql = 'SELECT * FROM jobs WHERE id IN ('+job_ids.join(",")+') ORDER BY id DESC';
      jobs = await mysql.select(sql);
    } else {
      let sql = 'SELECT * FROM jobs ORDER BY id DESC';
      jobs = await mysql.select(sql);
    }

    return res.status(200).send(JSON.stringify({status: true, jobs: jobs}));
  },

  detail: async (req, res, next) => {

    const id = req.params.id;
    let sql = 'SELECT * FROM jobs WHERE id = '+id;
    let jobs = await mysql.select(sql);
    return res.status(200).send(JSON.stringify({status: true, job: jobs.length > 0 ? jobs[0] : []}));
  },

  create: async (req, res, next) => {

    const sbt_id = req.body.sbt_id;
    const title = req.body.title;
    const input_text = req.body.input_text;

    const id = req.params.id;
    let sql = 'INSERT INTO jobs (job_id, sbt_id, title, input_text, is_finish_flag) VALUES (0, '+sbt_id+', "'+title+'", "'+input_text+'", 0)';
    let job_id = await mysql.insert(sql);

    sql = 'UPDATE jobs SET job_id = '+job_id+' WHERE id = '+job_id;
    await mysql.update(sql);

    // matching
    // insert job_skills

    sql = 'SELECT * FROM skills WHERE skill_type_id = 2';
    const skills = await mysql.select(sql);

    return res.status(200).send(JSON.stringify({status: true, job_id: job_id}));

  },

  check: async (req, res, next) => {

    const id = req.params.id;
    const sql = 'SELECT id,skill_id,skill_name FROM skills WHERE skill_type_id = 2';
    const skills = await mysql.select(sql);

    return res.status(200).send(JSON.stringify({status: true, skills: skills}));

  },

  update: async (req, res, next) => {

    const id = req.params.id;
    const title = req.body.title ?? ""; 
    const input_text = req.body.input_text ?? "";
    const skill_ids = req.body.skill_ids ?? [];

    if(title || input_text) {
      let sql = 'UPDATE jobs SET title = "'+title+'", input_text = "'+input_text+'" WHERE id = '+id;
      await mysql.update(sql);
    }

    if(skill_ids.length > 0) {
      let sql = 'DELETE FROM job_skills WHERE job_id = '+id;
      await mysql.delete(sql);
      for(let index in skill_ids) {
        sql = 'INSERT INTO job_skills (job_skill_id, job_id, skill_id, name) VALUES (0, '+id+', '+skill_ids[index]+', "")';
        await mysql.insert(sql);
      }
    }

    // recommend
    let recommends = [];

    return res.status(200).send(JSON.stringify({status: true, recommends: recommends}));
  },

  offer: async (req, res, next) => {

    const job_id = req.body.job_id;
    const sbt_ids = req.body.sbt_ids ?? [];

    if(sbt_ids.length > 0) {
      for(let index in sbt_ids) {
        let sql = 'SELECT id FROM offers WHERE job_id = '+job_id+' AND sbt_id = '+sbt_ids[index];
        const dataes = await mysql.select(sql);
        if(dataes.length == 0) {
          sql = 'INSERT INTO offers (job_id, sbt_id) VALUES ('+job_id+', '+sbt_ids[index]+')';
          await mysql.insert(sql);
        }
      }
    }

    return res.status(200).send(JSON.stringify({status: true}));
  },

  application: async (req, res, next) => {

    const sbt_id = req.body.sbt_id;
    const job_ids = req.body.job_ids || [];

    // 自分が登録したjobに応募できないように

    if(sbt_id && job_ids.length > 0) {
      for(let index in job_ids) {
        let sql = 'SELECT id FROM offers WHERE job_id = '+job_ids[index]+' AND sbt_id = '+sbt_id;
        const dataes = await mysql.select(sql);
        if(dataes.length == 0) {
          sql = 'INSERT INTO offers (job_id, sbt_id) VALUES ('+job_ids[index]+', '+sbt_id+')';
          await mysql.insert(sql);
        }
      }
    }

    return res.status(200).send(JSON.stringify({status: true}));
  },



};
