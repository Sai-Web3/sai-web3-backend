require('dotenv').config();
const Web3 = require("web3");
const { Interface } =  require('@ethersproject/abi');
const abiDecoder = require('abi-decoder');
const abi = require("../config/sbt.json");
const abiHash = require("../config/hash.json");
const abiMultiCall = require("../config/multicall.json");
abiDecoder.addABI(abi);

class SBT {
  
  constructor () {
    const provider = new Web3.providers.HttpProvider(process.env.NODE_URL);
    this.web3 = new Web3(provider);
    this.contract = new this.web3.eth.Contract(abi, process.env.SBT_ADDRESS);
  }

  decode(input) {
    return abiDecoder.decodeMethod(input);
  }

  // Each method below can be simplified using ES6 arrow function syntax
  balance = address => this.contract.methods.balanceOf(address).call();
  owner = token_id => this.contract.methods.ownerOf(token_id.toString()).call();
  totalSupply = () => this.contract.methods.totalSupply().call();
  skillLength = () => this.contract.methods.skillLength().call();

  hash = (to, skills, skill_values) => {
    const contract = new this.web3.eth.Contract(abiHash, process.env.HASH_ADDRESS);
    return contract.methods.hash(to, skills, skill_values).call();
  }

  async skills() {
    return this.callAggregate("skill");
  }

  async skillValues(sbt_id) {
    return this.callAggregate("skillValue", sbt_id);
  }

  // Combined duplicate logic in skills and skillValues
  async callAggregate(method, sbt_id = null) {
    const all_count = await this.skillLength();
    const calls = Array.from({ length: all_count }, (_, i) => ({
      address: process.env.SBT_ADDRESS,
      name: method,
      params: [sbt_id || i],
    }));

    const itf = new Interface(abi);
    const calldata = calls.map(({ address, name, params }) =>
      [address.toLowerCase(), itf.encodeFunctionData(name, params)]
    );

    const contract = new this.web3.eth.Contract(abiMultiCall, process.env.MULTICALL_ADDRESS);
    const { returnData } = await contract.methods.aggregate(calldata).call();
    const results = returnData.map((call, i) => itf.decodeFunctionResult(calls[i].name, call));

    return results.filter(Boolean).map((result, i) => ({
      id: all_count - 1 - i,
      [method === "skill" ? "skill_name" : "value"]: result[0].toString(),
    }));
  }

  // mintABI can be simplified
  mintABI = (to, skills, skill_values, v, r, s) => this.contract.methods.mint(to, skills, skill_values, v, r, s).encodeABI();
  addSkillABI = skill_name => this.contract.methods.addSkill(skill_name).encodeABI();
  addSkillsABI = skill_names => this.contract.methods.addSkill(skill_names).encodeABI();
  editSkillABI = (skill_id, skill_name) => this.contract.methods.editSkill(skill_id, skill_name).encodeABI();
  editSkillValueABI = (sbt_id, skill_id, value) => this.contract.methods.editSkillValue(sbt_id, skill_id, value).encodeABI();
}

module.exports = SBT;
