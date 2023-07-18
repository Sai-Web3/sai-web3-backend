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
    
    const skill_name = process.argv[2];

    const skill_length = await sbt.skillLength();

    const data = sbt.addSkillABI(skill_name);
    const nonce = await ethereum.nonce(process.env.ADMIN_ADDRESS);
    const gasLimit = await ethereum.gasLimit(process.env.ADMIN_ADDRESS, process.env.SBT_ADDRESS, nonce, data);
    const sign = await ethereum.sign(process.env.ADMIN_ADDRESS, process.env.ADMIN_PRIVATE_KEY, process.env.SBT_ADDRESS, gasLimit, 0, data);
    const txhash = await ethereum.send(sign.rawTransaction);

    const sql = 'INSERT INTO skills (skill_id, skill_name) VALUES ('+skill_length+',"'+skill_name+'") ON DUPLICATE KEY UPDATE skill_name = "'+skill_name+'";';
    await mysql.insert(sql);

    mysql.close();
    process.exit();

  } catch(err) {
    console.info(JSON.stringify(err.message));
    mysql.close();
    process.exit();
  }

})();

