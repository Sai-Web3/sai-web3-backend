
const { ecsign, toRpcSig, hashPersonalMessage, toBuffer } = require('ethereumjs-util');
const crypto = require('crypto')
const ethutil = require('ethereumjs-util')

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

	// 分析
  analysis: async (req, res, next) => {

    const to = req.body.to;
    const career = req.body.career;
    const is_skip = req.body.is_skip || false;

    let skills = [];
    let skill_values = [];

    if(!is_skip) {

      const result = await ai.analyze(career.input_text, career.started_at, career.finished_at, to)

      let sql = 'SELECT * FROM career_skill_values WHERE career_id = '+result.data.career_id;
      let dataes = await mysql.select(sql);

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

    return res.status(200).send(JSON.stringify({status: true, sbt_address: process.env.SBT_ADDRESS, calldata: calldata, gas_price: gas_price, gas_limit: gas_limit}));
  },
 
};
