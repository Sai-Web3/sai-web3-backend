const Ethereum = require('../model/Ethereum');
const Mysql = require("../model/Mysql");
const SBT = require('../model/SBT');

const ethereum = new Ethereum();
const mysql = new Mysql(process.env.DB_HOST, process.env.DB_USER, process.env.DB_PASS, process.env.DB_NAME, 3306);
const sbt = new SBT();

module.exports = {

  balance: async (req, res, next) => {
    try {
      const address = req.params.address;
      const data = await mysql.select('SELECT sbt_id FROM sbts WHERE wallet_address = ?', [address]);
      return res.status(200).send({status: true, sbt_id: data.length > 0 ? data[0].sbt_id : -1});
    } catch (error) {
      console.error(error);
      return res.status(503).send({ status: false, message: error.message });
    }
  },

  detail: async (req, res, next) => {
    try {
      const sbt_id = req.params.sbt_id;

      const [sbt_data, profiles, skill_value_data, register_jobs, application_offers] = await Promise.all([
        mysql.select('SELECT wallet_address FROM sbts WHERE sbt_id = ?', [sbt_id]),
        mysql.select('SELECT name, comment FROM profiles WHERE sbt_id = ?', [sbt_id]),
        mysql.select('SELECT skills.skill_name, skills.skill_type_id, skill_values.value, skills.description FROM skill_values INNER JOIN skills ON skill_values.skill_id = skills.skill_id WHERE skill_values.sbt_id = ? ORDER BY skill_values.value DESC', [sbt_id]),
        mysql.select('SELECT * FROM jobs WHERE sbt_id = ?', [sbt_id]),
        mysql.select('SELECT * FROM offers WHERE sbt_id = ?', [sbt_id])
      ]);

      const register_job_ids = register_jobs.map(job => job.id);
      const application_offer_ids = application_offers.map(offer => offer.job_id);

      const [application_jobs, offer_sbts] = await Promise.all([
        application_offer_ids.length > 0 ? mysql.select('SELECT * FROM jobs WHERE job_id IN (?)', [application_offer_ids]) : [],
        register_job_ids.length > 0 ? mysql.select('SELECT sbt_id FROM offers WHERE job_id IN (?)', [register_job_ids]) : []
      ]);

      return res.status(200).send({
        status: true,
        name: "Sai SBT",
        description: "Visualize Your Skill for New Era.",
        image: process.env.APP_URL+"/img/sbt.92f29dce.gif",
        owner: sbt_data[0].wallet_address,
        data: skill_value_data,
        register_jobs: register_jobs,
        application_jobs: application_jobs,
        offer_sbts: offer_sbts,
        profile: {
          name: profiles.length > 0 ? profiles[0].name: "",
          comment: profiles.length > 0 ? profiles[0].comment: "",
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(503).send({ status: false, message: error.message });
    }
  },

  account: async (req, res, next) => {
    try {
      const address = req.params.address;
      const sbt_data = await mysql.select('SELECT sbt_id FROM sbts WHERE wallet_address = ?', [address]);

      if(sbt_data.length == 0) {
        return res.status(200).send({status: true, sbt_id: -1, data: []});
      }

      const skill_value_data = await mysql.select('SELECT skills.skill_name, skill_values.value FROM skill_values INNER JOIN skills ON skill_values.skill_id = skills.skill_id WHERE skill_values.sbt_id = ? ORDER BY skill_values.value DESC', [sbt_data[0].sbt_id]);
      return res.status(200).send({status: true, sbt_id: sbt_data[0].sbt_id, data: skill_value_data});

    } catch (error) {
      console.error(error);
      return res.status(503).send({ status: false, message: error.message });
    }
  },

  search: async (req, res, next) => {
    try {
      const skill_name = req.body.skill_name;

      if(!skill_name) {
        const sbt_data = await mysql.select('SELECT sbt_id FROM sbts');
        return res.status(200).send({status: true, data: sbt_data});
      }

      const [skill_data, skill_value_data] = await Promise.all([
        mysql.select('SELECT skill_id FROM skills WHERE skill_name = ?', [skill_name]),
        mysql.select('SELECT sbt_id FROM skill_values WHERE skill_id = ? AND value > 0', [sbt_id])
      ]);

      return res.status(200).send({status: true, data: skill_value_data});
    } catch (error) {
      console.error(error);
      return res.status(503).send({ status: false, message: error.message });
    }
  },

  updateProfile: async (req, res, next) => {
    try {
      const sbt_id = req.body.sbt_id;
      const name = req.body.name;
      const comment = req.body.comment;

      const dataes = await mysql.select('SELECT wallet_address FROM sbts WHERE sbt_id = ?', [sbt_id]);

      if(dataes.length == 0) {
        return res.status(200).send({status: true});
      }

      const profiles = await mysql.select('SELECT * FROM profiles WHERE sbt_id = ? AND wallet_address = ?', [sbt_id, dataes[0].wallet_address]);

      if(profiles.length > 0) {
        await mysql.update('UPDATE profiles SET name = ?, comment = ? WHERE sbt_id = ? AND wallet_address = ?', [name, comment, sbt_id, dataes[0].wallet_address]);
      } else {
        await mysql.insert('INSERT INTO profiles (sbt_id, name, comment, wallet_address) VALUES (?, ?, ?, ?)', [sbt_id, name, comment, dataes[0].wallet_address]);
      }

      return res.status(200).send({status: true});
    } catch (error) {
      console.error(error);
      return res.status(503).send({ status: false, message: error.message });
    }
  },

};
