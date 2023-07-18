require('dotenv').config();

const axios = require('axios');

class AI {

	constructor () {
	}

	async analyzes(careers, address) {
		let results = [];
		for(let index in careers) {
			const data = await this.analyze(careers[index].input_text, careers[index].started_at, careers[index].finished_at, address);
			results.push(data.data);
		}
		return results;
	}

	analyze(input_text, started_at, finished_at, address) {
		try {

			const params = {
				input_text: input_text,
				started_at: started_at,
				finished_at: finished_at,
				address: address,
			}

			return this.post("/api/skill_elements/", params);

		} catch(err) {
			throw err;
		}
	}
 
	post (path, params) {
	  try {
	    return axios.post(process.env.AI_URL+path, params);
	  } catch (err) {
	    throw err;
	  }
	}

}

module.exports = AI;

