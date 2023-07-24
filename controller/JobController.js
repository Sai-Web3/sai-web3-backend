
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

    const sbt_id = req.query.sbt_id || -1;
    const job_ids = req.body.job_ids || [];

    if(sbt_id == -1) {
      return res.status(200).send(JSON.stringify({status: true, jobs: []}));
    }

    const job_sql = 'SELECT * FROM jobs';
    const job_dataes = await mysql.select(job_sql);
    const jobs = job_dataes.reduce((acc, cur) => {
      acc[cur.job_id] = cur.title;
      return acc;
    }, {});

    const sbt_skill_sql = 'SELECT * FROM skill_values WHERE sbt_id = '+sbt_id+' ORDER BY value DESC LIMIT '+process.env.MATCHING_USER_SKILL_LIMIT;
    const sbt_skill_dataes = await mysql.select(sbt_skill_sql);
    const sbt_skill_ids = sbt_skill_dataes.map(data => data.skill_id);
    let skills = {};

    if(sbt_skill_ids.length > 0) {
      const skill_sql = 'SELECT skill_id,skill_name FROM skills WHERE skill_id IN ('+sbt_skill_ids.join(",")+')';
      const skill_dataes = await mysql.select(skill_sql);
      skills = skill_dataes.reduce((acc, cur) => {
        acc[cur.skill_id] = cur.skill_name;
        return acc;
      }, {});
    }

    const job_skill_sql = 'SELECT * FROM job_skills';
    const job_skill_dataes = await mysql.select(job_skill_sql);
    const job_skills = job_skill_dataes.reduce((acc, cur) => {
      if(!(cur.job_id in acc)) {
        acc[cur.job_id] = [];
      }
      acc[cur.job_id].push(cur.skill_id);
      return acc;
    }, {});

    const recommends = ai.matchingJob(sbt_skill_ids, job_skills);

    return res.status(200).send(JSON.stringify({status: true, recommends: recommends, job_skills: job_skills, jobs: jobs, skills: skills}));
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
    const result = await ai.analyze(input_text, "1990-1", "2000-1", process.env.ADMIN_ADDRESS)
    let recommend_skills = [];

    sql = 'SELECT * FROM career_skill_values WHERE career_id = '+result.data.career_id+' ORDER BY value DESC';
    let dataes = await mysql.select(sql);
    let index = 0;

    for(let i in dataes) {

      sql = 'SELECT * FROM skills WHERE skill_id = '+dataes[i].skill_id+' AND skill_type_id = 2';
      const skill_dataes = await mysql.select(sql);

      if(skill_dataes.length > 0) {
        recommend_skills.push(dataes[i].skill_id);
        index++;
      }

      if(index >= 10) {
        break;
      }
    }

    return res.status(200).send(JSON.stringify({status: true, job_id: job_id, recommend_skills: recommend_skills}));

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

    return res.status(200).send(JSON.stringify({status: true}));
  },

  recommend: async (req, res, next) => {

    const id = req.params.id;
    const job_skill_sql = 'SELECT skill_id FROM job_skills WHERE job_id = '+id;
    const job_skill_dataes = await mysql.select(job_skill_sql);
    const job_skill_ids = job_skill_dataes.map(data => data.skill_id);
    let skills = {};

    if(job_skill_ids.length > 0) {
      const skill_sql = 'SELECT skill_id,skill_name FROM skills WHERE skill_id IN ('+job_skill_ids.join(",")+')';
      const skill_dataes = await mysql.select(skill_sql);
      skills = skill_dataes.reduce((acc, cur) => {
        acc[cur.skill_id] = cur.skill_name;
        return acc;
      }, {});
    }

    const sbt_skill_sql = `WITH ranked_skill_values AS (
      SELECT 
        sbt_id, 
        skill_id, 
        value,
        ROW_NUMBER() OVER (
          PARTITION BY sbt_id 
          ORDER BY value DESC
        ) AS ranking
      FROM hackathon.skill_values
    )
    SELECT 
      sbt_id, 
      skill_id, 
      value
    FROM ranked_skill_values
    WHERE ranking <= ${process.env.MATCHING_USER_SKILL_LIMIT};
    `;

    const sbt_skill_dataes = await mysql.select(sbt_skill_sql);
    const sbt_skills = sbt_skill_dataes.reduce((acc, cur) => {
      if(!(cur.sbt_id in acc)) {
        acc[cur.sbt_id] = [];
      }
      acc[cur.sbt_id].push(cur.skill_id);
      return acc;
    }, {});

    const recommends = ai.matchingBuddy(job_skill_ids, sbt_skills);
    const sbt_ids = recommends.map(data => data.sbt_id);
    let profiles = {};

    if(sbt_ids.length > 0) {
      const profile_sql = 'SELECT sbt_id,name FROM profiles WHERE sbt_id IN ('+sbt_ids.join(",")+')';
      const profile_dataes = await mysql.select(profile_sql);
      profiles = profile_dataes.reduce((acc, cur) => {
        acc[cur.sbt_id] = cur.name;
        return acc;
      }, {});
    }

    return res.status(200).send(JSON.stringify({status: true, recommends: recommends, skills: skills, profiles: profiles}));
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
