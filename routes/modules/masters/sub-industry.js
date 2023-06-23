const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const {
  Industry,SubIndustry
} = require("../../../models/modules/onboarding");
const { DB_CLIENT } = require("../../../db");
const { Sequelize, DataTypes, QueryTypes } = require("sequelize");
const { APPEND_USER_DATA, CHECK_PERMISSIONS } = require("../../../helpers");
async function sub_industries_routes(fastify) {
  fastify.post("/sub_industries", async (request, reply) => {
    try {
      await CHECK_PERMISSIONS(request, 'MasterManagement.List');
      const { params } = request.body;

      const where_query = params ? params : {};
      const sub_industries = await SubIndustry.findAll({
        where: where_query,
        order: [
          ['name', 'ASC']
        ],
        attributes: { exclude: ["id"] },
        include: {
          model: Industry,
          as: 'industry',
          attributes: { exclude: ["id"] },
        }
      });

      reply.send({
        success: true,
        sub_industries: sub_industries,
      });
    } catch (error) {
      reply.statusCode = 422;
      reply.send({
        success: false,
        error: error["errors"] ?? String(error),
      });
    }
  });

  fastify.post("/sub_industries/create", async (request, reply) => {
    try {
      await CHECK_PERMISSIONS(request, 'MasterManagement.Create');
      const { params } = request.body;
      
      const industry = await Industry.findOne({
        where: {
          uuid: params["industry_id"],
        },
      });

      const sub_industry = await SubIndustry.create({
        uuid: uuidv4(),
        name: params["name"],
        description: params["description"],
        is_active: true,
        created_at: new Date(),
        created_by: request.user.id,
      });

      await sub_industry.setIndustry([industry.id]);
      reply.send({
        success: true,
        sub_industry: sub_industry,
      });
    } catch (error) {
      reply.statusCode = 422;
      reply.send({
        success: false,
        error: error["errors"],
      });
    }
  });

  fastify.post("/sub_industries/view", async (request, reply) => {
    try {
      await CHECK_PERMISSIONS(request, 'MasterManagement.View');

      const sub_industry = await SubIndustry.findOne({
        where: {
          uuid: request.body.params.uuid,
        },
        attributes: { exclude: ["id"] },
        include: {
          model: Industry,
          as: "industry",
          attributes: { exclude: ["id"] },
        },
      });

      reply.send({
        success: true,
        sub_industry: sub_industry,
      });
    } catch (error) {
      reply.statusCode = 422;
      reply.send({
        success: false,
        error: error["errors"] ?? String(error),
      });
    }
  });

  fastify.post("/industry/sub_industries/view", async (request, reply) => {
    try {
      await CHECK_PERMISSIONS(request, 'MasterManagement.View')
      const { params } = request.body;

      const industry = await Industry.findOne({
        where: {
          uuid: params.industry_uuid,
        },
        raw: true
      });

      if (!industry) {
        reply.status_code = 403;
        reply.send({
          success: false,
          error: "NO INDUSTRY FOUND",
        });
        return;
      }

      const sub_industry = await SubIndustry.findAll({
        where: {
          industry_id: industry.id,
          is_active: true
        },
        attributes: { exclude: ["id"] },
      });

      reply.send({
        success: true,
        sub_industry: sub_industry,
      });
    } catch (error) {
      
      reply.statusCode = 422;
      reply.send({
        success: false,
        error: error["errors"] ?? String(error),
      });
    }
  });

  fastify.post("/sub_industries/edit", async (request, reply) => {
    try {
      await CHECK_PERMISSIONS(request, 'MasterManagement.Edit');
      const { params } = request.body;

      const industry = await Industry.findOne({
        where: {
          uuid: params["industry_id"],
        },
      });

      const sub_industry_object = await SubIndustry.findOne({
        where: {
          uuid: params["uuid"],
        },
      });

      if (!SubIndustry || !industry) {
        reply.status_code = 403;
        reply.send({
          success: false,
          error: "No industry or sub industry",
        });
        return;
      }

      const sub_industry_update = await SubIndustry.update(
        APPEND_USER_DATA(request, {
          uuid: uuidv4(),
          name: params["name"],
          description: params["description"],
          is_active: params["is_active"],
          updated_at: params["updated_at"],
          updated_by: params["updated_by"],
        }),
        {
          where: {
            uuid: params["uuid"],
          },
        }
      );

      await sub_industry_object.setIndustry([industry.id]);
      reply.send({
        success: true,
        sub_industry_update_result: Boolean(sub_industry_update[0] === 1),
      });
    } catch (error) {
      reply.statusCode = 422;
      reply.send({
        success: false,
        error: error["errors"],
      });
    }
  });
}

module.exports = {
  sub_industries_routes,
};