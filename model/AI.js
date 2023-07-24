
require('dotenv').config();
const axios = require('axios');

class AI {
    async analyzes(careers, address) {
        const results = await Promise.all(careers.map(career =>
            this.analyze(career.input_text, career.started_at, career.finished_at, address)
                .then(response => response.data)
        ));
        return results;
    }

    analyze(input_text, started_at, finished_at, address) {
        const params = { input_text, started_at, finished_at, address };
        return this.post("/api/skill_elements/", params);
    }

    post(path, params) {
        return axios.post(process.env.AI_URL + path, params).catch((err) => {
            console.error(err.message);
            throw err;
        });
    }

    matchingJob(sbt_skill_ids, job_skills) {
        return this.calculateMatching(sbt_skill_ids, job_skills, 'job_id');
    }

    matchingBuddy(job_skill_ids, sbt_skills) {
        return this.calculateMatching(job_skill_ids, sbt_skills, 'sbt_id');
    }

    calculateMatching(ids, skills, idKey) {
        const results = Object.entries(skills).map(([key, skillSet]) => {
            const matchingSkills = skillSet.filter(skill => ids.includes(skill));
            const match_count = matchingSkills.length;
            const skill_ids = matchingSkills.slice(0, 3);

            return {
                [idKey]: key,
                match_count,
                total_count: ids.length,
                point: (100 * match_count / ids.length) || 0,
                skill_ids,
            };
        });

        results.sort((a, b) => b.point - a.point);
        return results;
    }
}

module.exports = AI;
