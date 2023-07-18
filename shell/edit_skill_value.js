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
    
    const sbt_id = process.argv[2];
    const skill_id = process.argv[3];
    const value = process.argv[4];

    const data = sbt.editSkillValueABI(sbt_id, skill_id, value);
    const nonce = await ethereum.nonce(process.env.ADMIN_ADDRESS);
    const gasLimit = await ethereum.gasLimit(process.env.ADMIN_ADDRESS, process.env.SBT_ADDRESS, nonce, data);
    const sign = await ethereum.sign(process.env.ADMIN_ADDRESS, process.env.ADMIN_PRIVATE_KEY, process.env.SBT_ADDRESS, gasLimit, 0, data);
    const txhash = await ethereum.send(sign.rawTransaction);

    const sql = 'INSERT INTO skill_values (sbt_id, skill_id, value) VALUES ('+sbt_id+','+skill_id+','+value+') ON DUPLICATE KEY UPDATE value = '+value+';';
    await mysql.insert(sql);

    mysql.close();
    process.exit();

  } catch(err) {
    console.info(JSON.stringify(err.message));
    mysql.close();
    process.exit();
  }

})();

