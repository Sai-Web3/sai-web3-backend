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

			console.info(params);
			return this.post("/api/skill_elements/", params);

		} catch(err) {
			console.info(err.message);
			throw err;
		}
	}
 
	post (path, params) {
	  try {
	    return axios.post(process.env.AI_URL+path, params);
	  } catch (err) {
			console.info(err.message);
	    throw err;
	  }
	}

	matchingJob (sbt_skill_ids, job_skills) {

		let results = [];

		for(let job_id in job_skills) {
			let match_count = 0;
			let skill_ids = [];
			for(let j in job_skills[job_id]) {
				if(sbt_skill_ids.indexOf(job_skills[job_id][j]) >= 0) {
					match_count++;
					if(skill_ids.length < 3) {
						skill_ids.push(job_skills[job_id][j]);
					}
				}
			}
			results.push({
				job_id: job_id,
				match_count: match_count,
				total_count: job_skills[job_id].length,
				point: job_skills[job_id].length > 0 ? (100 * match_count / job_skills[job_id].length) : 100,
				skill_ids: skill_ids,
			});
		}

		results.sort((a, b) => b.point - a.point);
		return results;
	}

	matchingBuddy (job_skill_ids, sbt_skills) {

		let results = [];

		for(let sbt_id in sbt_skills) {
			let match_count = 0;
			let skill_ids = [];
			for(let j in sbt_skills[sbt_id]) {
				if(job_skill_ids.indexOf(sbt_skills[sbt_id][j]) >= 0) {
					match_count++;
					if(skill_ids.length < 3) {
						skill_ids.push(sbt_skills[sbt_id][j]);
					}
				}
			}
			results.push({
				sbt_id: sbt_id,
				match_count: match_count,
				total_count: job_skill_ids.length,
				// point: job_skill_ids.length > 0 ? (match_count > job_skill_ids.length ? 100 : (100 * match_count / job_skill_ids.length)) : 0,
				point: job_skill_ids.length > 0 ? (100 * match_count / job_skill_ids.length) : 0,
				skill_ids: skill_ids,
			});
		}

		results.sort((a, b) => b.point - a.point);
		return results;
	}



}

module.exports = AI;

