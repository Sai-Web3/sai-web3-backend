
const AI = require('../model/AI');
const Ethereum = require('../model/Ethereum');
const Mysql = require("../model/Mysql");
const SBT = require('../model/SBT');

const ai = new AI();
const ethereum = new Ethereum();
const mysql = new Mysql(process.env.DB_HOST, process.env.DB_USER, process.env.DB_PASS, process.env.DB_NAME, 3306);
const sbt = new SBT();

const reduceToMap = (dataes, key, value) => dataes.reduce((acc, cur) => {
  acc[cur[key]] = cur[value];
  return acc;
}, {});

module.exports = {

  index: async (req, res, next) => {
    try {
      const sbt_id = req.query.sbt_id || -1;
      const job_ids = req.body.job_ids || [];

      if(sbt_id == -1) {
        return res.status(200).send({status: true, jobs: []});
      }

      const job_dataes = await mysql.select('SELECT * FROM jobs');
      const jobs = reduceToMap(job_dataes, 'job_id', 'title');

      const sbt_skill_dataes = await mysql.select('SELECT * FROM skill_values WHERE sbt_id = ? ORDER BY value DESC LIMIT ?', [sbt_id, parseInt(process.env.MATCHING_USER_SKILL_LIMIT)]);
      const sbt_skill_ids = sbt_skill_dataes.map(data => data.skill_id);
      let skills = {};

      if(sbt_skill_ids.length > 0) {
        const skill_dataes = await mysql.select('SELECT skill_id,skill_name FROM skills WHERE skill_id IN (?)', [sbt_skill_ids]);
        skills = reduceToMap(skill_dataes, 'skill_id', 'skill_name');
      }

      const job_skill_dataes = await mysql.select('SELECT * FROM job_skills');
      const job_skills = job_skill_dataes.reduce((acc, cur) => {
        if(!(cur.job_id in acc)) {
          acc[cur.job_id] = [];
        }
        acc[cur.job_id].push(cur.skill_id);
        return acc;
      }, {});

      const recommends = ai.matchingJob(sbt_skill_ids, job_skills);

      return res.status(200).send({status: true, recommends: recommends, job_skills: job_skills, jobs: jobs, skills: skills});
    } catch (error) {
      console.error(error);
      return res.status(503).send({ status: false, message: error.message });
    }
  },

  detail: async (req, res, next) => {
    try {
      const id = req.params.id;
      const jobs = await mysql.select('SELECT * FROM jobs WHERE id = ?', [id]);
      return res.status(200).send({status: true, job: jobs.length > 0 ? jobs[0] : []});
    } catch (error) {
      console.error(error);
      return res.status(503).send({ status: false, message: error.message });
    }
  },

  create: async (req, res, next) => {
    try {
      const { sbt_id, title, input_text } = req.body;

      let job_id = await mysql.insert('INSERT INTO jobs (job_id, sbt_id, title, input_text, is_finish_flag) VALUES (0, ?, ?, ?, 0)', [sbt_id, title, input_text]);

      await mysql.update('UPDATE jobs SET job_id = ? WHERE id = ?', [job_id, job_id]);

      // matching
      const result = await ai.analyze(input_text, "1990-1", "2000-1", process.env.ADMIN_ADDRESS)
      let recommend_skills = [];

      const dataes = await mysql.select('SELECT * FROM career_skill_values WHERE career_id = ? ORDER BY value DESC', [result.data.career_id]);
      let index = 0;

      for(let i in dataes) {
        const skill_dataes = await mysql.select('SELECT * FROM skills WHERE skill_id = ? AND skill_type_id = 2', [dataes[i].skill_id]);

        if(skill_dataes.length > 0) {
          recommend_skills.push(dataes[i].skill_id);
          index++;
        }

        if(index >= 10) {
          break;
        }
      }

      return res.status(200).send({status: true, job_id: job_id, recommend_skills: recommend_skills});
    } catch (error) {
      console.error(error);
      return res.status(503).send({ status: false, message: error.message });
    }
  },

  check: async (req, res, next) => {
    try {
      const skills = await mysql.select('SELECT id,skill_id,skill_name FROM skills WHERE skill_type_id = 2');
      return res.status(200).send({status: true, skills: skills});
    } catch (error) {
      console.error(error);
      return res.status(503).send({ status: false, message: error.message });
    }
  },

  update: async (req, res, next) => {
    try {
      const id = req.params.id;
      const { title = "", input_text = "", skill_ids = [] } = req.body;

      if(title || input_text) {
        await mysql.update('UPDATE jobs SET title = ?, input_text = ? WHERE id = ?', [title, input_text, id]);
      }

      if(skill_ids.length > 0) {
        await mysql.delete('DELETE FROM job_skills WHERE job_id = ?', [id]);
        for(let skill_id of skill_ids) {
          await mysql.insert('INSERT INTO job_skills (job_skill_id, job_id, skill_id, name) VALUES (0, ?, ?, "")', [id, skill_id]);
        }
      }

      return res.status(200).send({status: true});
    } catch (error) {
      console.error(error);
      return res.status(503).send({ status: false, message: error.message });
    }
  },

  recommend: async (req, res, next) => {
    try {
      const id = req.params.id;
      const job_skill_dataes = await mysql.select('SELECT skill_id FROM job_skills WHERE job_id = ?', [id]);
      const job_skill_ids = job_skill_dataes.map(data => data.skill_id);
      let skills = {};

      if(job_skill_ids.length > 0) {
        const skill_dataes = await mysql.select('SELECT skill_id,skill_name FROM skills WHERE skill_id IN (?)', [job_skill_ids]);
        skills = reduceToMap(skill_dataes, 'skill_id', 'skill_name');
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
      WHERE ranking <= ?`;

      const sbt_skill_dataes = await mysql.select(sbt_skill_sql, [process.env.MATCHING_USER_SKILL_LIMIT]);
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
        const profile_dataes = await mysql.select('SELECT sbt_id,name FROM profiles WHERE sbt_id IN (?)', [sbt_ids]);
        profiles = reduceToMap(profile_dataes, 'sbt_id', 'name');
      }

      return res.status(200).send({status: true, recommends: recommends, skills: skills, profiles: profiles});
    } catch (error) {
      console.error(error);
      return res.status(503).send({ status: false, message: error.message });
    }
  },

  offer: async (req, res, next) => {
    try {
      const { job_id, sbt_ids = [] } = req.body;

      for(let sbt_id of sbt_ids) {
        const dataes = await mysql.select('SELECT id FROM offers WHERE job_id = ? AND sbt_id = ?', [job_id, sbt_id]);
        if(dataes.length == 0) {
          await mysql.insert('INSERT INTO offers (job_id, sbt_id) VALUES (?, ?)', [job_id, sbt_id]);
        }
      }

      return res.status(200).send({status: true});
    } catch (error) {
      console.error(error);
      return res.status(503).send({ status: false, message: error.message });
    }
  },

  application: async (req, res, next) => {
    try {
      const { sbt_id, job_ids = [] } = req.body;

      for(let job_id of job_ids) {
        const dataes = await mysql.select('SELECT id FROM offers WHERE job_id = ? AND sbt_id = ?', [job_id, sbt_id]);
        if(dataes.length == 0) {
          await mysql.insert('INSERT INTO offers (job_id, sbt_id) VALUES (?, ?)', [job_id, sbt_id]);
        }
      }

      return res.status(200).send({status: true});
    } catch (error) {
      console.error(error);
      return res.status(503).send({ status: false, message: error.message });
    }
  },

};
