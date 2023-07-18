require('dotenv').config();

const Bignumber = require('bignumber.js');
const Web3 = require("web3");

class Ethereum {

	constructor (node_url) {
		const provider = new Web3.providers.HttpProvider(process.env.NODE_URL);
		const web3 = new Web3(provider);
    this.web3 = web3;
	}

	sign (from, privateKey, to, gasLimit, amount, data) {

		privateKey = privateKey.replace('0x', '');

		const params = {
		  from: from, 
		  to: to, 
		  gas: this.web3.utils.toHex(gasLimit), 
		  value: new Bignumber(amount).multipliedBy(1e18).toNumber(),
		  data: data
		};

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
		return this.web3.eth.estimateGas({
			"from": from,			 
			"nonce": nonce, 
			"to": to,		 
			"data": data
		})
	};

	// Nonce取得
	nonce (address) {
		return this.web3.eth.getTransactionCount(address);
	};

}


module.exports = Ethereum;

