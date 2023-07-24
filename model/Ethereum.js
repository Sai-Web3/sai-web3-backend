require('dotenv').config();

const Bignumber = require('bignumber.js');
const Web3 = require("web3");

class Ethereum {

  constructor (node_url) {
    this.web3 = new Web3(new Web3.providers.HttpProvider(process.env.NODE_URL));
  }

  sign (from, privateKey, to, gasLimit, amount, data) {

    const params = {
      from,
      to,
      gas: this.web3.utils.toHex(gasLimit),
      value: new Bignumber(amount).multipliedBy(1e18).toFixed(),
      data
    };

    privateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    return this.web3.eth.accounts.signTransaction(params, privateKey);
  };

  async send (signature) {
    const transaction = await this.web3.eth.sendSignedTransaction(signature);
    return transaction.transactionHash;
  };

  gasPrice () {
    return this.web3.eth.getGasPrice();
  };

  gasLimit (from, to, nonce, data) {
    return this.web3.eth.estimateGas({from, nonce, to, data});
  };

  nonce (address) {
    return this.web3.eth.getTransactionCount(address);
  };

}


module.exports = Ethereum;
