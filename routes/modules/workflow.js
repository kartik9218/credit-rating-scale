const { v4: uuidv4 } = require("uuid");
const { APPEND_USER_DATA, CHECK_PERMISSIONS } = require("../../helpers");
const { LANG_DATA } = require("../../lang");
const { LOG_TO_DB } = require("../../logger");
const { error_logger } = require("../../loki-push-agent");
const {
  Role,
  Company,
  Mandate,
  User,
} = require("../../models/modules/onboarding");
const {
  Activity,
  WorkflowConfig,
  WorkflowInstanceLog,
  WorkflowInstance,
} = require("../../models/modules/workflow");
const {
  RatingProcessSchema,
  ActivitySchema,
  WorkflowConfigSchema,
  WorkflowInstanceSchema,
  WorkflowInstanceLogSchema,
} = require("../../schemas/Workflow");
const { GET_ACTIVITY } = require("../../repositories/ActivityRepository");
const { GET_ROLE } = require("../../repositories/RoleRepository");
const {
  GET_RATING_PROCESS,
} = require("../../repositories/RatingProcessRepository");
const { DB_CLIENT } = require("../../db");
const { QueryTypes } = require("sequelize");
const { RatingProcess, TransactionInstrument, InstrumentDetail, FinancialYear } = require("../../models/modules/rating-model");
const {
  ListWorkflowConfigSchema,
  ViewWorkflowConfigSchema,
  CreateWorkflowConfigSchema,
  EditWorkflowConfigSchema,
} = require("../../schemas/Workflow/WorkflowConfig");
const { CreateWorkflowInstanceSchema, ListWorkflowInstanceSchema, ViewWorkflowInstanceSchema, EditWorkflowInstanceSchema } = require("../../schemas/Workflow/WorkflowInstance");
const { CreateWorkflowInstanceLogSchema, ListWorkflowInstanceLogSchema, ViewWorkflowInstanceLogSchema, EditWorkflowInstanceLogSchema } = require("../../schemas/Workflow/WorkflowInstanceLog");
const L = LANG_DATA();

async function workflows_routes(fastify) {
  fastify.register((instance, opts, done) => {
    fastify.post("/workflows", async (request, reply) => {
      return reply.send({
        success: true,
        type: "workflows",
      });
    });

    fastify.post(
      "/rating_process/create",
      { schema: RatingProcessSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "RatingProcess.Create");
          const { params } = request.body;

          const rating_process = await RatingProcess.create({
            uuid: uuidv4(),
            name: params["name"],
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: request.user.id,
          });

          await LOG_TO_DB(request, {
            activity: "CREATE_RATING_PROCESS_TYPE",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            rating_process: rating_process,
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_process/create",
            activity: "CREATE_RATING_PROCESS_TYPE",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/rating_process/view",
      { schema: RatingProcessSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "RatingProcess.View");
          const { params } = request.body;

          const rating_process = await RatingProcess.findOne({
            where: {
              uuid: params["uuid"],
            },
          });

          await LOG_TO_DB(request, {
            activity: "VIEW_RATING_PROCESS_TYPE",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            rating_process: rating_process,
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_process/view",
            activity: "VIEW_RATING_PROCESS_TYPE",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/rating_process",
      { schema: RatingProcessSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "RatingProcess.List");
          const { params } = request.body;

          const where_query = request.body.params ? request.body.params : {};

          const rating_processes = await RatingProcess.findAll({
            where: where_query,
          });

          await LOG_TO_DB(request, {
            activity: "VIEW_ALL_RATING_PROCESS_TYPE",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            rating_processes: rating_processes,
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_type",
            activity: "VIEW_ALL_RATING_PROCESS_TYPE",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/rating_process/edit",
      { schema: RatingProcessSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "RatingProcess.Edit");
          const { params } = request.body;

          const rating_process = await RatingProcess.findOne({
            where: {
              uuid: params["uuid"],
            },
          });

          if (!rating_process) {
            reply.status_code = 403;
            return reply.send({
              success: false,
              error: "NO_RATING_PROCESS",
            });
          }

          const rating_process_update_result = await RatingProcess.update(
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

          await LOG_TO_DB(request, {
            activity: "EDIT_RATING_PROCESS_TYPE",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            rating_process_update_result: rating_process_update_result,
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_process/edit",
            activity: "EDIT_RATING_PROCESS_TYPE",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/activity/create",
      { schema: ActivitySchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "Activities.Create");

          const { params } = request.body;

          const activity = await Activity.create({
            uuid: uuidv4(),
            code: params["code"],
            name: params["name"],
            completion_status: params["completion_status"],
            alert_message: params["alert_message"],
            remarks: params["remarks"],
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: request.user.id,
          });

          await LOG_TO_DB(request, {
            activity: "CREATE_ACTIVITY",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            activity: activity,
          });
        } catch (error) {
          let error_log = {
            api: "v1/activity/create",
            activity: "CREATE_ACTIVITY",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/activity/view",
      { schema: ActivitySchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "Activities.View");

          const { params } = request.body;

          const activity = await Activity.findOne({
            where: {
              uuid: params["uuid"],
            },
          });

          await LOG_TO_DB(request, {
            activity: "ACTIVITY_VIEW",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            activity: activity,
          });
        } catch (error) {
          let error_log = {
            api: "v1/activity/view",
            activity: "ACTIVITY_VIEW",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/activity",
      { schema: ActivitySchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "Activites.List");
          const { params } = request.body;

          const where_query = request.body.params ? request.body.params : {};

          const activities = await Activity.findAll({
            where: where_query,
          });

          await LOG_TO_DB(request, {
            activity: "ALL_ACTIVITY",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            activities: activities,
          });
        } catch (error) {
          let error_log = {
            api: "v1/activity",
            activity: "ALL_ACTIVITY",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/activity/edit",
      { schema: ActivitySchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "Activities.Edit");
          const { params } = request.body;

          const activity_update_result = await Activity.update(
            APPEND_USER_DATA(request, {
              code: params["code"],
              name: params["name"],
              completion_status: params["completion_status"],
              alert_message: params["alert_message"],
              remarks: params["remarks"],
            }),
            {
              where: {
                uuid: params["uuid"],
              },
            }
          );

          await LOG_TO_DB(request, {
            activity: "EDIT_ACTIVITY",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            activity_update_result: activity_update_result,
          });
        } catch (error) {
          let error_log = {
            api: "v1/activity/edit",
            activity: "EDIT_ACTIVITY",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post("/workflow_config/create", { schema: CreateWorkflowConfigSchema }, async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "Configurator.Create");
        const { params } = request.body;

        const current_activity = await GET_ACTIVITY({
          uuid: params["current_activity_uuid"],
          is_active: true,
        });

        const next_activity = await GET_ACTIVITY({
          uuid: params["next_activity_uuid"],
          is_active: true,
        });

        const assigner_role = await GET_ROLE({
          uuid: params["assigner_role_uuid"],
          is_active: true,
        });

        const performer_role = await GET_ROLE({
          uuid: params["performer_role_uuid"],
          is_active: true,
        });

        const rating_process = await GET_RATING_PROCESS({
          uuid: params["rating_process_uuid"],
          is_active: true,
        });

        const workflow_config = await DB_CLIENT.query(
          `
            INSERT INTO workflow_configs
            (uuid, serial_number, is_last_activity, is_active, tat, created_at, updated_at, created_by, updated_by, current_activity_id, next_activity_id, assigner_role_id, performer_role_id, rating_process_id)
            VALUES(
              :uuid,
              :serial_number,
              :is_last_activity,
              :is_active,
              :tat,
              :created_at,
              :updated_at,
              :created_by,
              :updated_by,
              :current_activity_id,
              :next_activity_id,
              :assigner_role_id,
              :performer_role_id,
              :rating_process_id
            );
          `,
          {
            replacements: {
              uuid: uuidv4(),
              serial_number: params["serial_number"],
              is_last_activity: params["is_last_activity"],
              is_active: true,
              tat: Number.parseInt(params["tat"], 10),
              created_at: new Date(),
              updated_at: new Date(),
              created_by: request.user.id,
              updated_by: request.user.id,
              current_activity_id: current_activity.id,
              next_activity_id: next_activity.id,
              assigner_role_id: assigner_role.id,
              performer_role_id: performer_role.id,
              rating_process_id: rating_process.id,
            },
            type: QueryTypes.INSERT,
          }
        );

        await LOG_TO_DB(request, {
          activity: "CREATE_WORKFLOW_CONFIG",
          params: {
            data: params,
          },
        });

        return reply.send({
          success: true,
          workflow_config: workflow_config,
        });
      } catch (error) {
        const error_log = {
          api: "v1/workflow_config/create",
          activity: "CREATE_WORKFLOW_CONFIG",
          params: {
            error: error,
          },
        };
        error_logger.info(JSON.stringify(error_log));

        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: error,
        });
      }
    });

    fastify.post(
      "/workflow_config",
      { schema: ListWorkflowConfigSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "Configurator.List");
          const { params } = request.body;

          const rating_process = await RatingProcess.findOne({
            where: {
              uuid: params["rating_process_uuid"],
            },
          });

          const activities = await DB_CLIENT.query(
            `
          SELECT * 
          FROM view_workflow_config 
          WHERE rating_process_id=:rating_process_id
          ORDER BY current_activity_code ASC;
        `,
            {
              replacements: {
                rating_process_id: rating_process.id,
              },
              type: QueryTypes.SELECT,
            }
          );

          await LOG_TO_DB(request, {
            activity: "ALL_WORKFLOW_CONFIG",
            params: {
              data: params,
            },
          });

          return reply.send({
            success: true,
            activities: activities,
          });
        } catch (error) {
          const error_log = {
            api: "v1/workflow_config",
            activity: "ALL_WORKFLOW_CONFIG",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));

          reply.statusCode = 422;
          return reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/workflow_config/view",
      { schema: ViewWorkflowConfigSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "WorkflowConfig.View");
          const { params } = request.body;

          const workflow_config = await WorkflowConfig.findOne({
            where: {
              uuid: params["uuid"],
            },
            include: [
              {
                model: Activity,
                as: "current_activity",
              },
              {
                model: Activity,
                as: "next_activity",
              },
              {
                model: Role,
                as: "assigner_role",
              },
              {
                model: Role,
                as: "performer_role",
              },
            ],
          });

          await LOG_TO_DB(request, {
            activity: "WORKFLOW_CONFIG_VIEW",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            workflow_config: workflow_config,
          });
        } catch (error) {
          let error_log = {
            api: "v1/workflow_config/view",
            activity: "WORKFLOW_CONFIG_VIEW",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/workflow_config/edit",
      { schema: EditWorkflowConfigSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "WorkflowConfig.Edit");
          const { params } = request.body;

          const current_activity = await Activity.findOne({
            where: {
              uuid: params["current_activity_uuid"],
              is_active: true,
            },
          });

          if (!current_activity) {
            reply.status_code = 403;
            return reply.send({
              success: false,
              error: "CURRENT_ACTIVITY_NOT_FOUND",
            });
          }

          const next_activity = await Activity.findOne({
            where: {
              uuid: params["next_activity_uuid"],
              is_active: true,
            },
          });

          if (!next_activity) {
            reply.status_code = 403;
            return reply.send({
              success: false,
              error: "NEXT_ACTIVITY_NOT_FOUND",
            });
          }

          const assigner_role = await Role.findOne({
            where: {
              uuid: params["assigner_role_uuid"],
              is_active: true,
            },
          });

          if (!assigner_role) {
            reply.status_code = 403;
            return reply.send({
              success: false,
              error: "ASSIGNER_ROLE_NOT_FOUND",
            });
          }

          const performer_role = await Role.findOne({
            where: {
              uuid: params["performer_role_uuid"],
              is_active: true,
            },
          });

          if (!performer_role) {
            reply.status_code = 403;
            return reply.send({
              success: false,
              error: "PERFORMER_ROLE_NOT_FOUND",
            });
          }

          const workflow_config_object = await WorkflowConfig.findOne({
            where: {
              uuid: params["uuid"],
            },
          });

          const rating_process = await RatingProcess.findOne({
            where: {
              uuid: params["rating_process_uuid"],
              is_active: true,
            },
          });

          if (!rating_process) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_PROCESS"],
            });
            return;
          }

          const workflow_config_update_result = await WorkflowConfig.update(
            APPEND_USER_DATA(request, {
              serial_number: params["serial_number"],
              tat: params["tat"],
              is_last_activity: params["is_last_activity"],
              is_active: params["is_active"],
            }),
            {
              where: {
                uuid: params["uuid"],
              },
            }
          );

          await workflow_config_object.setCurrent_activity(current_activity);
          await workflow_config_object.setNext_activity(next_activity);
          await workflow_config_object.setAssigner_role(assigner_role);
          await workflow_config_object.setPerformer_role(performer_role);
          await workflow_config_object.setRating_process(rating_process);

          await LOG_TO_DB(request, {
            activity: "EDIT_WORKFLOW_CONFIG",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            workflow_config_update_result: Boolean(
              workflow_config_update_result[0] === 1
            ),
          });
        } catch (error) {
          let error_log = {
            api: "v1/workflow_config/edit",
            activity: "EDIT_WORKFLOW_CONFIG",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/workflow_instance/create",
      { schema: CreateWorkflowInstanceSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "WorkflowInstance.Create");

          const { params } = request.body;

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

          const mandate = await Mandate.findOne({
            where: {
              uuid: params["mandate_uuid"],
            },
          });

          if (!mandate) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_MADATE_FOUND"],
            });
            return;
          }

          const workflow_instance = await WorkflowInstance.create({
            uuid: uuidv4(),
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            assigned_at: params["assigned_at"],
            performed_at: params["performed_at"],
          });

          await LOG_TO_DB(request, {
            activity: "CREATE_WORKFLOW_INSTANCE",
            params: {
              data: params,
            },
          });

          await workflow_instance.setCompany(company);
          await workflow_instance.setMandate(mandate);

          reply.send({
            success: true,
            workflow_instance: workflow_instance,
          });
        } catch (error) {
          let error_log = {
            api: "v1/workflow_instance/create",
            activity: "CREATE_WORKFLOW_INSTANCE",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/workflow_instance/view",
      { schema: ViewWorkflowInstanceSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "WorkflowInstance.View");

          const { params } = request.body;

          const workflow_instance = await WorkflowInstance.findOne({
            where: {
              uuid: params["uuid"],
            },
          });

          await LOG_TO_DB(request, {
            activity: "VIEW_WORKFLOW_INSTANCE",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            workflow_instance: workflow_instance,
          });
        } catch (error) {
          let error_log = {
            api: "v1/workflow_instance/view",
            activity: "VIEW_WORKFLOW_INSTANCE",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/workflow_instance",
      { schema: ListWorkflowInstanceSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "WorkflowInstance.List");

          const { params } = request.body;

          const where_query = request.body.params ? request.body.params : {};

          const workflow_instance = await WorkflowInstance.findAll({
            where: where_query,
          });

          await LOG_TO_DB(request, {
            activity: "LIST_WORKFLOW_INSTANCE",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            workflow_instance: workflow_instance,
          });
        } catch (error) {
          let error_log = {
            api: "v1/workflow_instance",
            activity: "LIST_WORKFLOW_INSTANCE",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/workflow_instance/edit",
      { schema: EditWorkflowInstanceSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "WorkflowInstance.Edit");

          const { params } = request.body;

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

          const mandate = await Mandate.findOne({
            where: {
              uuid: params["mandate_uuid"],
            },
          });

          if (!mandate) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_MADATE_FOUND"],
            });
            return;
          }

          const workflow_instance_object = await WorkflowInstance.findOne({
            where: {
              uuid: params["uuid"],
            },
          });

          const workflow_instance_update_result = await WorkflowInstance.update(
            APPEND_USER_DATA(request, {
              assigned_at: params["assigned_at"],
              performed_at: params["performed_at"],
            }),
            {
              where: {
                uuid: params["uuid"],
              },
            }
          );

          await LOG_TO_DB(request, {
            activity: "EDIT_WORKFLOW_INSTANCE",
            params: {
              data: params,
            },
          });

          await workflow_instance_object.setCompany(company);
          await workflow_instance_object.setMandate(mandate);

          reply.send({
            success: true,
            workflow_instance_update_result: Boolean(
              workflow_instance_update_result[0] === 1
            ),
          });
        } catch (error) {
          let error_log = {
            api: "v1/workflow_instance/edit",
            activity: "EDIT_WORKFLOW_INSTANCE",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/workflow_instance_log/create",
      { schema: CreateWorkflowInstanceLogSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "WorkflowInstance.Create");

          const { params } = request.body;

          const workflow_instance = await WorkflowInstance.findOne({
            where: {
              uuid: params["workflow_instance_uuid"],
            },
          });

          if (!workflow_instance) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_WORKFLOW_INSTANCE"],
            });
            return;
          }

          const workflow_instance_log = await WorkflowInstanceLog.create({
            uuid: uuidv4(),
            log: params["log"],
            ip_address: params["ip_address"],
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: request.user.id,
          });

          await LOG_TO_DB(request, {
            activity: "CREATE_WORKFLOW_INSTANCE_LOG",
            params: {
              data: params,
            },
          });

          await workflow_instance_log.setWorkflow_instance(workflow_instance);

          reply.send({
            success: true,
            workflow_instance_log: workflow_instance_log,
          });
        } catch (error) {
          let error_log = {
            api: "v1/workflow_config/create",
            activity: "EDIT_WORKFLOW_CONFIG",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/workflow_instance_log",
      { schema: ListWorkflowInstanceLogSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "WorkflowInstance.List");

          const { params } = request.body;

          const where_query = request.body.params ? request.body.params : {};

          const workflow_instance_log = await WorkflowInstanceLog.findAll({
            where: where_query,
          });

          await LOG_TO_DB(request, {
            activity: "ALL_WORKFLOW_INSTANCE_LOG",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            workflow_instance_log: workflow_instance_log,
          });
        } catch (error) {
          let error_log = {
            api: "v1/workflow_config",
            activity: "ALL_WORKFLOW_INSTANCE_LOG",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/workflow_instance_log/view",
      { schema: ViewWorkflowInstanceLogSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "WorkflowInstance.View");

          const { params } = request.body;

          const workflow_instance_log = await WorkflowInstanceLog.findOne({
            where: {
              uuid: params["uuid"],
            },
          });

          await LOG_TO_DB(request, {
            activity: "VIEW_WORKFLOW_INSTANCE_LOG",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            workflow_instance_log: workflow_instance_log,
          });
        } catch (error) {
          let error_log = {
            api: "v1/workflow_config",
            activity: "ALL_WORKFLOW_INSTANCE_LOG",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/workflow_instance_log/edit",
      { schema: EditWorkflowInstanceLogSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "WorkflowInstance.Edit");

          const { params } = request.body;

          const workflow_instance = await WorkflowInstance.findOne({
            where: {
              uuid: params["workflow_instance_uuid"],
            },
          });

          if (!workflow_instance) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_WORKFLOW_INSTANCE"],
            });
            return;
          }

          const workflow_instance_log_update_result =
            await WorkflowInstanceLog.update(
              APPEND_USER_DATA(request, {
                log: params["log"],
                ip_address: params["ip_address"],
              }),
              {
                where: {
                  uuid: params["uuid"],
                },
              }
            );

          await LOG_TO_DB(request, {
            activity: "EDIT_WORKFLOW_INSTANCE_LOG",
            params: {
              data: params,
            },
          });

          await workflow_instance_log_update_result.setWorkflow_instance(
            workflow_instance
          );

          reply.send({
            success: true,
            workflow_instance_log_update_result:
              workflow_instance_log_update_result,
          });
        } catch (error) {
          let error_log = {
            api: "v1/workflow_instance_log/edit",
            activity: "EDIT_WORKFLOW_INSTANCE_LOG",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post("/mandate_lifecycle", async (request, reply) => {
      try {
        const { params } = request.body;

        await CHECK_PERMISSIONS(request, 'WorkflowInstance.List')

        const company = await Company.findOne({
          where: {
            uuid: params["company_uuid"],
          },
          raw: true,
        });

        if (!company) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_COMPANY"],
          });
          return;
        }

        const company_mandates = await DB_CLIENT.query(
          `
          SELECT TOP 1 (company_name),
          company_uuid, (mandate_uuid), mandate_id, total_size,mandate_date,received_date, rating_process_name,  rating_process_uuid ,bd_name, bd_uuid, gh_name, gh_uuid, ra_uuid, ra_name, activity_to_be_performed,
          activity_code, created_at, updated_at FROM (SELECT DISTINCT(m.uuid) AS mandate_uuid,c.name AS company_name, gh_name, gh_uuid, ra_uuid, ra_name, bd_name, bd_uuid,
          c.uuid AS company_uuid,m.mandate_id, m.total_size, m.mandate_date, m.received_date, rp.name AS rating_process_name, rp.uuid AS rating_process_uuid ,
          a.code AS activity_code, a.name AS activity_to_be_performed, wil.created_at,wil.updated_at   from companies c
          INNER JOIN mandates m ON m.company_id = c.id
          INNER JOIN workflow_instances wi ON wi.mandate_id = m.id
          INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id  = wi.id
          INNER JOIN workflow_configs wc ON wc.id = wil.workflow_config_id 
          INNER JOIN rating_processes rp ON rp.id = wc.rating_process_id
          INNER JOIN activities a ON a.id = wc.current_activity_id 
          LEFT JOIN (SELECT u.full_name AS gh_name, u.id, u.uuid AS gh_uuid from users u LEFT JOIN mandates m2 ON m2.gh_id =u.id ) AS sbq ON sbq.id = m.gh_id 
          LEFT JOIN (SELECT u.full_name AS ra_name, u.id, u.uuid AS ra_uuid from users u LEFT JOIN mandates m2 ON m2.ra_id =u.id ) AS sbq1 ON sbq1.id = m.ra_id
          LEFT JOIN (SELECT u.full_name AS bd_name, u.id, u.uuid AS bd_uuid from users u LEFT JOIN mandates m2 ON m2.bd_id =u.id ) AS sbq2 ON sbq2.id = m.bd_id
           where c.id = :company_id  AND m.is_active = 1 ) AS my_query ORDER BY created_at DESC
        `,
          {
            replacements: {
              company_id: company.id,
            },
            type: QueryTypes.SELECT,
          }
        );

        reply.send({
          success: true,
          company_mandates: company_mandates,
        });
      } catch (error) {
        let error_log = {
          api: "v1/mandate_lifecycle",
          activity: "MANDATE_LIFECYCLE",
          params: {
            error: String(error),
          },
        };
        error_logger.info(JSON.stringify(error_log));
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: error["errors"] ?? String(error),
        });
      }
    });

    fastify.post("/mandate_lifecycle/view", async (request, reply) => {
      try {
        const { params } = request.body;

        await CHECK_PERMISSIONS(request, 'WorkflowInstance.View')

        const mandate = await Mandate.findOne({
          where: {
            uuid: params["mandate_uuid"],
          },
          raw: true,
        });

        let mandate_status = await DB_CLIENT.query(
          `
        SELECT a.code, a.name, rating_process, performer_role, assigner_role, performed_by_user, wil.status, wil.created_at, wil.updated_at FROM workflow_instances_log wil 
INNER JOIN workflow_instances wi ON wi.id = wil.workflow_instance_id
INNER JOIN mandates m ON m.id = wi.mandate_id 
INNER JOIN ( SELECT wc2.id, wc2.current_activity_id, r.name AS performer_role, rp.name AS rating_process FROM workflow_configs wc2 INNER JOIN roles r  ON r.id = wc2.performer_role_id INNER JOIN rating_processes rp ON rp.id = wc2.rating_process_id)
AS sbq ON sbq.id = wil.workflow_config_id 
INNER JOIN ( SELECT wc3.id, wc3.current_activity_id, r.name AS assigner_role FROM workflow_configs wc3 INNER JOIN roles r  ON r.id = wc3.assigner_role_id  ) 
AS sbq1 ON sbq1.id = wil.workflow_config_id
INNER JOIN ( SELECT u.id, u.full_name AS performed_by_user  FROM  users u 
) AS sbq3 ON sbq3.id = wil.performed_by 
INNER JOIN activities a ON a.id = sbq.current_activity_id 
WHERE m.id =  :mandate_id ORDER BY rating_process
        `,
          {
            replacements: {
              mandate_id: mandate.id,
            },
            type: QueryTypes.SELECT,
          }
        );

        let rp_set = [];

        mandate_status = mandate_status.map(el => {
          if(!rp_set.includes(el.rating_process)){
          rp_set.push(el.rating_process);
          }
          return el;
        });

        reply.send({
          success: true,
          mandate_status: mandate_status,
          rating_processes: rp_set
        });
      } catch (error) {
        let error_log = {
          api: "v1/mandate_lifecycle/view",
          activity: "MANDATE_LIFECYCLE_VIEW",
          params: {
            error: String(error),
          },
        };
        error_logger.info(JSON.stringify(error_log));
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: error["errors"] ?? String(error),
        });
      }
    });

    fastify.post("/transfer_cases", async (request, reply) => {
      try {

        const { params } = request.body;

        await CHECK_PERMISSIONS(request, 'WorkflowInstance.List')

        const user_with_role = await User.findOne({
          where: {
            uuid: params["from_user_uuid"]
          },
          raw: true
        })

        console.log(user_with_role);

        const mandates = await DB_CLIENT.query(`
        SELECT c.name AS company_name, m.mandate_id AS mandate_id, u.full_name AS rating_analyst, usr.full_name AS group_head, usrs.full_name AS rating_head
        from mandates m
        INNER JOIN companies c ON c.id = m.company_id
        LEFT JOIN users u ON u.id = m.gh_id
        LEFT JOIN users usr ON usr.id = m.ra_id
        LEFT JOIN users usrs ON usrs.id = m.rh_id
        LEFT JOIN users usrr ON usrr.id = m.bd_id
        WHERE m.ra_id = :user_id OR m.gh_id = :user_id OR m.rh_id = :user_id OR m.bd_id = :user_id
        `, {
          replacements: {
            user_id: user_with_role.id
          },
          type: QueryTypes.SELECT
        })

        console.log(mandates);

        reply.send({
          success: true,
          mandates: mandates
        })

      } catch(error) {
        let error_log = {
          api: "v1/transfer_cases",
          activity: "TRANSFER_CASES",
          params: {
            error: String(error),
          },
        };
        error_logger.info(JSON.stringify(error_log));
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: error["errors"] ?? String(error),
        });
      }
    })

    fastify.post(
      "/view_surveillance/mandates",
      async (request, reply) => {
        try {

          const { params } = request.body;

          await CHECK_PERMISSIONS(request, 'WorkflowInstance.List')

          const company = await Company.findOne({
            where: {
              uuid: params["company_uuid"],
              is_active: true
            },
            raw: true
          });

          if (!company) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO_COMPANY",
            });
            return;
          }

          let result = await DB_CLIENT.query(`
        SELECT DISTINCT m.mandate_id FROM mandates m 
INNER JOIN companies c ON c.id = m.company_id 
INNER JOIN workflow_instances wi ON wi.mandate_id = m.id 
INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id = wi.id  
 WHERE c.id = :company_id AND wi.is_active = 1 AND wil.is_active = 1
        `, {
          replacements: {
            company_id: company.id
          },
          type: QueryTypes.SELECT
        })

        let mandates = [];

        if(result.length === 0){
         mandates = await DB_CLIENT.query(`
        SELECT DISTINCT ti.uuid AS transaction_instrument_uuid, fy.id AS financial_year_id,fy.reference_date AS financial_year,m.updated_at, m.mandate_id,m.uuid AS mandate_uuid,u.uuid AS rating_analyst_uuid,u.employee_code  AS rating_analyst_employee_code,
u.full_name AS rating_analyst, ti.instrument_size, ic.category_name AS instrument_category_name, isc.category_name AS instrument_sub_category_name, i.name AS instrument FROM mandates m 
INNER JOIN companies c ON c.id = m.company_id 
INNER JOIN workflow_instances wi ON wi.mandate_id = m.id 
INNER JOIN financial_years fy ON fy.id = wi.financial_year_id
INNER JOIN transaction_instruments ti ON ti.mandate_id = m.id 
INNER JOIN instrument_categories ic ON ic.id = ti.instrument_category_id 
INNER JOIN instrument_sub_categories isc ON isc.id = ti.instrument_sub_category_id 
INNER JOIN instruments i ON i.id = ti.instrument_id 
INNER JOIN (SELECT wil.workflow_instance_id, wil.workflow_config_id FROM workflow_instances_log wil WHERE wil.is_active = 0 ) AS sbq ON sbq.workflow_instance_id = wi.id 
INNER JOIN workflow_configs wc ON wc.id = sbq.workflow_config_id
INNER JOIN users u ON u.id = m.ra_id 
INNER JOIN instrument_details id ON id.transaction_instrument_id = ti.id 
 WHERE c.id = :company_id AND wc.rating_process_id = 2 AND wc.is_last_activity = 1 AND wi.is_active = 1
 AND ti.is_active = 1 AND m.is_active = 1 AND id.is_active != 1
 ORDER BY m.updated_at DESC
        `, {
          replacements: {
            company_id: company.id
          },
          type: QueryTypes.SELECT
        })
      }

          await LOG_TO_DB(request, {
            activity: "GET_MANDATE_FOR_SURVEILLANCE",
            params: {
              data: params,
            },
          });


          reply.send({
            success: true,
            mandates:
              mandates,
          });
        } catch (error) {
          let error_log = {
            api: "v1/view_surveillance/mandates",
            activity: "GET_MANDATE_FOR_SURVEILLANCE",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/initiate/rating_cycle",
      async (request, reply) => {
        try {

          let { params } = request.body;

          await CHECK_PERMISSIONS(request, 'WorkflowInstance.View')

          const rating_cycle = await RatingProcess.findOne({
            where: {
              uuid: request.body["rating_cycle_uuid"],
              is_active: true
            },
            raw: true
          });

          if (!rating_cycle) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO_PROCESS_FOUND",
            });
            return;
          }

          const financial_year = await FinancialYear.findOne({
            where: {
              uuid: request.body["financial_year_uuid"],
              is_active: true
            },
            raw: true
          });

          if (!financial_year) {
            reply.statusCode = 403;
            reply.send({
              success: false,
              error: "NO_FINANCIAL_YEAR_FOUND",
            });
            return;
          }

          const rating_analyst = await User.findOne({
            where: {
              uuid: request.body["rating_analyst_uuid"],
              is_active: true
            },
            raw: true
          });

          if (!rating_analyst) {
            reply.statusCode = 403;
            reply.send({
              success: false,
              error: "NO_RATING_ANALYST_FOUND",
            });
            return;
          }

          const company = await Company.findOne({
            where: {
              uuid: request.body.company_uuid,
              is_active: true
            },
            raw: true
          })

          if (!company) {
            reply.statusCode = 403;
            reply.send({
              success: false,
              error: "NO_COMPANY_FOUND",
            });
            return;
          }

          params =  await Promise.all(params.map( async el=> {
            const tra_res = await TransactionInstrument.findOne({
              where: {
                uuid: el.transaction_instrument_uuid,
                is_active: true
              },
              raw: true
            })

            const mandate_res = await Mandate.findOne({
              where: {
                uuid: el.mandate_uuid,
                is_active: true
              },
              raw: true
            });
            
            el.transaction_instrument_id = tra_res.id;
            el.mandate_id = mandate_res.id;

            return el;
          })
          )

          console.log("params: ", params);

          params.map(async (el)=> {
            const res = await TransactionInstrument.update(
              APPEND_USER_DATA(request, {
                instrument_size: el["instrument_size"]
              }),
              {
                where: {
                  uuid: el.transaction_instrument_uuid,
                },
              }
            );
            
          })

          const my_set = new Set();

          const instrument_bulk_data = params.map(el=>{
            const obj = {
            uuid: uuidv4(),
            instrument_size: el.instrument_size,
            financial_result: request.body["financial_result"],
            quarterly_result: request.body["quarterly_result"],
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: request.user.id,
            transaction_instrument_id: el.transaction_instrument_id,
            rating_process_id: rating_cycle.id,
            financial_year_id: financial_year.id
            }
            my_set.add(el.mandate_id);
            return obj;
          })

          const instrument_detail_create = await InstrumentDetail.bulkCreate(instrument_bulk_data);

          configs = await DB_CLIENT.query(
            `SELECT wc.id FROM workflow_configs wc WHERE wc.current_activity_id IN (SELECT id FROM activities a WHERE a.code = '10250') AND rating_process_id = :rating_process_id               
          `,
            {
              replacements: {
                rating_process_id: rating_cycle.id
              },
              type: QueryTypes.SELECT,
            }
          );

        //   const mandate_ids = params.filter(el=> {
        //     el.mandate_id});

        //   const workflow_instance = await Promise.all(mandate_ids.map(async (el)=> {
        //     const res = await WorkflowInstance.create({
        //       uuid: uuidv4(),
        //       is_active: true,
        //       created_at: new Date(),
        //       updated_at: new Date(),
        //       assigned_at: new Date(),
        //       performed_at: new Date(),
        //       company_id: company.id,
        //       mandate_id: el.mandate_id,
        //       financial_year_id: financial_year.id,
        //       rating_process_id: rating_cycle.id
        //     }
        //     )
            
        //  const instance_log = await WorkflowInstanceLog.create({
        //   uuid: uuidv4(),
        //   log: "ASSIGNED TO RA",
        //   is_active: true,
        //   created_at: new Date(),
        //   updated_at: new Date(),
        //   assigned_at: new Date(),
        //   performed_at: new Date(),
        //   created_by: request.user.id,
        //   updated_by: request.user.id,
        //   assigned_by: request.user.id,
        //   performed_by: rating_analyst.id,
        //   workflow_config_id: configs[0].id,
        //   workflow_instance_id: res.id
        //     });
        //   })
        //   )

          console.log("my_set: ",my_set);

          for (const item of my_set) {

            await DB_CLIENT.query(
              `UPDATE mandates SET mandate_status= null where id= :mandate_id`,
              {
                replacements: {
                  ra_id: rating_analyst.id,
                  mandate_id: item,
                },
                type: QueryTypes.UPDATE,
              }
            );

            const res = await WorkflowInstance.create({
              uuid: uuidv4(),
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
              assigned_at: new Date(),
              performed_at: new Date(),
              company_id: company.id,
              mandate_id: item,
              financial_year_id: financial_year.id,
              rating_process_id: rating_cycle.id
            }
            )
            
            const instance_log = await WorkflowInstanceLog.create({
          uuid: uuidv4(),
          log: "ASSIGNED TO RA",
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          assigned_at: new Date(),
          performed_at: new Date(),
          created_by: request.user.id,
          updated_by: request.user.id,
          assigned_by: request.user.id,
          performed_by: rating_analyst.id,
          workflow_config_id: configs[0].id,
          workflow_instance_id: res.id
            });

            console.log("Initiate Rating Cycle mandateId : ",item);

            await DB_CLIENT.query(
              `INSERT into mandates (mandate_source, mandate_status,mandate_date,mandate_type,total_size,initial_fee_charged,bases_point,remark,surveillance_fee_charged,minimum_surveillance_fee,surveillance_bases_point,received_date,is_verified,is_active,created_at,updated_at,created_by,company_id,uuid,mandate_id,bd_id,gh_id,ra_id,rh_id)
              SELECT mandate_source, mandate_status,mandate_date,mandate_type,total_size,initial_fee_charged,bases_point,remark,surveillance_fee_charged,minimum_surveillance_fee,surveillance_bases_point,received_date,is_verified,0,created_at,updated_at,created_by,company_id,uuid = :uuid,mandate_id,bd_id,gh_id,ra_id,rh_id
              from mandates
              where id = :mandate_id`,
              {
                replacements: {
                  uuid: uuidv4(),
                  mandate_id: item,
                },
                type: QueryTypes.INSERT,
              }
            );
          }

          await LOG_TO_DB(request, {
            activity: "INITIATE_RATING_CYCLE",
            params: {
              data: params,
            },
          });


          reply.send({
            success: true,
            bulk_data:
            instrument_detail_create,
          });
        } catch (error) {
          let error_log = {
            api: "v1/initiate/rating_cycle",
            activity: "INITIATE_RATING_CYCLE",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post("/transfer_cases/edit", async (request, reply) => {
      try {

        const { params } = request.body;

        await CHECK_PERMISSIONS(request, 'WorkflowInstance.Edit')

        const user = await User.findOne({
          where: {
            uuid: params["to_user_uuid"]
          },
          raw: true
        })

        const role = await Role.findOne({
          where: {
            uuid: params["role_uuid"]
          },
          raw: true
        })

        var update_result = ''
        switch(role.name) {
          case "Rating Analyst": 
          update_result = await Mandate.update(APPEND_USER_DATA(request, {
            ra_id: user.id
          }),{
            where: {
              ra_id: user.id,
              mandate_id: params["mandate_id"]
            }
          })
          case "Group Head":
          update_result = await Mandate.update(APPEND_USER_DATA(request, {
            gh_id: user.id
          }), {
              where: {
                gh_id: user.id,
                mandate_id: params["mandate_id"]
              }
            })
          case "Rating Head":
          update_result = await Mandate.update(APPEND_USER_DATA(request, {
              rh_id: user.id
            }), {
              where: {
                rh_id: user.id,
                mandate_id: params["mandate_id"]
              }
            })
          case "Business Development Admin": 
          case "Business Development Coordinator":
          update_result = await Mandate.update(APPEND_USER_DATA(request, {
              bd_id: user.id
            }), {
              where: {
                bd_id: user.id,
                mandate_id: params["mandate_id"]
              }
            })
            
        }

        reply.send({
          success: true,
          update_result: update_result
        })

      } catch(error) {
        let error_log = {
          api: "v1/transfer_cases/edit",
          activity: "EDIT_TRANSFER_CASES",
          params: {
            error: String(error),
          },
        };
        error_logger.info(JSON.stringify(error_log));
        reply.statusCode = 422;
        reply.send({
          success: false,
          error: error["errors"] ?? String(error),
        });
      }
    })

    fastify.post(
      "/view_documents",
      async (request, reply) => {
        try {

          const { params } = request.body;

          await CHECK_PERMISSIONS(request, 'WorkflowInstance.List')

          const company = await Company.findOne({
            where: {
              uuid: params["company_uuid"],
              is_active: true
            },
            raw: true
          });

          if (!company) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO_COMPANY",
            });
            return;
          }

          const rating_process = await RatingProcess.findOne({
            where: {
              uuid: params["rating_process_uuid"],
              is_active: true
            },
            raw: true
          });

          const financial_year = await FinancialYear.findOne({
            where: {
              uuid: params["financial_year_uuid"],
              is_active: true
            },
            raw: true
          });

        const mandates = await DB_CLIENT.query(`
        SELECT DISTINCT ti.uuid AS transaction_instrument_uuid,m.updated_at, m.mandate_id,m.uuid AS mandate_uuid,u.uuid AS rating_analyst_uuid,u.employee_code  AS rating_analyst_employee_code,
u.full_name AS rating_analyst, ti.instrument_size, ic.category_name AS instrument_category_name, isc.category_name AS instrument_sub_category_name, i.name AS instrument FROM mandates m 
INNER JOIN companies c ON c.id = m.company_id 
INNER JOIN workflow_instances wi ON wi.mandate_id = m.id 
INNER JOIN transaction_instruments ti ON ti.mandate_id = m.id 
INNER JOIN instrument_categories ic ON ic.id = ti.instrument_category_id 
INNER JOIN instrument_sub_categories isc ON isc.id = ti.instrument_sub_category_id 
INNER JOIN instruments i ON i.id = ti.instrument_id 
INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id = wi.id 
INNER JOIN workflow_configs wc ON wc.id = wil.workflow_config_id
INNER JOIN users u ON u.id = m.ra_id 
 WHERE c.id = :company_id AND wc.rating_process_id = 2 AND wc.is_last_activity = 1 AND wi.is_active = 1
 ORDER BY m.updated_at DESC
        `, {
          replacements: {
            company_id: company.id
          },
          type: QueryTypes.SELECT
        })

          await LOG_TO_DB(request, {
            activity: "GET_MANDATE_FOR_SURVEILLANCE",
            params: {
              data: params,
            },
          });


          reply.send({
            success: true,
            mandates:
              mandates,
          });
        } catch (error) {
          let error_log = {
            api: "v1/view_surveillance/mandates",
            activity: "GET_MANDATE_FOR_SURVEILLANCE",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    fastify.post(
      "/hierarchy/users",
      async (request, reply) => {
        try {

          const { params } = request.body;

          const role = await Role.findOne({
            where: {
              uuid: params["role_uuid"],
              is_active: true
            },
            raw: true
          });

          if (!role) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO_ROLE",
            });
            return;
          }

          let users = [];

        if(params['is_hierarchy']){
        users = await DB_CLIENT.query(`
        SELECT * FROM users u
        INNER JOIN user_has_roles uhr ON uhr.user_id = u.id
        WHERE u.id IN ( SELECT urt.user_id  FROM user_reports_to urt WHERE urt.report_to_user_id =:user_id)
        AND uhr.role_id =:role_id
        `, {
          replacements: {
            user_id: request.user.id,
            role_id: role.id
          },
          type: QueryTypes.SELECT
        })
      }else{
        users = await DB_CLIENT.query(`
        SELECT * FROM users u
        INNER JOIN user_has_roles uhr ON uhr.user_id = u.id
        WHERE uhr.role_id =:role_id
        `, {
          replacements: {
            user_id: request.user.id,
            role_id: role.id
          },
          type: QueryTypes.SELECT
        })
      }

          await LOG_TO_DB(request, {
            activity: "GET_USERS_HIERARCHY",
            params: {
              data: params,
            },
          });


          reply.send({
            success: true,
            users:
              users,
          });
        } catch (error) {
          let error_log = {
            api: "v1/hierarchy/users",
            activity: "GET_USERS_HIERARCHY",
            params: {
              error: String(error),
            },
          };
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );

    done();
  });
}

module.exports = {
  workflows_routes,
};
