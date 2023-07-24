require('dotenv').config();
require('date-utils');

const Web3 = require('web3');
const Ethereum = require('../model/Ethereum');
const Mysql = require("../model/Mysql");
const SBT = require('../model/SBT');

const web3 = new Web3();
const ethereum = new Ethereum();
const mysql = new Mysql(process.env.DB_HOST, process.env.DB_USER, process.env.DB_PASS, process.env.DB_NAME, 3306);
const sbt = new SBT();

(async function main() {
  try {
    const startTime = Date.now();
    while (Date.now() - startTime <= 50000) {
      await check();
      await sleep(5000);
    }
  } catch(err) {
    console.info(JSON.stringify(err.message));
  } finally {
    mysql.close();
    process.exit();
  }
})();

async function check() {
  try {
    const totalSupply = await sbt.totalSupply();
    const [{ max_sbt_id: maxSbtId }] = await mysql.select('SELECT max(sbt_id) AS max_sbt_id FROM sbts');

    for(let i = maxSbtId + 1; i < totalSupply; i++) {
      const owner = await sbt.owner(i);
      const ownerChecksumAddress = web3.utils.toChecksumAddress(owner);
      
      const insertSbtsQuery = `INSERT INTO sbts (sbt_id, name, wallet_address) VALUES (${i}, "", "${ownerChecksumAddress}") ON DUPLICATE KEY UPDATE wallet_address = "${ownerChecksumAddress}";`;
      await mysql.insert(insertSbtsQuery);

      const profiles = await mysql.select(`SELECT * FROM profiles WHERE wallet_address = "${ownerChecksumAddress}"`);

      let profileQuery;
      if(profiles.length > 0) {
        profileQuery = `UPDATE profiles SET sbt_id = ${i} WHERE wallet_address = "${ownerChecksumAddress}"`;
      } else {
        profileQuery = `INSERT INTO profiles (sbt_id, name, comment, wallet_address) VALUES (${i}, "", "", "${ownerChecksumAddress}")`;
      }
      await mysql.update(profileQuery);

      const skillValues = await sbt.skillValues(i);
      for(const { id, value } of skillValues) {
        const skillSql = `INSERT INTO skill_values (sbt_id, skill_id, value) VALUES (${i}, ${id}, ${value})`;
        await mysql.insert(skillSql);
      }
    }
  } catch(err) {
    throw err;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

