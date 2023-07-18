require('dotenv').config();

const Web3 = require("web3");
const { Interface } =  require('@ethersproject/abi')

const abiDecoder = require('abi-decoder');
const abi = require("../config/sbt.json");
const abiHash = require("../config/hash.json");
const abiMultiCall = require("../config/multicall.json");
abiDecoder.addABI(abi);

class SBT {

	constructor (node_url) {
		const provider = new Web3.providers.HttpProvider(process.env.NODE_URL);
		const web3 = new Web3(provider);
    this.web3 = web3;
    this.contract = new web3.eth.Contract(abi, process.env.SBT_ADDRESS);
	}

	decode(input) {
		return abiDecoder.decodeMethod(input);
	}

  // 残高
  balance (address) {
    return this.contract.methods.balanceOf(address).call();
  };

  // オーナー
  owner(token_id) {
    return this.contract.methods.ownerOf(token_id.toString()).call();
  }

  // 総数
  totalSupply() {
    return this.contract.methods.totalSupply().call();
  }

  // スキル数
  skillLength() {
    return this.contract.methods.skillLength().call();
  }

  // ハッシュ
  hash(to, skills, skill_values) {
    const contract = new this.web3.eth.Contract(abiHash, process.env.HASH_ADDRESS);
    return contract.methods.hash(to, skills, skill_values).call();
  }

  async skills () {

    const all_count = await this.contract.methods.skillLength().call();

    let calls = [];

    for(let i = all_count - 1; i >= 0; i--) {
      calls.push({
        address: process.env.SBT_ADDRESS,
        name: "skill",
        params: [i],
      });
    }

    const itf = new Interface(abi)
    const calldata = calls.map((call) => [call.address.toLowerCase(), itf.encodeFunctionData(call.name, call.params)])

    const contract = new this.web3.eth.Contract(abiMultiCall, process.env.MULTICALL_ADDRESS);
    const { returnData } = await contract.methods.aggregate(calldata).call();
    const results = returnData.map((call, i) => itf.decodeFunctionResult(calls[i].name, call))

    let rows = [];

    if(results && Array.isArray(results) && results.length > 0) {
      results.forEach((result, i) => {
        rows.push({
          id: all_count - 1 - i,
          skill_name: result[0].skillName,
        })
      })
    }

    return rows;
  };


  async skillValues (sbt_id) {

    const all_count = await this.contract.methods.skillLength().call();

    let calls = [];

    for(let i = all_count - 1; i >= 0; i--) {
      calls.push({
        address: process.env.SBT_ADDRESS,
        name: "skillValue",
        params: [sbt_id, i],
      });
    }

    const itf = new Interface(abi)
    const calldata = calls.map((call) => [call.address.toLowerCase(), itf.encodeFunctionData(call.name, call.params)])

    const contract = new this.web3.eth.Contract(abiMultiCall, process.env.MULTICALL_ADDRESS);
    const { returnData } = await contract.methods.aggregate(calldata).call();
    const results = returnData.map((call, i) => itf.decodeFunctionResult(calls[i].name, call))

    let rows = [];

    if(results && Array.isArray(results) && results.length > 0) {
      results.forEach((result, i) => {
        rows.push({
          id: all_count - 1 - i,
          value: result[0].toString(),
        })
      })
    }

    return rows;
  };

  /*
  mintABI(to) {
    return this.contract.methods.mint(to).encodeABI();
  }
  */
  mintABI(to, skills, skill_values, v, r, s) {
    return this.contract.methods.mint(to, skills, skill_values, v, r, s).encodeABI();
  }
  addSkillABI(skill_name) {
    return this.contract.methods.addSkill(skill_name).encodeABI();
  }
  addSkillsABI(skill_names) {
    return this.contract.methods.addSkill(skill_names).encodeABI();
  }
  editSkillABI(skill_id, skill_name) {
    return this.contract.methods.editSkill(skill_id, skill_name).encodeABI();
  }
  editSkillValueABI(sbt_id, skill_id, value) {
    return this.contract.methods.editSkillValue(sbt_id, skill_id, value).encodeABI();
  }



}

module.exports = SBT;

