require('dotenv').config();

const Bignumber = require('bignumber.js');
const Web3 = require("web3");

class Ethereum {
  constructor () {
    this.web3 = new Web3(new Web3.providers.HttpProvider(process.env.NODE_URL));
  }

  async sign (from, privateKey, to, gasLimit, amount, data) {
    privateKey = privateKey.replace('0x', '');
    const params = {
      from, 
      to, 
      gas: this.web3.utils.toHex(gasLimit), 
      value: new Bignumber(amount).multipliedBy(1e18).toNumber(),
      data
    };

    return this.web3.eth.accounts.signTransaction(params, privateKey);
  };

  sendSignedTransaction (signature) {
    return this.web3.eth.sendSignedTransaction(signature).then(transaction => transaction.transactionHash);
  };

  getGasPrice () {
    return this.web3.eth.getGasPrice();
  };

  estimateGas (from, to, nonce, data) {
    return this.web3.eth.estimateGas({from, nonce, to, data});
  };

  getTransactionCount (address) {
    return this.web3.eth.getTransactionCount(address);
  };
}

module.exports = Ethereum;
