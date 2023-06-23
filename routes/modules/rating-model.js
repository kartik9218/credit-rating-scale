const { v4: uuidv4 } = require("uuid");
const { Op, QueryTypes, where, Sequelize } = require("sequelize");
const {
  RATING_DB_INSTANCE,
  RatingModel,
  RiskType,
  RatingModelHasRiskType,
  Factor,
  FactorParameter,
  FinancialYear,
  RatingMatrix,
  IndustryScore,
  RatingMetadata,
  RatingSheet,
  NotchingModel,
  InstrumentDetail,
  RatingSymbolMaster,
  RatingSymbolCategory,
  RatingSymbolMapping,
  RatingType,
  CompanyRatingModel,
  IndustryModelMapping,
  RatingScale,
  RatingModelHasNotching,
  RiskTypeRatingSheet,
} = require("../../models/modules/rating-model.js");
const {
  Company,
  Industry,
  SubIndustry,
  Mandate,
} = require("../../models/modules/onboarding");
const { error_logger } = require("../../loki-push-agent");
const { LOG_TO_DB } = require("../../logger");
const { APPEND_USER_DATA, CHECK_PERMISSIONS } = require("../../helpers");
const { log } = require("winston");
const { DB_CLIENT } = require("../../db.js");
const { LANG_DATA } = require("../../lang");
const L = LANG_DATA();

async function rating_model_routes(fastify) {
  fastify.register((instance, opts, done) => {
    fastify.addHook("onRequest", async (request, reply) => {
      if (false && !request.user.is_super_account) {
        reply.status_code = 403;
        reply.send({
          success: false,
          error: L["NO_ACCESS_TO_MODULE"],
        });
      }
    });

    fastify.post("/industry_score", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'IndustryScore.List')
        let where_query = request.body.params ? request.body.params : {};

        const industry_scores = await IndustryScore.findAll({
          where: where_query,
          include: {
            model: SubIndustry,
            as: 'sub_industry'
          }
        });
        return reply.send({
          success: true,
          industry_scores: industry_scores,
        });
      } catch (error) {
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/industry_score/create", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'IndustryScore.Create')
        const { params } = request.body;

        const sub_industry = await SubIndustry.findOne({
          where: {
            uuid: params["sub_industry_uuid"],
            is_active: true
          }
        });

        if (!sub_industry) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: "NO_SUB_INDUSTRY_FOUND",
          });
          return;
        }

        const industry_score = await IndustryScore.create({
          uuid: uuidv4(),
          score: params["score"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id
        })

        await industry_score.setSub_industry(sub_industry)

        return reply.send({
          success: true,
          industry_score: industry_score,
        });
      } catch (error) {
        console.log(error)
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/industry_score/view", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'IndustryScore.View')
        const { params } = request.body

        const sub_industry = await SubIndustry.findOne({
          where: {
            uuid: params["sub_industry_uuid"],
            is_active: true
          },
          raw: true,
        });

        if (!sub_industry) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: "NO_SUB_INDUSTRY_FOUND",
          });
          return;
        }

        const industry_score = await IndustryScore.findOne({
          where: {
            sub_industry_id: sub_industry.id
          },
          include: {
            model: SubIndustry,
            as: 'sub_industry'
          }
        })

        return reply.send({
          success: true,
          industry_score: industry_score,
        });
      } catch (error) {
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/company_rating_model/create", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'CompanyRatingModel.Create')
        const { params } = request.body;

        const model_type = await RatingModel.findOne({
          where: {
            uuid: params["model_type_uuid"],
            is_active: true,
          },
        });

        if (!model_type) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_MODEL_SELECTED"],
          });
          return;
        }

        const company = await Company.findOne({
          where: {
            uuid: params["company_uuid"],
            is_active: true,
          },
          raw: true
        });

        if (!company) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_COMPANY"],
          });
          return;
        }

        const company_rating_model = await CompanyRatingModel.create({
          uuid: uuidv4(),
          turnover: params["turnover"],
          status: params["status"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
          industry_id: company.industry_id,
          company_id: company.id
        });

        await LOG_TO_DB(request, {
          activity: "COMPANY RATING MODEL CREATION",
          params: {
            data: params,
          },
        });

        await company_rating_model.setModel_type(model_type);

        reply.send({
          success: true,
          company_rating_model: company_rating_model,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/company_rating_model", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'CompanyRatingModel.List')
        let where_query = request.body.params ? request.body.params : {};

        const company_rating_models = await CompanyRatingModel.findAll({
          where: where_query,

          include: [
            {
              model: Company,
              as: "company",
              include: {
                model: SubIndustry,
                as: "company_sub_industry",
              },
            },
            {
              model: RatingModel,
              as: "model_type",
            },
            {
              model: Industry,
              as: "industry",
            },
          ],
        });

        reply.send({
          success: true,
          company_rating_models: company_rating_models,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/company_rating_model/view", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'CompanyRatingModel.View')
        const { params } = request.body

        const company = await Company.findOne({
          where: {
            uuid: params["company_uuid"],
          },
        });

        if (!company) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_COMPANY"],
          });
          return;
        }

        const model_type = await RatingModel.findOne({
          where: {
            uuid: params["model_type_uuid"],
          },
        });

        if (!model_type) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_MODEL_SELECTED"],
          });
          return;
        }

        const company_rating_model = await CompanyRatingModel.findOne({
          where: {
            company_id: company.id,
            rating_model_id: model_type.id,
          },
          include: [
            {
              model: Company,
              as: "company",
              include: {
                model: Industry,
                as: "company_industry",
              },
              include: {
                model: SubIndustry,
                as: "company_sub_industry",
              },
            },
            {
              model: RatingModel,
              as: "model_type",
            },
          ],
        });

        reply.send({
          success: true,
          company_rating_model: company_rating_model,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_models", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "RatingModel.List");

        let where_query = request.body.params ? request.body.params : {};

        const rating_models = await RatingModel.findAll({
          where: where_query,
        });
        reply.send({
          success: true,
          rating_models: rating_models,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_models/view", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "RatingModel.View");
        const params = request.body;

        const rating_model = await RatingModel.findOne({
          where: {
            uuid: params["uuid"],
          },
        });
        reply.send({
          success: true,
          rating_model: rating_model,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_models/create", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.Create')
        const { params } = request.body;

        const rating_model = await RatingModel.create({
          uuid: uuidv4(),
          name: params["name"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        await LOG_TO_DB(request, {
          activity: "CREATE_RATING_MODEL",
          params: {
            data: params,
          },
        });

        reply.send({
          success: true,
          rating_model_uuid: rating_model.uuid,
        });
      } catch (error) {
        let error_log = {
          api: "v1/rating_models/create",
          activity: "CREATE_RATING_MODEL",
          params: {
            error: String(error),
          },
        };
        error_logger.info(JSON.stringify(error_log));
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_models/edit", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.Edit')
        const { params } = request.body;

        const rating_model_object = await RatingModel.findOne({
          where: {
            uuid: params["uuid"],
            is_active: true,
          },
        });

        const rating_model_update_result = await RatingModel.update(
          APPEND_USER_DATA(request, {
            is_active: false,
          }),
          {
            where: {
              uuid: params["uuid"],
            },
          }
        );

        if (rating_model_update_result[0] === 0) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: "Updation failed!",
          });
        }

        const rating_model = await RatingModel.create({
          uuid: uuidv4(),
          name: params["name"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        await rating_model.setParent_rating_model(rating_model_object);

        await LOG_TO_DB(request, {
          activity: "UPDATE_RATING_MODEL",
          params: {
            data: params,
          },
        });

        reply.send({
          success: true,
          rating_model_update_result: Boolean(
            rating_model_update_result[0] === 1
          ),
          rating_model_uuid: rating_model.uuid,
        });
      } catch (error) {
        let error_log = {
          api: "v1/rating_models/create",
          activity: "UPDATE_RATING_MODEL",
          params: {
            error: String(error),
          },
        };
        error_logger.info(JSON.stringify(error_log));
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_models/view_risk_types", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.View')
        const { params } = request.body;

        const rating_model = await RatingModel.findOne({
          where: {
            uuid: params["rating_model_uuid"],
            is_active: true,
          },
          raw: true,
        });

        if (!rating_model) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: L["NO_RATING_MODEL_SELECTED"],
          });
        }

        let risk_types_ids = await RatingModelHasRiskType.findAll({
          where: {
            rating_model_id: rating_model.id,
            is_active: true,
          },
          attributes: ["risk_type_id"],
          raw: true,
        });

        risk_types_ids = risk_types_ids.map((el) => el.risk_type_id);

        const risk_types = await RiskType.findAll({
          where: {
            id: risk_types_ids,
            is_active: true,
          },
        });

        reply.send({
          success: true,
          risk_types: risk_types,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/notching_models", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, 'NotchingModel.List')
        let where_query = request.body.params ? request.body.params : {};

        const notching_models = await NotchingModel.findAll({
          where: where_query,
        });
        reply.send({
          success: true,
          notching_models: notching_models,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/notching_models/view", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'NotchingModel.View')
        const params = request.body;

        const notching_model = await NotchingModel.findOne({
          where: {
            uuid: params["uuid"],
          },
        });
        reply.send({
          success: true,
          notching_model: notching_model,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/notching_models/create", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'NotchingModel.Create')
        const { params } = request.body;

        const notching_model = await NotchingModel.create({
          uuid: uuidv4(),
          name: params["name"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        await LOG_TO_DB(request, {
          activity: "CREATE_NOTCHING_MODEL",
          params: {
            data: params,
          },
        });

        reply.send({
          success: true,
          notching_model_uuid: notching_model.uuid,
        });
      } catch (error) {
        let error_log = {
          api: "v1/notching_models/create",
          activity: "CREATE_NOTCHING_MODEL",
          params: {
            error: String(error),
          },
        };
        error_logger.info(JSON.stringify(error_log));
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/notching_models/edit", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'NotchingModel.Edit')
        const { params } = request.body;

        const notching_model_object = await NotchingModel.findOne({
          where: {
            uuid: params["uuid"],
            is_active: true,
          },
        });

        const notching_model_update_result = await NotchingModel.update(
          APPEND_USER_DATA(request, {
            is_active: false,
          }),
          {
            where: {
              uuid: params["uuid"],
            },
          }
        );

        if (notching_model_update_result[0] === 0) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: "Updation failed!",
          });
        }

        const notching_model = await NotchingModel.create({
          uuid: uuidv4(),
          name: params["name"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        await notching_model.setParent_notching_model(notching_model_object);

        await LOG_TO_DB(request, {
          activity: "UPDATE_NOTCHING_MODEL",
          params: {
            data: params,
          },
        });

        reply.send({
          success: true,
          notching_model_update_result: Boolean(
            notching_model_update_result[0] === 1
          ),
          notching_model_uuid: notching_model.uuid,
        });
      } catch (error) {
        let error_log = {
          api: "v1/notching_models/create",
          activity: "UPDATE_NOTCHING_MODEL",
          params: {
            error: String(error),
          },
        };
        error_logger.info(JSON.stringify(error_log));
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/risk_types", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "RiskType.List");
        let where_query = request.body.params ? request.body.params : {};

        const risk_types = await RiskType.findAll({
          where: where_query,
        });
        reply.send({
          success: true,
          risk_types: risk_types,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/risk_types/create", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, 'RiskType.Create');
        const { params } = request.body;

        const risk_type = await RiskType.create({
          uuid: uuidv4(),
          name: params["name"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        reply.send({
          success: true,
          risk_type_uuid: risk_type.uuid,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/risk_types/edit", async (request, reply) => {
      try {
        const { params } = request.body;

        await CHECK_PERMISSIONS(request, "RiskType.Edit");

        const risk_type_object = await RiskType.findOne({
          where: {
            uuid: params["uuid"],
            is_active: true,
          },
        });

        const risk_type_update_result = await RiskType.update(
          APPEND_USER_DATA(request, {
            is_active: false,
          }),
          {
            where: {
              uuid: params["uuid"],
            },
          }
        );

        if (risk_type_update_result[0] === 0) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: "Updation failed!",
          });
        }

        const risk_type = await RiskType.create({
          uuid: uuidv4(),
          name: params["name"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        await risk_type.setParent_risk_type(risk_type_object);

        await LOG_TO_DB(request, {
          activity: "UPDATE_RISK_TYPE",
          params: {
            data: params,
          },
        });

        reply.send({
          success: true,
          risk_type_update_result: Boolean(risk_type_update_result[0] === 1),
          risk_type_uuid: risk_type.uuid,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/risk_types/view", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "RiskType.View");
        const { params } = request.body;

        const risk_type = await RiskType.findOne({
          where: {
            uuid: params["uuid"],
          },
        });

        reply.send({
          success: true,
          risk_type: risk_type,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_models/assign_notching", async (request, reply) => {
      try {
        const { params } = request.body;

        await CHECK_PERMISSIONS(request, 'RatingModel.List')

        const rating_model = await RatingModel.findOne({
          where: {
            uuid: params["rating_model_uuid"],
            is_active: true,
          },
        });

        if (!rating_model) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_MODEL_SELECTED"],
          });
          return;
        }

        const notching = await NotchingModel.findOne({
          where: {
            uuid: params["notching_uuid"],
            is_active: true,
          },
        });

        if (!notching) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: "NO_NOTCHING",
          });
          return;
        }

        const rating_model_notching = await RatingModelHasNotching.create({
          uuid: uuidv4(),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        await rating_model_notching.setRisk_type([notching.id]);
        await rating_model_notching.setRating_model([rating_model.id]);

        reply.send({
          success: true,
          rating_model_notching_uuid: rating_model_notching.uuid,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_model/notching/view", async (request, reply) => {
      try {
        const { params } = request.body;

        await CHECK_PERMISSIONS(request, 'RatingModel.View')

        const rating_model = await RatingModel.findOne({
          where: {
            uuid: params["rating_model_uuid"],
            is_active: true,
          },
          raw: true,
        });

        if (!rating_model) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_MODEL_SELECTED"],
          });
          return;
        }

        const rating_model_notchings = await RatingModelHasNotching.findAll({
          where: {
            rating_model_id: rating_model.id,
            is_active: true,
          },
        });

        reply.send({
          success: true,
          rating_model_notchings: rating_model_notchings,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_models/assign_risk_types", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.Create')
        const { params } = request.body;

        const rating_model = await RatingModel.findOne({
          where: {
            uuid: params["rating_model_uuid"],
            is_active: true,
          },
        });

        if (!rating_model) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_MODEL_SELECTED"],
          });
          return;
        }

        const risk_type = await RiskType.findOne({
          where: {
            uuid: params["risk_type_uuid"],
            is_active: true,
          },
        });

        if (!risk_type) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RISK_TYPE"],
          });
          return;
        }

        const rating_model_risk_type = await RatingModelHasRiskType.create({
          uuid: uuidv4(),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        await rating_model_risk_type.setRisk_type([risk_type.id]);
        await rating_model_risk_type.setRating_model([rating_model.id]);

        reply.send({
          success: true,
          rating_model_risk_type_uuid: rating_model_risk_type.uuid,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_model_risk_type/view", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.View')
        const { params } = request.body;

        const rating_model = await RatingModel.findOne({
          where: {
            uuid: params["rating_model_uuid"],
            is_active: true,
          },
          raw: true,
        });

        if (!rating_model) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_MODEL_SELECTED"],
          });
          return;
        }

        const risk_type = await RiskType.findOne({
          where: {
            uuid: params["risk_type_uuid"],
            is_active: true,
          },
          raw: true,
        });

        if (!risk_type) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RISK_TYPE_FOUND"],
          });
          return;
        }

        const rating_model_risk_type = await RatingModelHasRiskType.findOne({
          where: {
            risk_type_id: risk_type.id,
            rating_model_id: rating_model.id,
            is_active: true,
          },
        });

        reply.send({
          success: true,
          rating_model_risk_type: rating_model_risk_type,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/notching_model/create_factors", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'NotchingModel.Create')
        const { params } = request.body;

        const notching_model = await NotchingModel.findOne({
          where: {
            uuid: params["notching_model_uuid"],
            is_active: true,
          },
        });

        if (!notching_model) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_NOTCHING_MODEL"],
          });
          return;
        }

        const notching_model_factor = await Factor.create({
          uuid: uuidv4(),
          question: params["question"],
          max_score: params["max_score"],
          coefficient: params["coefficient"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        await notching_model_factor.setNotching_model(notching_model);

        reply.send({
          success: true,
          notching_model_factor_uuid: notching_model_factor.uuid,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/notching_model/view_factors", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'NotchingModel.View')
        const { params } = request.body;

        const notching_model = await NotchingModel.findOne({
          where: {
            uuid: params["notching_model_uuid"],
            is_active: true,
          },
        });

        if (!notching_model) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_NOTCHING_MODEL"],
          });
          return;
        }

        const factors = await Factor.findAll({
          where: {
            notching_model_id: notching_model.id,
            is_active: true,
          },
          include: {
            model: FactorParameter,
            as: "factor_parameters",
            attributes: { exclude: ["id", "factor_id"] },
          }
        });

        reply.send({
          success: true,
          factors: factors,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/notching_model/edit_factors", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'NotchingModel.Edit')
        const { params } = request.body;

        const notching_model = await NotchingModel.findOne({
          where: {
            uuid: params["notching_model_uuid"],
            is_active: true,
          },
        });

        if (!notching_model) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_NOTCHING_MODEL"],
          });
          return;
        }

        const factor_object = await Factor.findOne({
          where: {
            uuid: params["uuid"],
            is_active: true,
          },
        });

        if (!factor_object) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_FACTOR_FOUND"],
          });
          return;
        }

        const notching_model_factor_update = await Factor.update(
          APPEND_USER_DATA(request, {
            is_active: false,
          }),
          {
            where: {
              uuid: params["uuid"],
            },
          }
        );

        const notching_model_factor = await Factor.create({
          uuid: uuidv4(),
          question: params["question"],
          max_score: params["max_score"],
          coefficient: params["coefficient"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        await notching_model_factor.setNotching_model(notching_model);

        reply.send({
          success: true,
          notching_model_factor_update_result: Boolean(
            notching_model_factor_update[0] == 1
          ),
          notching_model_factor: notching_model_factor.uuid,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post(
      "/rating_models/create_risk_type_factors",
      async (request, reply) => {
        try {

          await CHECK_PERMISSIONS(request, 'RatingModel.Create')
          const { params } = request.body;

          const rating_model_risk_type_onject =
            await RatingModelHasRiskType.findOne({
              where: {
                uuid: params["rating_model_risk_type_uuid"],
                is_active: true,
              },
            });

          if (!rating_model_risk_type_onject) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_MODEL"],
            });
            return;
          }

          const rating_model_risk_type_factor = await Factor.create({
            uuid: uuidv4(),
            question: params["question"],
            max_score: params["max_score"],
            coefficient: params["coefficient"],
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: request.user.id,
          });

          await rating_model_risk_type_factor.setFactor_rating_model_risk_type(
            rating_model_risk_type_onject
          );

          reply.send({
            success: true,
            rating_model_risk_type_factor: rating_model_risk_type_factor.uuid,
          });
        } catch (error) {
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: String(error),
          });
        }
      }
    );

    fastify.post(
      "/rating_models/edit_risk_type_factors",
      async (request, reply) => {
        try {

          await CHECK_PERMISSIONS(request, 'RatingModel.Edit')
          const { params } = request.body;

          const factor_object = await Factor.findOne({
            where: {
              uuid: params["uuid"],
              is_active: true,
            },
          });

          if (!factor_object) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_FACTOR_FOUND"],
            });
            return;
          }

          const rating_model_risk_type_factor_update = await Factor.update(
            APPEND_USER_DATA(request, {
              is_active: false,
            }),
            {
              where: {
                uuid: params["uuid"],
              },
            }
          );

          if (rating_model_risk_type_factor_update[0] === 0) {
            reply.status_code = 403;
            return reply.send({
              success: false,
              error: "Updation failed!",
            });
          }

          const rating_model_risk_type_factor = await Factor.create({
            uuid: uuidv4(),
            question: params["question"],
            max_score: params["max_score"],
            coefficient: params["coefficient"],
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: request.user.id,
          });

          await rating_model_risk_type_factor.setParent_factor(factor_object);

          reply.send({
            success: true,
            rating_model_risk_type_factor_update_result: Boolean(
              rating_model_risk_type_factor_update[0] == 1
            ),
            rating_model_risk_type_factor: rating_model_risk_type_factor.uuid,
          });
        } catch (error) {
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: String(error),
          });
        }
      }
    );

    fastify.post("/rating_models/view_factors", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.View')
        const { params } = request.body;

        const rating_model = await RatingModel.findOne({
          where: {
            uuid: params["rating_model_uuid"],
            is_active: true,
          },
          raw: true,
        });

        if (!rating_model) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_MODEL"],
          });
          return;
        }

        const risk_type = await RiskType.findOne({
          where: {
            uuid: params["risk_type_uuid"],
            is_active: true,
          },
          raw: true,
        });

        if (!risk_type) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RISK_TYPE"],
          });
          return;
        }

        const rating_model_risk_type = await RatingModelHasRiskType.findOne({
          where: {
            risk_type_id: risk_type.id,
            rating_model_id: rating_model.id,
            is_active: true,
          },
        });

        const factors = await Factor.findAll({
          where: {
            rating_model_risk_type_id: rating_model_risk_type.id,
            is_active: true,
          },
          attributes: { exclude: ["id", "rating_model_risk_type_id"] },
          include: [
            {
              model: FactorParameter,
              as: "factor_parameters",
              attributes: { exclude: ["id", "factor_id"] },
            },
          ],
        });

        reply.send({
          success: true,
          factors: factors,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/factors/delete", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'Factors.Edit')
        const { params } = request.body;

        const rating_model_risk_type_factor_update = await Factor.update(
          APPEND_USER_DATA(request, {
            is_active: false,
          }),
          {
            where: {
              uuid: params["uuid"],
            },
          }
        );

        reply.send({
          success: true,
          factor_delete_result: Boolean(
            rating_model_risk_type_factor_update[0] === 1
          ),
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/factors/view", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'Factors.View')
        const { params } = request.body;

        const factor = await Factor.findOne({
          where: {
            uuid: params["uuid"],
          },
          attributes: {
            exclude: [
              "id",
              "rating_model_risk_type_id",
              "notching_model_id",
              "parent_factor_id",
            ],
          },
          include: [
            {
              model: RatingModelHasRiskType,
              as: "factor_rating_model_risk_type",
              attributes: ["uuid"],
              include: [
                {
                  model: RatingModel,
                  as: "rating_model",
                  attributes: ["uuid", "name", "is_active"],
                },
                {
                  model: RiskType,
                  as: "risk_type",
                  attributes: ["uuid", "name", "is_active"],
                },
              ],
            },
            {
              model: FactorParameter,
              as: "factor_parameters",
              attributes: { exclude: ["id", "factor_id"] },
            },
          ],
        });

        reply.send({
          success: true,
          factor: factor,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/factor_parameters/create", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'Factors.Create')
        const { params } = request.body;

        const factor = await Factor.findOne({
          where: {
            uuid: params["factor_uuid"],
            is_active: true,
          },
        });

        if (!factor) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_FACTOR_SELECTED"],
          });
          return;
        }

        const factor_parameter = await FactorParameter.create({
          uuid: uuidv4(),
          name: params["name"],
          score: params["score"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        await factor_parameter.setFactor(factor);

        reply.send({
          success: true,
          factor_parameter: factor_parameter.uuid,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/factor_parameters/edit", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'Factors.Edit')
        const { params } = request.body;

        const factor = await Factor.findOne({
          where: {
            uuid: params["factor_uuid"],
            is_active: true,
          },
        });

        if (!factor) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_FACTOR_SELECTED"],
          });
          return;
        }

        const factor_parameter_object = await FactorParameter.findOne({
          where: {
            uuid: params["uuid"],
            is_active: true,
          },
        });

        const factor_parameter = await FactorParameter.update(
          APPEND_USER_DATA(request, {
            name: params["name"],
            score: params["score"],
            is_active: params["is_active"],
          }),
          {
            where: {
              uuid: params["uuid"],
            },
          }
        );

        await factor_parameter_object.setFactor(factor);

        reply.send({
          success: true,
          factor_parameter_update_result: Boolean(factor_parameter[0] === 1),
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_metadata/create", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.Create')
        const { params } = request.body;

        const mandate = await Mandate.findOne({
          where: {
            uuid: request.body.mandate_uuid,
            is_active: true,
          },
          raw: true,
        });

        if (!mandate) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: "NO_MANDATE_FOUND",
          });
          return;
        }

        const rating_model = await RatingModel.findOne({
          where: {
            uuid: request.body.rating_model_uuid,
            is_active: true,
          },
          raw: true,
        });

        if (!rating_model) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_MODEL_SELECTED"],
          });
          return;
        }

        const risk_type = await RiskType.findOne({
          where: {
            uuid: request.body.risk_type_uuid,
            is_active: true,
          },
          raw: true,
        });

        const notching = await NotchingModel.findOne({
          where: {
            uuid: request.body.notching_uuid,
            is_active: true,
          },
          raw: true,
        });

        const data = [];
 
        params.forEach((element) => {
          (element.uuid = uuidv4()),
            (element.notching_id = notching
              ? notching.id
              : null),
            (element.risk_type_id = risk_type ? risk_type.id : null),
            (element.mandate_id = mandate ? mandate.id : null),
            (element.rating_model_id = rating_model ? rating_model.id : null),
            (element.notching_model_id = notching ? notching.id : null)
            data.push(element);
        });

        const rating_metadata = await RatingMetadata.bulkCreate(data);

        const risk_type_rating_sheet = await RiskTypeRatingSheet.create({
          uuid: uuidv4(),
          weighted_score: request.body.total_assigned_weight,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
          rating_model_id: rating_model.id,
          risk_type_id: risk_type?.id,
          notching_id: notching?.id,
          mandate_id: mandate.id,
        });

        reply.send({
          success: true,
          rating_metadata: rating_metadata,
          risk_type_rating_sheet_uuid: risk_type_rating_sheet.uuid,
        });
      } catch (error) {
        console.log("error:", error);
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/risk_type/weighted_scores", async (request, reply) => {
      try {

        const { params } = request.body;

        await CHECK_PERMISSIONS(request, 'RiskType.List')

        const mandate = await Mandate.findOne({
          where: {
            uuid: params['mandate_uuid'],
            is_active: true,
          },
          raw: true,
        });

        if (!mandate) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: "NO_MANDATE_SELECTED"
          });
          return;
        }

        const risk_type_rating_sheet = await RiskTypeRatingSheet.findAll({
          where: {
            mandate_id: mandate.id,
            is_active: true,
          },
          include: [
             {
              model: RiskType,
              as: "risk_type",
              // attributes: ['uuid', 'name', 'path', 'description']
            },
            {
              model: NotchingModel,
              as: "notching_model"
            },
          ]
        });

        reply.send({
          success: true,
          rating_sheet: rating_sheet,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_sheet/create", async (request, reply) => {
      try {

        const { params } = request.body;

        await CHECK_PERMISSIONS(request, 'RatingModel.Create')

        const company = await Company.findOne({
          where: {
            uuid: params['company_uuid'],
            is_active: true,
          },
          raw: true,
        });

        if (!company) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: "NO_COMPANY_SELECTED"
          });
          return;
        }

        const mandate = await Mandate.findOne({
          where: {
            uuid: params['mandate_uuid'],
            is_active: true,
          },
          raw: true,
        });

        if (!mandate) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: "NO_COMPANY_SELECTED"
          });
          return;
        }

        const rating_sheet = await RatingSheet.create({
          uuid: uuidv4(),
          proposed_rating_long_term: params["proposed_rating_long_term"],
          proposed_rating_short_term: params["proposed_rating_short_term"],
          proposed_outlook_long_term: params["proposed_outlook_long_term"],
          proposed_outlook_short_term: params["proposed_outlook_short_term"],
          intercept: params["intercept"],
          is_active: true,
          mandate_id: mandate.id,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        
        await DB_CLIENT.query(`
          UPDATE
          instrument_details 
          SET rating_sheet_id = :sheet_id
          WHERE id IN (SELECT id FROM instrument_details id
            INNER JOIN transaction_instruments ti ON ti.id = id.transaction_instrument_id
            INNER JOIN mandates m ON m.id = ti.mandate_id
            where m.id = :mandate_id );
        `,
        {
          replacements: {
            mandate_id: mandate.id,
            sheet_id: rating_sheet.id
          },
          type: QueryTypes.UPDATE,
        });

        reply.send({
          success: true,
          rating_sheet_uuid: rating_sheet.uuid,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/financial_year/create", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'FinancialYear.Create')
        const { params } = request.body;

        const financial_year = await FinancialYear.create({
          uuid: uuidv4(),
          reference_date: params["reference_date"],
          start_date: params['start_date'],
          end_date: params['end_date'],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        reply.send({
          success: true,
          financial_year: financial_year,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/financial_year/view", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'FinancialYear.View')
        const { params } = request.body;

        const financial_year = await FinancialYear.findOne({
          where: {
            uuid: params["uuid"],
          },
        });

        reply.send({
          success: true,
          financial_year: financial_year,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/financial_year", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'FinancialYear.List')
        const where_query = request.body.params ? request.body.params : {};

        const financial_year = await FinancialYear.findAll({
          where: where_query,
        });

        reply.send({
          success: true,
          financial_year: financial_year,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/financial_year/edit", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'FinancialYear.Edit')
        const { params } = request.body;

        const financial_year = FinancialYear.findOne({
          where: {
            uuid: params["uuid"],
          },
        });

        if (!financial_year) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_FINANCIAL_YEAR_SELECTED"],
          });
          return;
        }

        const updated_financial_year = await FinancialYear.update(
          APPEND_USER_DATA(request, {
            reference_date: params["reference_date"],
            is_active: params["is_active"],
            start_date: params['start_date'],
            end_date: params['end_date'],
          }),
          {
            where: {
              uuid: params["uuid"],
            },
          }
        );

        reply.send({
          success: true,
          financial_year: updated_financial_year,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_matrix/create", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.Create')
        const { params } = request.body;

        const financial_year = await FinancialYear.findOne({
          where: {
            uuid: params["uuid"],
          },
        });

        if (!financial_year) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_FINANCIAL_YEAR_SELECTED"],
          });
          return;
        }

        const rating_matrix = await RatingMatrix.create({
          uuid: uuidv4(),
          lower_limit: params["lower_limit"],
          higher_limit: params["higher_limit"],
          grade: params["grade"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        reply.send({
          success: true,
          rating_matrix: rating_matrix,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_matrix/view", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.View')
        const { params } = request.body;

        const rating_matrix = await RatingMatrix.findOne({
          where: {
            uuid: params["uuid"],
            is_active: true,
          },
        });

        reply.send({
          success: true,
          rating_matrix: rating_matrix,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_matrix", async (request, reply) => {
      try {
        
        await CHECK_PERMISSIONS(request, 'RatingModel.List')
        const where_query = request.body.params ? request.body.params : {};

        const rating_matrix = await RatingMatrix.findAll({
          where: where_query,
        });

        reply.send({
          success: true,
          rating_matrix: rating_matrix,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_matrix/edit", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.Edit')
        const { params } = request.body;

        const rating_matrix = await RatingMatrix.findOne({
          where: {
            uuid: params["uuid"],
            is_active: true,
          },
        });

        if (!rating_matrix) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_MATRIX_SELECTED"],
          });
          return;
        }

        const rating_matrix_update_result = await RatingMatrix.update(
          APPEND_USER_DATA(request, {
            lower_limit: params["lower_limit"],
            higher_limit: params["higher_limit"],
            grade: params["grade"],
          }),
          {
            where: {
              uuid: params["uuid"],
            },
          }
        );

        reply.send({
          success: true,
          rating_matrix_update_result: rating_matrix_update_result,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_symbol_master/create", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.Create')
        const { params } = request.body;

        const rating_scale = await RatingScale.findOne({
          where: {
            uuid: params["rating_scale_uuid"],
            is_active: true,
          },
        });

        if (!rating_scale) {
          reply.statusCode = 422;
          return reply.send({
            success: false,
            error: "Rating scale not found !!",
          });
        }

        const rating_symbol_master = await RatingSymbolMaster.create({
          uuid: uuidv4(),
          rating_symbol: params["rating_symbol"],
          description: params["description"],
          grade: params["grade"],
          weightage: params["weightage"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        await rating_symbol_master.setRating_scale(rating_scale);

        reply.send({
          success: true,
          rating_symbol_master_uuid: rating_symbol_master.uuid,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_symbol_master/view", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.View')
        const { params } = request.body;

        const rating_symbol_master = await RatingSymbolMaster.findOne({
          where: {
            uuid: params["uuid"],
          },
          include: 
            {
              model: RatingScale,
              as: 'rating_scale'
            }
          
        });

        reply.send({
          success: true,
          rating_symbol_master: rating_symbol_master,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_symbol_master", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.List');
        const { params } = request.body;

        const where_query = {};

        const rating_scale = await RatingScale.findOne({
          where: {
            uuid: params.rating_scale_uuid ? params.rating_scale_uuid : null,
            is_active: true,
          },
          raw: true
        });


        if (rating_scale) {
          where_query['rating_scale_id'] = rating_scale.id;
        }

        if(Object.keys(params).includes('is_active')){
          where_query['is_active'] = params['is_active']
        }

        const rating_symbol_master = await RatingSymbolMaster.findAll({
          where: where_query,
          order: ['rating_symbol'],
          include: 
            {
              model: RatingScale,
              as: 'rating_scale'
            }
        });

        reply.send({
          success: true,
          rating_symbol_master: rating_symbol_master,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_symbol_master/edit", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.Edit')
        const { params } = request.body;
        
        const rating_symbol_master = await RatingSymbolMaster.findOne({
          where: {
            uuid: params["uuid"],
          },
        });
        
        if (!rating_symbol_master) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_MATRIX_SELECTED"],
          });
          return;
        }

        const rating_scale = await RatingScale.findOne({
          where: {
            uuid: params["rating_scale_uuid"],
            is_active: true,
          },
        });

        if (!rating_scale) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: "NO_RATING_SCALE_SELECTED",
          });
          return;
        }

        const rating_symbol_master_update_result =
          await RatingSymbolMaster.update(
            APPEND_USER_DATA(request, {
              rating_symbol: params["rating_symbol"],
              description: params["description"],
              grade: params["grade"],
              weightage: params["weightage"],
              is_active: params['is_active'],
            }),
            {
              where: {
                uuid: params["uuid"],
              },
            }
          );

          await rating_symbol_master.setRating_scale(rating_scale);

        reply.send({
          success: true,
          rating_symbol_master_update_result:
            rating_symbol_master_update_result,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_symbol_category/create", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.Create')
        const { params } = request.body;

        const rating_symbol_category = await RatingSymbolCategory.create({
          uuid: uuidv4(),
          symbol_type_category: params["symbol_type_category"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        reply.send({
          success: true,
          rating_symbol_category: rating_symbol_category,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_symbol_category/view", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.View')
        const { params } = request.body;

        const rating_symbol_category = await RatingSymbolCategory.findOne({
          where: {
            uuid: params["uuid"],
            is_active: true,
          },
        });

        reply.send({
          success: true,
          rating_symbol_category: rating_symbol_category,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_symbol_category", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.List')
        const { params } = request.body;

        const where_query = request.body.params ? request.body.params : {};

        const rating_symbol_category = await RatingSymbolCategory.findAll({
          where: where_query,
          order: ['symbol_type_category']
        });

        reply.send({
          success: true,
          rating_symbol_category: rating_symbol_category,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_symbol_category/edit", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.Edit')
        const { params } = request.body;

        const rating_symbol_category = await RatingSymbolCategory.findOne({
          where: {
            uuid: params["uuid"]
          },
        });

        if (!rating_symbol_category) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_MATRIX_SELECTED"],
          });
          return;
        }

        const rating_symbol_category_update_result =
          await RatingSymbolCategory.update(
            APPEND_USER_DATA(request, {
              symbol_type_category: params["symbol_type_category"],
              is_active: true,
            }),
            {
              where: {
                uuid: params["uuid"],
              },
            }
          );

        reply.send({
          success: true,
          rating_symbol_category_update_result:
            rating_symbol_category_update_result,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_symbol_mapping/create", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.Create')
        const { params } = request.body;

        const rating_symbol_category = await RatingSymbolCategory.findOne({
          where: {
            uuid: params["rating_symbol_category_uuid"],
            is_active: true,
          },
        });

        if (!rating_symbol_category) {
          reply.statusCode = 422;
          return reply.send({
            success: false,
            error: "Rating Symbol category not found !!",
          });
        }

        const rating_symbol_master = await RatingSymbolMaster.findOne({
          where: {
            uuid: params["rating_symbol_master_uuid"],
            is_active: true,
          },
          raw: true
        });

        if (!rating_symbol_master) {
          reply.statusCode = 422;
          return reply.send({
            success: false,
            error: "Rating Symbol master not found !!",
          });
        }

        const final_rating = params["prefix"] + rating_symbol_master.rating_symbol + params["suffix"];

        const rating_symbol_mapping = await RatingSymbolMapping.create({
          uuid: uuidv4(),
          prefix: params["prefix"],
          suffix: params["suffix"],
          final_rating: final_rating,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
          rating_symbol_master_id: rating_symbol_master.id
        });

        await rating_symbol_mapping.setRating_symbol_category(
          rating_symbol_category
        );

        reply.send({
          success: true,
          rating_symbol_mapping: rating_symbol_mapping,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_symbol_mapping/view", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.View')     
        const { params } = request.body;

        const rating_symbol_mapping = await RatingSymbolMapping.findOne({
          where: {
            uuid: params["uuid"]
          },
          include: [
            {
              model: RatingSymbolCategory,
              as: 'rating_symbol_category'
            },
            {
              model: RatingSymbolMaster,
              as: 'rating_symbol_master'
            }
          ]
        });

        reply.send({
          success: true,
          rating_symbol_mapping: rating_symbol_mapping,
        });
      } catch (error) {
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_symbol_mapping", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.List')
        const { params } = request.body;
        const where_query = {};

        const rating_symbol_category = await RatingSymbolCategory.findOne({
          where: {
            uuid: params.rating_symbol_category_uuid ? params.rating_symbol_category_uuid : null,
            is_active: true,
          },
          raw: true
        });

        if (rating_symbol_category) {
          where_query['rating_symbol_category_id'] = rating_symbol_category.id;
        }

        if(Object.keys(params).includes('is_active')){
          where_query['is_active'] = params['is_active']
        }

        const rating_symbol_mapping = await RatingSymbolMapping.findAll({
          where: where_query,
          include: [
            {
              model: RatingSymbolCategory,
              as: 'rating_symbol_category'
            },
            {
              model: RatingSymbolMaster,
              as: 'rating_symbol_master'
            }
          ]
        });

        return reply.send({
          success: true,
          rating_symbol_mapping: rating_symbol_mapping,
        });
      } catch (error) {
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_symbol_mapping/final_ratings", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.List')
        const { params } = request.body;

        const rating_symbol_category = await RatingSymbolCategory.findOne({
          where: {
            uuid: params.rating_symbol_category_uuid ? params.rating_symbol_category_uuid : null,
            is_active: true,
          },
          raw: true
        });

        var final_ratings = {};
        if(params['long_term']){
        final_ratings = await DB_CLIENT.query(
          `SELECT rsm.final_rating,rsm2.uuid AS rating_symbol_master_uuid, rsm.uuid, rsc.symbol_type_category , rsm2.rating_symbol, rs.name  from rating_symbol_mappings rsm INNER JOIN rating_symbol_categories rsc ON rsc.id = rsm.rating_symbol_category_id 
          INNER JOIN rating_symbol_masters rsm2 ON rsm2.id = rsm.rating_symbol_master_id INNER JOIN rating_scales rs ON rs.id = rsm2.rating_scale_id WHERE rsc.id = :rsc AND rsm.is_active = 1 AND rs.name != 'Short term'`,
          {
            replacements: {
              rsc: rating_symbol_category.id,
            },
            type: QueryTypes.SELECT,
          }
        );
        }
        else{
          final_ratings = await DB_CLIENT.query(
            `SELECT rsm.final_rating,rsm2.uuid AS rating_symbol_master_uuid, rsm.uuid, rsc.symbol_type_category , rsm2.rating_symbol, rs.name  from rating_symbol_mappings rsm INNER JOIN rating_symbol_categories rsc ON rsc.id = rsm.rating_symbol_category_id 
            INNER JOIN rating_symbol_masters rsm2 ON rsm2.id = rsm.rating_symbol_master_id INNER JOIN rating_scales rs ON rs.id = rsm2.rating_scale_id WHERE rsc.id = :rsc AND rsm.is_active = 1 AND rs.name = 'Short term'`,
            {
              replacements: {
                rsc: rating_symbol_category.id,
              },
              type: QueryTypes.SELECT,
            }
          );
        }

        return reply.send({
          success: true,
          final_ratings: final_ratings,
        });
      } catch (error) {
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_symbol_mapping/edit", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.Edit')

        const { params } = request.body;

        const rating_symbol_mapping = await RatingSymbolMapping.findOne({
          where: {
            uuid: params["uuid"],
            is_active: true,
          },
        });

        const rating_symbol_category = await RatingSymbolCategory.findOne({
          where: {
            uuid: params["rating_symbol_category_uuid"],
            is_active: true,
          },
        });

        if (!rating_symbol_category) {
          reply.statusCode = 422;
          return reply.send({
            success: false,
            error: "Rating Symbol category not found !!",
          });
        }

        const rating_symbol_master = await RatingSymbolMaster.findOne({
          where: {
            uuid: params["rating_symbol_master_uuid"],
            is_active: true,
          },
          raw: true
        });

        if (!rating_symbol_master) {
          reply.statusCode = 422;
          return reply.send({
            success: false,
            error: "Rating Symbol master not found !!",
          });
        }

        const final_rating = params["prefix"] + rating_symbol_master.rating_symbol + params["suffix"];


        if (!rating_symbol_mapping) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: L["NO_RATING_MATRIX_SELECTED"],
          });
        }

        const rating_symbol_mapping_update_result =
          await RatingSymbolMapping.update(
            APPEND_USER_DATA(request, {
              prefix: params["prefix"],
              suffix: params["suffix"],
              final_rating: final_rating,
              is_active: params['is_active'],
              rating_symbol_master_id: rating_symbol_master.id
            }),
            {
              where: {
                uuid: params["uuid"],
              },
            }
          );

          await rating_symbol_mapping.setRating_symbol_category(
            rating_symbol_category
          );

        return reply.send({
          success: true,
          rating_symbol_mapping_update_result:
            rating_symbol_mapping_update_result,
        });
      } catch (error) {
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_scale/create", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.Create')

        const { params } = request.body;

        const rating_scale = await RatingScale.create({
          uuid: uuidv4(),
          name: params["name"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        return reply.send({
          success: true,
          rating_scale: rating_scale,
        });
      } catch (error) {
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_scale/view", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.View')

        const { params } = request.body;

        const rating_scale = await RatingScale.findOne({
          where: {
            uuid: params["uuid"],
          },
        });

        return reply.send({
          success: true,
          rating_scale: rating_scale,
        });
      } catch (error) {
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_scale", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.List')

        const where_query = request.body.params ? request.body.params : {};

        const rating_scale = await RatingScale.findAll({
          where: where_query,
        });

        return reply.send({
          success: true,
          rating_scale: rating_scale,
        });
      } catch (error) {
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_scale/edit", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.Edit')

        const { params } = request.body;

        const rating_scale = await RatingScale.findOne({
          where: {
            uuid: params["uuid"],
            is_active: true,
          },
        });

        if (!rating_scale) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_MATRIX_SELECTED"],
          });
          return;
        }

        const rating_scale_update_result = await RatingScale.update(
          APPEND_USER_DATA(request, {
            name: params["name"],
            is_active: params["is_active"],
          }),
          {
            where: {
              uuid: params["uuid"],
            },
          }
        );

        return reply.send({
          success: true,
          rating_scale_update_result: Boolean(
            rating_scale_update_result[0] === 1
          ),
        });
      } catch (error) {
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/industry_model_mapping/view", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.View')

        const { params } = request.body;

        const rating_model = await RatingModel.findOne({
          where: {
            uuid: params["rating_model_uuid"],
            is_active: true,
          },
          raw: true,
        });

        if (!rating_model) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: L["NO_RATING_MODEL_SELECTED"],
          });
        }

        const industry_model_mapping = await DB_CLIENT.query(`
          SELECT  
            rm.name as rating_model_name,  
            si.uuid as sub_industry_uuid,  
            si.name as sub_industry_name 
          FROM industry_models_mapping imm 
          INNER JOIN rating_models rm  ON rm.id  = imm.rating_model_id 
          INNER  JOIN sub_industries si ON si.id  = imm.sub_industry_id 
          WHERE si.is_active=1 AND imm.is_active=1 AND rm.id = ${rating_model.id};
        `);

        return reply.send({
          success: true,
          industry_model_mapping: industry_model_mapping[0],
        });
      } catch (error) {
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/industry_model_mapping", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'ModelMapping.List')

        const where_query = request.body.params ? request.body.params : {};
        var mappings = [];
        var mapping_keys = [];

        const industry_model_mappings = await DB_CLIENT.query(`
          SELECT  
            rm.uuid as rating_model_uuid,  
            rm.name as rating_model_name, 
            si.uuid as sub_industry_uuid,  
            si.name as sub_industry_name 
          FROM industry_models_mapping imm 
          INNER JOIN rating_models rm  ON rm.id  = imm.rating_model_id 
          INNER  JOIN sub_industries si ON si.id  = imm.sub_industry_id 
          WHERE rm.is_active=1 AND si.is_active=1 AND imm.is_active=1;
        `);

        industry_model_mappings[0].forEach((mapping) => {
          if (!mapping_keys.includes(mapping["rating_model_uuid"])) {
            mapping_keys.push(mapping["rating_model_uuid"]);
            mappings.push({
              rating_model_name: mapping["rating_model_name"],
              rating_model_uuid: mapping["rating_model_uuid"],
              sub_industries: [],
            });
          }
          mappings.forEach((inner_map) => {
            if (
              inner_map["rating_model_uuid"] === mapping["rating_model_uuid"]
            ) {
              inner_map["sub_industries"].push({
                sub_industry_uuid: mapping["sub_industry_uuid"],
                sub_industry_name: mapping["sub_industry_name"],
              });
              return;
            }
          });
        });

        return reply.send({
          success: true,
          mappings: mappings,
        });
      } catch (error) {
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/industry_model_mapping/create", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'ModelMapping.Create')

        const { params } = request.body;

        const rating_model = await RatingModel.findOne({
          where: {
            uuid: params["rating_model_uuid"],
          },
          raw: true,
        });

        if (!rating_model) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: L["NO_RATING_MODEL"],
          });
        }

        let sub_industry = await SubIndustry.findAll({
          where: {
            uuid: params["sub_industry_uuid"],
            is_active: true,
          },
          raw: true,
        });

        if (!sub_industry) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: L["NO_SUB_INDUSTRY_FOUND"],
          });
        }

        if (sub_industry) {
          reply.send({
            success: false,
            error: L["SUB_INDUSTRY_ALREADY_EXISTS"],
          });
        }

        const bulk_data = [];
        sub_industry.map((el) => {
          const obj = {};
          obj.version = params["version"];
          obj.uuid = uuidv4();
          obj.sub_industry_id = el.id;
          obj.rating_model_id = rating_model.id;
          obj.is_active = true;
          obj.created_at = new Date();
          obj.updated_at = new Date();
          obj.created_by = request.user.id;
          bulk_data.push(obj);
        });

        const industry_model_mapping = await IndustryModelMapping.bulkCreate(
          bulk_data
        );

        return reply.send({
          success: true,
          industry_model_mapping: industry_model_mapping,
        });
      } catch (error) {
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/industry_model_mapping/edit", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'ModelMapping.Edit')

        const { params } = request.body;

        const rating_model = await RatingModel.findOne({
          where: {
            uuid: params["rating_model_uuid"],
          },
        });

        if (!rating_model) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: L["NO_RATING_MODEL"],
          });
        }

        const sub_industry = await SubIndustry.findOne({
          where: {
            uuid: params["sub_industry_uuid"],
          },
        });

        if (!sub_industry) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: L["NO_SUB_INDUSTRY_FOUND"],
          });
        }

        const industry_model_mapping = await IndustryModelMapping.findOne({
          where: {
            sub_industry_id: sub_industry.id,
          },
          raw: true,
        });

        if (!industry_model_mapping) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: L["NO_INDUSTRY_MODEL_MAPPING_FOUND"],
          });
        }

        const industry_model_mapping_updated_result =
          await IndustryModelMapping.update(
            APPEND_USER_DATA(request, {
              is_active: false,
            }),
            {
              where: {
                uuid: params["uuid"],
              },
            }
          );

        return reply.send({
          success: true,
          industry_model_mapping_updated_result:
            industry_model_mapping_updated_result,
        });
      } catch (error) {
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post("/rating_model_list", async (request, reply) => {
      try {

        await CHECK_PERMISSIONS(request, 'RatingModel.List')

        const where_query = request.body.params ? request.body.params : {};
        var mappings = [];
        var mapping_keys = [];

        const industry_model_mappings = await DB_CLIENT.query(`
          SELECT  
            rm.uuid as rating_model_uuid,  
            rm.name as rating_model_name, 
            si.uuid as sub_industry_uuid,  
            si.name as sub_industry_name 
          FROM industry_models_mapping imm 
          INNER JOIN rating_models rm  ON rm.id  = imm.rating_model_id 
          INNER  JOIN sub_industries si ON si.id  = imm.sub_industry_id 
          WHERE rm.is_active=1 AND si.is_active=1 AND imm.is_active=1;
        `);

        industry_model_mappings[0].forEach((mapping) => {
          if (!mapping_keys.includes(mapping["rating_model_uuid"])) {
            mapping_keys.push(mapping["rating_model_uuid"]);
            mappings.push({
              rating_model_name: mapping["rating_model_name"],
              rating_model_uuid: mapping["rating_model_uuid"],
              sub_industries: [],
            });
          }
          mappings.forEach((inner_map) => {
            if (
              inner_map["rating_model_uuid"] === mapping["rating_model_uuid"]
            ) {
              inner_map["sub_industries"].push({
                sub_industry_uuid: mapping["sub_industry_uuid"],
                sub_industry_name: mapping["sub_industry_name"],
              });
              return;
            }
          });
        });

        return reply.send({
          success: true,
          mappings: mappings,
        });
      } catch (error) {
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });
    done();
  });
}

module.exports = {
  rating_model_routes,
};
