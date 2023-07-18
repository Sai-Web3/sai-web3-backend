require('dotenv').config();
require('date-utils');

const Web3 = require('web3');

const Ethereum = require('../model/Ethereum');
const Mysql = require("../model/Mysql");
const SBT = require('../model/SBT');

const ethereum = new Ethereum();
const mysql = new Mysql(process.env.DB_HOST, process.env.DB_USER, process.env.DB_PASS, process.env.DB_NAME, 3306);
const sbt = new SBT();

(async function main() {

  try {
    
    const skills = await sbt.skills();

    for(let index in skills) {
      const sql = 'INSERT INTO skills (skill_id, skill_name) VALUES ('+skills[index].id+',"'+skills[index].skill_name+'") ON DUPLICATE KEY UPDATE skill_name = "'+skills[index].skill_name+'";';
      await mysql.insert(sql);
    }

    mysql.close();
    process.exit();

  } catch(err) {
    console.info(JSON.stringify(err.message));
    mysql.close();
    process.exit();
  }

})();

