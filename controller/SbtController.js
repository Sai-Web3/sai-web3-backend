
const Ethereum = require('../model/Ethereum');
const Mysql = require("../model/Mysql");
const SBT = require('../model/SBT');

const ethereum = new Ethereum();
const mysql = new Mysql(process.env.DB_HOST, process.env.DB_USER, process.env.DB_PASS, process.env.DB_NAME, 3306);
const sbt = new SBT();

module.exports = {

	// SBT残高
  balance: async (req, res, next) => {
    const address = req.params.address;
    const sql = 'SELECT sbt_id FROM sbts WHERE wallet_address = "'+address+'"';
    const data = await mysql.select(sql);
    return res.status(200).send(JSON.stringify({status: true, sbt_id: data.length > 0 ? data[0].sbt_id : -1}));
  },
 
	// SBT詳細
  detail: async (req, res, next) => {

    const sbt_id = req.params.sbt_id;

    const sbt_sql = 'SELECT wallet_address FROM sbts WHERE sbt_id = '+sbt_id;
    const sbt_data = await mysql.select(sbt_sql);

    const profile_sql = 'SELECT name, comment FROM profiles WHERE sbt_id = '+sbt_id;
    const profiles = await mysql.select(profile_sql);

    const skill_value_sql = 'SELECT skills.skill_name, skills.skill_type_id, skill_values.value, skills.description FROM skill_values INNER JOIN skills ON skill_values.skill_id = skills.skill_id WHERE skill_values.sbt_id = '+sbt_id+' ORDER BY skill_values.value DESC;';
    const skill_value_data = await mysql.select(skill_value_sql);

    const job_sql = 'SELECT * FROM jobs WHERE sbt_id = '+sbt_id;
    const register_jobs = await mysql.select(job_sql);
    let register_job_ids = [];

    if(register_jobs.length > 0) {
      for(let index in register_jobs) {
        register_job_ids.push(register_jobs[index].id);
      }
    }

    const application_offer_sql = 'SELECT * FROM offers WHERE sbt_id = '+sbt_id;
    const application_offers = await mysql.select(application_offer_sql);
    let application_offer_ids = [];

    if(application_offers.length > 0) {
      for(let index in application_offers) {
        application_offer_ids.push(application_offers[index].job_id);
      }
    }

    let application_jobs = [];
    if(application_offer_ids.length > 0) {
      const application_job_sql = 'SELECT * FROM jobs WHERE job_id IN ('+application_offer_ids.join(",")+')';
      application_jobs = await mysql.select(application_job_sql);
    }

    let offer_sbts = [];
    if(register_job_ids.length > 0) {
      const offer_sbt_sql = 'SELECT sbt_id FROM offers WHERE job_id IN ('+register_job_ids.join(",")+')';
      offer_sbts = await mysql.select(offer_sbt_sql);
    }

    return res.status(200).send(JSON.stringify({
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
    }));
  },
 
  // SBT詳細
  account: async (req, res, next) => {
    const address = req.params.address;
    const sbt_sql = 'SELECT sbt_id FROM sbts WHERE wallet_address = "'+address+'";';
    const sbt_data = await mysql.select(sbt_sql);

    if(sbt_data.length == 0) {
      return res.status(200).send(JSON.stringify({status: true, sbt_id: -1, data: []}));
    }

    const skill_value_sql = 'SELECT skills.skill_name, skill_values.value FROM skill_values INNER JOIN skills ON skill_values.skill_id = skills.skill_id WHERE skill_values.sbt_id = '+sbt_data[0].sbt_id+' ORDER BY skill_values.value DESC;';
    const skill_value_data = await mysql.select(skill_value_sql);
    return res.status(200).send(JSON.stringify({status: true, sbt_id: sbt_data[0].sbt_id, data: skill_value_data}));
  },

  // SBT検索
  search: async (req, res, next) => {
    const skill_name = req.body.skill_name;

    if(!skill_name) {
      const sbt_sql = 'SELECT sbt_id FROM sbts';
      const sbt_data = await mysql.select(sbt_sql);
      return res.status(200).send(JSON.stringify({status: true, data: sbt_data}));
    }

    const skill_sql = 'SELECT skill_id FROM skills WHERE skill_name = "'+skill_name+'";';
    const skill_data = await mysql.select(skill_sql);
    const skill_value_sql = 'SELECT sbt_id FROM skill_values WHERE skill_id = '+sbt_id+' AND value > 0;';
    const skill_value_data = await mysql.select(skill_value_sql);
    return res.status(200).send(JSON.stringify({status: true, data: skill_value_data}));
  }, 

  // Mint data
  mint_parameter: async (req, res, next) => {
    const address = req.body.address;
    const calldata = await sbt.mintABI(address);
    const nonce = await ethereum.nonce(address);
    const gas_price = await ethereum.gasPrice();
    const gas_limit = await ethereum.gasLimit(address, process.env.SBT_ADDRESS, nonce, calldata);
    return res.status(200).send(JSON.stringify({status: true, sbt_address: process.env.SBT_ADDRESS, calldata: calldata, gas_price: gas_price, gas_limit: gas_limit}));
  },

  // ユーザー更新
  updateProfile: async (req, res, next) => {

    const sbt_id = req.body.sbt_id;
    const name = req.body.name;
    const comment = req.body.comment;
   
    let sql = 'SELECT wallet_address FROM sbts WHERE sbt_id = '+sbt_id;
    const dataes = await mysql.select(sql);

    if(dataes.length == 0) {
      return res.status(200).send(JSON.stringify({status: true}));
    }

    sql = 'SELECT * FROM profiles WHERE sbt_id = '+sbt_id+' AND wallet_address = "'+dataes[0].wallet_address+'"';
    const profiles = await mysql.select(sql);

    if(profiles.length > 0) {
      sql = 'UPDATE profiles SET name = "'+name+'", comment = "'+comment+'" WHERE sbt_id = '+sbt_id+' AND wallet_address = "'+dataes[0].wallet_address+'"';
      await mysql.update(sql);
    } else {
      sql = 'INSERT INTO profiles (sbt_id, name, comment, wallet_address) VALUES ('+sbt_id+', "'+name+'", "'+comment+'", "'+dataes[0].wallet_address+'")';
      await mysql.insert(sql);
    }

    return res.status(200).send(JSON.stringify({status: true}));
  },

};
