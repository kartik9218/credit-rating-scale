const { QueryTypes, Op } = require("sequelize");
const { DB_CLIENT } = require("../../../db");
const { error_logger } = require("../../../loki-push-agent");
const { MisDataMart } = require("../../../models/mis-data-mart");
const { PR_REPORT_HEADER,RATING_MIS_REPORT } = require("../../../lang/index")
async function mis_data_mart_routes(fastify) {

    fastify.post("/mis-data-marts/reports", async (request, reply) => {
        try {
            const { type, from, to } = request.body;
            let data = []
            switch (type) {
                case "pr-mis-report":
                    data = await prMisReport(request);
                    break;
                case "rating-mis-report":
                    data = await ratingMisReport(request);
                    break;
                default:
            }
            reply.send({
                success: true,
                data: data,
            });
        }
        catch (err) {
            error_logger.debug("error in getting data from mis-data-marts table" + err)
            reply.statusCode = 422;
            reply.send({
                success: false,
                error: err["errors"] ?? String(err),
            });
        }
    });

    // for pr mis report
    async function prMisReport(request, response) {
        try {
            let { from, to, limit, offset, sortBy, sortOrder } = request.body;

            if (undefined == sortBy) { sortBy = 'company_name' }
            if (undefined == sortOrder) { sortOrder = 'ASC' }
            let where = {}
            if (to != undefined) {
                where = from ? {
                    ...where,
                    meeting_date: {
                        [Op.between]: [from, to]
                    }
                } : {
                    ...where,
                    meeting_date: {
                        [Op.lte]: to
                    }
                }
            }

            let data = await MisDataMart.findAndCountAll({
                where: {
                    ...where,
                },
                limit: limit,
                offset: offset,
                order: [[String(sortBy), String(sortOrder)]],
            });
            let responseData = {};
            responseData.count = data.length;
            responseData.data = data;
            responseData.data.header = PR_REPORT_HEADER;
            return Promise.resolve(responseData);
        }
        catch (error) {
            console.log("error in getting data from prMisReport report" + error)
            return Promise.reject(error);
        }
    }

    async function ratingMisReport(request, response) {
        try {
            let { from, to, limit, offset, sortBy, sortOrder } = request.body;

            if (undefined == sortBy) { sortBy = 'company_name' }
            if (undefined == sortOrder) { sortOrder = 'ASC' }
            let where = {}
            if (to != undefined) {
                where = from ? {
                    ...where,
                    meeting_date: {
                        [Op.between]: [from, to]
                    }
                } : {
                    ...where,
                    meeting_date: {
                        [Op.lte]: to
                    }
                }
            }
            let data = await MisDataMart.findAndCountAll({
                where: {
                    ...where,
                },
                limit: limit,
                offset: offset,
                order: [[String(sortBy), String(sortOrder)]],
            });
            let responseData = {};
            responseData.count = data.length;
            responseData.data = data;
            responseData.data.header = RATING_MIS_REPORT;
            return Promise.resolve(responseData);
        }
        catch (error) {
            error_logger.debug("error in getting data from ratingMisReport report" + error)
            return Promise.reject(error);
        }
    }
}

module.exports = {
    mis_data_mart_routes
};