const { ecsign, toRpcSig, hashPersonalMessage, toBuffer } = require('ethereumjs-util');
const crypto = require('crypto')
const Web3 = require('web3');
const web3 = new Web3();

const AI = require('../model/AI');
const Ethereum = require('../model/Ethereum');
const Mysql = require("../model/Mysql");
const SBT = require('../model/SBT');

const ai = new AI();
const ethereum = new Ethereum();
const mysql = new Mysql(process.env.DB_HOST, process.env.DB_USER, process.env.DB_PASS, process.env.DB_NAME, 3306);
const sbt = new SBT();

module.exports = {

  analysis: async (req, res, next) => {
    try {
      const { name, comment, to, career, is_skip = false } = req.body;
      const checksumAddress = web3.utils.toChecksumAddress(to);
      const profiles = await mysql.select('SELECT * FROM profiles WHERE wallet_address = ?', [checksumAddress]);

      if(profiles.length > 0) {
        await mysql.update('UPDATE profiles SET name = ?, comment = ? WHERE wallet_address = ?', [name, comment, checksumAddress]);
      } else {
        await mysql.insert('INSERT INTO profiles (sbt_id, name, comment, wallet_address) VALUES (?, ?, ?, ?)', [-1, name, comment, checksumAddress]);
      }

      let skills = [];
      let skill_values = [];

      if(!is_skip) {
        const result = await ai.analyze(career.input_text, career.started_at, career.finished_at, to);
        const dataes = await mysql.select('SELECT * FROM career_skill_values WHERE career_id = ?', [result.data.career_id]);

        for(let i in dataes) {
          skills.push(dataes[i].skill_id);
          skill_values.push(dataes[i].value);
        }
      }

      const message = await sbt.hash(to, skills, skill_values);
      const signature = web3.eth.accounts.sign(message, process.env.ADMIN_PRIVATE_KEY);

      const calldata = await sbt.mintABI(to, skills, skill_values, signature["v"], signature["r"], signature["s"]);
      const nonce = await ethereum.nonce(to);
      const gas_price = await ethereum.gasPrice();
      const gas_limit = await ethereum.gasLimit(to, process.env.SBT_ADDRESS, nonce, calldata);

      return res.status(200).send({status: true, sbt_address: process.env.SBT_ADDRESS, calldata: calldata, gas_price: gas_price, gas_limit: gas_limit});

    } catch (error) {
      console.error(error);
      return res.status(503).send({ status: false, message: error.message });
    }
  },

};
