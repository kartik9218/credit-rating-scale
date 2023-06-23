const { Op, CHAR } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const {
  InstrumentCategory
} = require("../../../models/modules/rating-model");
const { DB_CLIENT } = require("../../../db");
const { Sequelize, DataTypes, QueryTypes } = require("sequelize");
const { APPEND_USER_DATA, CHECK_PERMISSIONS } = require("../../../helpers");
const { MasterCommon } = require("../../../models/modules/onboarding");

async function categories_routes(fastify) {
  fastify.post("/categories", async (request, reply) => {
    try {
      await CHECK_PERMISSIONS(request, 'MasterManagement.List');
      const { params } = request.body;

      let whereClause = Object.keys(params).length === 0 ? {} : params;
      const instrument_categories = await InstrumentCategory.findAll({
        where: whereClause,
        order: [
          ['category_name', 'ASC']
        ],
        attributes: { exclude: ["id"] },
        include: [
          {
            model: MasterCommon,
            as: "mandate_types"
          }
        ]
      });

      reply.send({
        success: true,
        instrument_categories: instrument_categories,
      });
    } catch (error) {
      reply.statusCode = 422;
      reply.send({
        success: false,
        error: error["errors"] ?? String(error),
      });
    }
  });

  fastify.post("/categories/create", async (request, reply) => {
    try {
      await CHECK_PERMISSIONS(request, 'MasterManagement.Create');
      const { params } = request.body;

      const mandate_type = await MasterCommon.findOne({
        where: {
          name: params["mandate_type"]
        }
      })
      
      const instrument_category = await InstrumentCategory.create({
        uuid: uuidv4(),
        category_name: params["category_name"],
        mandate_type_id: mandate_type.id,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: request.user.id,
      });

      reply.send({
        success: true,
        instrument_category: instrument_category.uuid,
      });
    } catch (error) {
      
      reply.statusCode = 422;
      reply.send({
        success: false,
        error: error["errors"] ?? String(error),
      });
    }
  });

  fastify.post("/categories/view", async (request, reply) => {
    try {
      await CHECK_PERMISSIONS(request, 'MasterManagement.List');
      
      const instrument_category = await InstrumentCategory.findOne({
        where: {
          uuid: request.body.params.uuid
        },
        include: [
          {
            model: MasterCommon,
            as: "mandate_types"
          }
        ],
        attributes: { exclude: ["id"] },
      });

      reply.send({
        success: true,
        instrument_category: instrument_category,
      });
    } catch (error) {
      reply.statusCode = 422;
      reply.send({
        success: false,
        error: error["errors"] ?? String(error),
      });
    }
  });

  fastify.post("/categories/edit", async (request, reply) => {
    try {
      const { params } = request.body;

      await CHECK_PERMISSIONS(request, 'MasterManagement.Edit');

      const mandate_type = await MasterCommon.findOne({
        where: {
          name: params["mandate_type"]
        }, 
        raw: true
      })
    
      const instrument_category = await InstrumentCategory.update(
        APPEND_USER_DATA(request, {
        category_name: params["category_name"],
        mandate_type_id: mandate_type.id,
        is_active: params["is_active"],
        updated_at: new Date(),

        }),
        {
          where: {
            uuid: params["uuid"],
          },
        }
      );
      reply.send({
        success: true,
        instrument_category_update_done: Boolean(
          instrument_category[0] === 1
        ),
      });
    } catch (error) {
      
      reply.statusCode = 422;
      reply.send({
        success: false,
        error: error["errors"] ?? String(error),
      });
    }
  });

  fastify.post("/mandate_type/view_categories", async (request, reply) => {
    try {

      const { params } = request.body;

      await CHECK_PERMISSIONS(request, 'MasterManagement.List')

      const mandate_type = await MasterCommon.findOne({
        where: {
          name: params["mandate_type"]
        }
      })

      const instrument_categories = await InstrumentCategory.findAll({
        where: {
          mandate_type_id: mandate_type.id
        },
        order: [
          ['category_name', 'ASC']
        ]
      })

      reply.send({
        success: true,
        instrument_categories: instrument_categories
      });

    } catch(error) {
      reply.statusCode = 422;
      reply.send({
        success: false,
        error: error["errors"] ?? String(error),
      });
    }
  })

}
  


module.exports = {
  categories_routes,
};