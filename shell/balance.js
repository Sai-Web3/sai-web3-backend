require('dotenv').config();
require('date-utils');

const Web3 = require('web3');
const web3 = new Web3();

const Ethereum = require('../model/Ethereum');
const Mysql = require("../model/Mysql");
const SBT = require('../model/SBT');

const ethereum = new Ethereum();
const mysql = new Mysql(process.env.DB_HOST, process.env.DB_USER, process.env.DB_PASS, process.env.DB_NAME, 3306);
const sbt = new SBT();

(async function main() {

  try {
    
    const startTime = Date.now();
    while (true) {
      await check();
      if (Date.now() - startTime > 50000) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    mysql.close();
    process.exit();

  } catch(err) {
    console.info(JSON.stringify(err.message));
    mysql.close();
    process.exit();
  }

})();



async function check() {
  try {

    const total_supply = await sbt.totalSupply();
    const sql = 'SELECT max(sbt_id) AS max_sbt_id FROM sbts';
    const data = await mysql.select(sql);

    for(let i = data[0].max_sbt_id + 1; i < total_supply; i++) {

      const owner = await sbt.owner(i);
      const insert_sql = 'INSERT INTO sbts (sbt_id, name, wallet_address) VALUES ('+i+', "","'+web3.utils.toChecksumAddress(owner)+'") ON DUPLICATE KEY UPDATE wallet_address = "'+web3.utils.toChecksumAddress(owner)+'";';
      await mysql.insert(insert_sql);

      const profile_sql = 'SELECT * FROM profiles WHERE wallet_address = "'+web3.utils.toChecksumAddress(owner)+'"';
      const profiles = await mysql.select(profile_sql);

      if(profiles.length > 0) {
        let sql = 'UPDATE profiles SET sbt_id = '+i+' WHERE wallet_address = "'+web3.utils.toChecksumAddress(owner)+'"';
        await mysql.update(sql);
      } else {
        let sql = 'INSERT INTO profiles (sbt_id, name, comment, wallet_address) VALUES ('+i+', "", "", "'+web3.utils.toChecksumAddress(owner)+'")';
        await mysql.insert(sql);
      }

      const dataes = await sbt.skillValues(i);

      for(let index in dataes) {
        const skill_sql = 'INSERT INTO skill_values (sbt_id, skill_id, value) VALUES ('+i+', '+dataes[index].id+', '+dataes[index].value+')';
        await mysql.insert(skill_sql);
      }

    }

  } catch(err) {
    throw err;
  }
}