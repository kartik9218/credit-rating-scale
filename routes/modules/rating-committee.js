const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const {
  rating_committee_meetings,
  rating_verification,
  committee_agenda,
  committee_voting,
  committee_minutes,
} = require("../../constants/rating_committee_json");
const { error_logger } = require("../../loki-push-agent");
const { LOG_TO_DB } = require("../../logger");
const {
  RatingCommitteeType,
  RatingCommitteeMeeting,
  RatingCommitteeMeetingCategory,
  RatingCommitteeMeetingAttendenceConf,
  RatingCommitteeMeetingRegister,
  RatingCommitteeVoting,
  RatingCommitteeVotingMetadata,
  CommitteeDocument,
  MeetingHasMember,
  CommitteeMinutes,
  Outlook,
} = require("../../models/modules/rating-committee");
const {
  APPEND_USER_DATA,
  CHECK_PERMISSIONS,
  UPLOAD_DOCUMENT,
  UPLOAD_TO_AZURE_STORAGE,
} = require("../../helpers");
const {
  User,
  Mandate,
  Company,
  BranchOffice,
} = require("../../models/modules/onboarding");
const {
  InstrumentDetail,
  InstrumentCategory,
  InstrumentSubCategory,
  Instrument,
  TransactionInstrument,
  RatingModel,
  RatingProcess,
  RatingSymbolMaster,
  RatingSymbolMapping,
} = require("../../models/modules/rating-model");
const { DB_CLIENT } = require("../../db");
const { QueryTypes, Op, Sequelize, where } = require("sequelize");
const {
  CreateRatingCommitteeSchema,
  CreateCommitteeAgendaSchema,
  CreateRatingCommitteeVotingSchema,
} = require("../../schemas/RatingCommittee");
const { LANG_DATA } = require("../../lang");
const { get_args } = require("./inbox");
const { WorkflowDocument } = require("../../models/modules/workflow");
const L = LANG_DATA();

async function rating_committee_routes(fastify) {
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

    fastify.post("/rating_committee_types", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "CommitteeTypes.List");
        const { params } = request.body;

        let whereClause = Object.keys(params).length === 0 ? {} : params;
        const rating_committees = await RatingCommitteeType.findAll({
          where: whereClause,
          attributes: { exclude: ["id"] },
        });

        await LOG_TO_DB(request, {
          activity: "LIST_RATING_COMMITTEE_TYPE",
          params: {
            data: params,
          },
        });

        reply.send({
          success: true,
          rating_committees: rating_committees,
        });
      } catch (error) {
        let error_log = {
          api: "v1/rating_committees",
          activity: "LIST_RATING_COMMITTEE_TYPE",
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

    fastify.post("/rating_committee_types/create", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "CommitteeTypes.Create");
        const { params } = request.body;

        const rating_committee = await RatingCommitteeType.create({
          uuid: uuidv4(),
          name: params["name"],
          short_name: params["short_name"],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
        });

        await LOG_TO_DB(request, {
          activity: "CREATE_RATING_COMMITTEE_TYPE",
          params: {
            data: params,
          },
        });

        reply.send({
          success: true,
          rating_committee: rating_committee.uuid,
        });
      } catch (error) {
        let error_log = {
          api: "v1/rating_committee/create",
          activity: "CREATE_RATING_COMMITTEE_TYPE",
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

    fastify.post("/rating_committee_types/view", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "CommitteeTypes.View");

        const rating_committee_type = await RatingCommitteeType.findOne({
          where: {
            uuid: request.body.params.uuid,
          },
          attributes: { exclude: ["id"] },
        });

        await LOG_TO_DB(request, {
          activity: "VIEW_RATING_COMMITTEE_TYPE",
          params: {
            data: request.body.params,
          },
        });

        reply.send({
          success: true,
          rating_committee_type: rating_committee_type,
        });
      } catch (error) {
        let error_log = {
          api: "v1/rating_committee_types/view",
          activity: "VIEW_RATING_COMMITTEE_TYPE",
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

    fastify.post("/rating_committee_types/edit", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "CommitteeTypes.Edit");
        const { params } = request.body;

        const rating_committee_type = await RatingCommitteeType.update(
          APPEND_USER_DATA(request, {
            name: params["name"],
            short_name: params["short_name"],
            is_active: params["is_active"],
          }),
          {
            where: {
              uuid: params["uuid"],
            },
          }
        );
        await LOG_TO_DB(request, {
          activity: "EDIT_RATING_COMMITTEE_TYPE",
          params: {
            data: params,
          },
        });

        reply.send({
          success: true,
          rating_committee_type_update_done: Boolean(
            rating_committee_type[0] === 1
          ),
        });
      } catch (error) {
        let error_log = {
          api: "v1/interaction_type/edit",
          activity: "EDIT_INTERACTION_TYPE",
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

    fastify.post(
      "/rating_committee_meeting_categories",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(
            request,
            "CommitteeMeetingCategories.List"
          );
          const { params } = request.body;

          let whereClause = Object.keys(params).length === 0 ? {} : params;
          const rating_committee_meeting_categories =
            await RatingCommitteeMeetingCategory.findAll({
              where: whereClause,
              attributes: { exclude: ["id"] },
            });

          await LOG_TO_DB(request, {
            activity: "LIST_RATING_COMMITTEE_MEETING_CATEGORY",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            rating_committee_meeting_categories:
              rating_committee_meeting_categories,
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_committee_meeting_categories",
            activity: "LIST_RATING_COMMITTEE_MEETING_CATEGORY",
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
      "/rating_committee_meeting_categories/create",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(
            request,
            "CommitteeMeetingCategories.Create"
          );
          const { params } = request.body;

          const rating_committee_meeting_category =
            await RatingCommitteeMeetingCategory.create({
              uuid: uuidv4(),
              name: params["name"],
              description: params["description"],
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
              created_by: request.user.id,
            });

          await LOG_TO_DB(request, {
            activity: "CREATE_RATING_COMMITTEE_MEETING_CATEGORY",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            rating_committee_meeting_category:
              rating_committee_meeting_category.uuid,
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_committee_meeting_categories/create",
            activity: "CREATE_RATING_COMMITTEE_MEETING_CATEGORY",
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
      "/rating_committee_meeting_categories/view",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(
            request,
            "CommitteeMeetingCategories.View"
          );
          const rating_committee_meeting_category =
            await RatingCommitteeMeetingCategory.findOne({
              where: {
                uuid: request.body.params.uuid,
              },
              attributes: { exclude: ["id"] },
            });

          await LOG_TO_DB(request, {
            activity: "VIEW_RATING_COMMITTEE_MEETING_CATEGORY",
            params: {
              data: request.body.params,
            },
          });

          reply.send({
            success: true,
            rating_committee_meeting_category:
              rating_committee_meeting_category,
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_committee_meeting_categories/view",
            activity: "VIEW_RATING_COMMITTEE_MEETING_CATEGORY",
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
      "/rating_committee_meeting_categories/edit",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(
            request,
            "CommitteeMeetingCategories.Edit"
          );
          const { params } = request.body;

          const rating_committee_meeting_category =
            await RatingCommitteeMeetingCategory.update(
              APPEND_USER_DATA(request, {
                name: params["name"],
                description: params["description"],
                is_active: params["is_active"],
              }),
              {
                where: {
                  uuid: params["uuid"],
                },
              }
            );
          await LOG_TO_DB(request, {
            activity: "EDIT_RATING_COMMITTEE_MEETING_CATEGORY",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            rating_committee_meeting_category_update_done: Boolean(
              rating_committee_meeting_category[0] === 1
            ),
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_committee_meeting_categories/edit",
            activity: "EDIT_RATING_COMMITTEE_MEETING_CATEGORY",
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
      "/rating_committee_meeting_attendence_confs",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeAttendance.List");
          const { params } = request.body;

          let where_query = {};

          if ("is_active" in params) {
            where_query["is_active"] = params["is_active"];
          }

          if ("conf_day" in params) {
            where_query["conf_day"] = params["conf_day"];
          }

          const rating_committee_type = await RatingCommitteeType.findOne({
            where: {
              uuid: params["rating_committee_type_uuid"],
              is_active: true,
            },
            raw: true,
          });

          if (!rating_committee_type) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_TYPE_FOUND"],
            });
            return;
          }

          const rating_committee_meeting_category =
            await RatingCommitteeMeetingCategory.findOne({
              where: {
                uuid: params["rating_committee_meeting_category_uuid"],
                is_active: true,
              },
              raw: true,
            });

          if (!rating_committee_meeting_category) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_MEETING_CATEGORY_FOUND"],
            });
            return;
          }

          where_query["rating_committee_meeting_category_id"] =
            rating_committee_meeting_category.id;
          where_query["rating_committee_type_id"] = rating_committee_type.id;

          const rating_committee_meeting_attendence_confs =
            await RatingCommitteeMeetingAttendenceConf.findAll({
              where: where_query,
              attributes: { exclude: ["id"] },
              include: [
                {
                  model: User,
                  as: "member",
                  attributes: { exclude: ["id"] },
                },
                {
                  model: RatingCommitteeType,
                  as: "rating_committee_type",
                  attributes: { exclude: ["id"] },
                },
                {
                  model: RatingCommitteeMeetingCategory,
                  as: "rating_committee_meeting_category",
                  attributes: { exclude: ["id"] },
                },
              ],
            });

          await LOG_TO_DB(request, {
            activity: "LIST_RATING_COMMITTEE_MEETING_ATTENDANCE_CONF",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            rating_committee_meeting_attendence_confs:
              rating_committee_meeting_attendence_confs,
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_committee_meeting_attendence_confs",
            activity: "LIST_RATING_COMMITTEE_MEETING_ATTENDANCE_CONF",
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
      "/rating_committee_meeting_attendence_confs/create",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeAttendance.Create");
          const { params } = request.body;

          if (params.length < 3) {
            reply.statusCode = 403;
            return reply.send({
              success: false,
              error: "Attendance Conf should have more than 2 members",
            });
          }

          const rating_committee_type = await RatingCommitteeType.findOne({
            where: {
              uuid: request.body["rating_committee_type_uuid"],
              is_active: true,
            },
            raw: true,
          });

          if (!rating_committee_type) {
            reply.statusCode = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_TYPE_FOUND"],
            });
            return;
          }

          const rating_committee_meeting_category =
            await RatingCommitteeMeetingCategory.findOne({
              where: {
                uuid: request.body["rating_committee_meeting_category_uuid"],
                is_active: true,
              },
              raw: true,
            });

          if (!rating_committee_meeting_category) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_MEETING_CATEGORY_FOUND"],
            });
            return;
          }

          const bulk_data = params.map((el) => {
            (el.uuid = uuidv4()),
              (el.conf_day = request.body["conf_day"]),
              (el.is_active = true),
              (el.created_at = new Date()),
              (el.updated_at = new Date()),
              (el.created_by = request.user.id),
              (el.member_id = el.member_id),
              (el.rating_committee_type_id = rating_committee_type.id),
              (el.rating_committee_meeting_category_id =
                rating_committee_meeting_category.id);
            return el;
          });

          const rating_committee_meeting_attendence_conf =
            await RatingCommitteeMeetingAttendenceConf.bulkCreate(bulk_data);

          await LOG_TO_DB(request, {
            activity: "CREATE_RATING_COMMITTEE_MEETING_ATTENDANCE_CONF",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            rating_committee_meeting_attendence_conf:
              rating_committee_meeting_attendence_conf,
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_committee_meeting_attendence_confs/create",
            activity: "CREATE_RATING_COMMITTEE_MEETING_ATTENDANCE_CONF",
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
      "/rating_committee_meeting_attendence_confs/view",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeAttendance.View");

          const rating_committee_meeting_attendence_conf =
            await RatingCommitteeMeetingAttendenceConf.findOne({
              where: {
                uuid: request.body.params.uuid,
              },
              attributes: { exclude: ["id"] },
              include: [
                {
                  model: User,
                  as: "member",
                  attributes: { exclude: ["id"] },
                },
                {
                  model: RatingCommitteeType,
                  as: "rating_committee_type",
                  attributes: { exclude: ["id"] },
                },
                {
                  model: RatingCommitteeMeetingCategory,
                  as: "rating_committee_meeting_category",
                  attributes: { exclude: ["id"] },
                },
              ],
            });

          await LOG_TO_DB(request, {
            activity: "VIEW_RATING_COMMITTEE_MEETING_ATTENDANCE_CONF",
            params: {
              data: request.body.params,
            },
          });

          reply.send({
            success: true,
            rating_committee_meeting_attendence_conf:
              rating_committee_meeting_attendence_conf,
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_committee_meeting_attendence_confs/view",
            activity: "VIEW_RATING_COMMITTEE_MEETING_ATTENDANCE_CONF",
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
      "/rating_committee_meeting_attendence_confs/edit",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeAttedance.Edit");
          const { params } = request.body;

          const rating_committee_type = await RatingCommitteeType.findOne({
            where: {
              uuid: request.body["rating_committee_type_uuid"],
              is_active: true,
            },
          });

          if (!rating_committee_type) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_TYPE_FOUND"],
            });
            return;
          }

          const rating_committee_meeting_category =
            await RatingCommitteeMeetingCategory.findOne({
              where: {
                uuid: request.body["rating_committee_meeting_category_uuid"],
                is_active: true,
              },
            });

          if (!rating_committee_meeting_category) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_MEETING_CATEGORY_FOUND"],
            });
            return;
          }

          const bulk_data = params.map((el) => {
            (el.uuid = el.uuid ? el.uuid : uuidv4()),
              (el.conf_day = request.body["conf_day"]),
              (el.created_at = new Date()),
              (el.updated_at = new Date()),
              (el.updated_by = request.user.id),
              (el.rating_committee_type_id = rating_committee_type.id),
              (el.rating_committee_meeting_category_id =
                rating_committee_meeting_category.id);
            return el;
          });

          const result = bulk_data.map(async (el) => {
            await RatingCommitteeMeetingAttendenceConf.upsert(el);
          });

          await LOG_TO_DB(request, {
            activity: "EDIT_RATING_COMMITTEE_MEETING_ATTENDANCE_CONF",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            rating_committee_meeting_attendence_conf_update_done: result,
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_committee_meeting_attendence_confs/edit",
            activity: "EDIT_RATING_COMMITTEE_MEETING_ATTENDANCE_CONF",
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

    fastify.post("/rating_committee_meetings", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "CommitteeMeeting.List");
        const { params } = request.body;

        let mhm = await MeetingHasMember.findAll({
          where: {
            member_id: request.user.id,
            is_active: true,
          },
          attributes: ["rating_committee_meeting_id"],
          raw: true,
        });

        mhm = mhm.map((el) => el.rating_committee_meeting_id);

        console.log("mhm: ", mhm);

        let whereClause = Object.keys(params).length === 0 ? {} : params;

        if (request.active_role_name === "Committee Member") {
          whereClause["id"] = mhm;
        }

        let rating_committee_meetings = await RatingCommitteeMeeting.findAll({
          where: whereClause,
          raw: true,
          nest: true,
          include: [
            {
              model: RatingCommitteeType,
              as: "rating_committee_type",
              attributes: { exclude: ["id"] },
            },
            {
              model: RatingCommitteeMeetingCategory,
              as: "rating_committee_meeting_category",
              attributes: { exclude: ["id"] },
            },
          ],
          order: [["meeting_at", "ASC"]],
        });

        rating_committee_meetings.map((el) => {
          const db_date = moment(el.meeting_at).format("YYYY-MM-DD HH:mm:ss");

          let d = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
          d = moment(d).add(5, "hours").format("YYYY-MM-DD HH:mm:ss");
          d = moment(d).add(30, "minutes").format("YYYY-MM-DD HH:mm:ss");

          if (db_date <= d && el.status != "Completed") {
            el.status = "Live";
          }
          return el;
        });

        await LOG_TO_DB(request, {
          activity: "LIST_RATING_COMMITTEE_MEETINGS",
          params: {
            data: params,
          },
        });

        reply.send({
          success: true,
          rating_committee_meetings: rating_committee_meetings,
        });
      } catch (error) {
        let error_log = {
          api: "v1/rating_committee_meetings",
          activity: "LIST_RATING_COMMITTEE_MEETINGS",
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

    fastify.post(
      "/rating_committee_meetings/create",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeMeeting.Create");
          const { params } = request.body;

          if (
            !(
              request.active_role_name === "Compliance" ||
              request.active_role_name === "System Admin"
            )
          ) {
            reply.status_code = 403;
            return reply.send({
              success: false,
              error: "You are not authorised to create meeting",
            });
          }

          const options = { weekday: "long" };
          let week_day = new Date(params["meeting_at"]).toLocaleTimeString(
            "en-us",
            options
          );

          week_day = week_day.split(" ")[0];

          console.log("week_day: ", week_day);

          const rating_committee_type = await RatingCommitteeType.findOne({
            where: {
              uuid: params["rating_committee_type_uuid"],
              is_active: true,
            },
            raw: true,
          });

          if (!rating_committee_type) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_TYPE_FOUND"],
            });
            return;
          }

          const rating_committee_meeting_category =
            await RatingCommitteeMeetingCategory.findOne({
              where: {
                uuid: params["rating_committee_meeting_category_uuid"],
                is_active: true,
              },
              raw: true,
            });

          if (!rating_committee_meeting_category) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_MEETING_CATEGORY_FOUND"],
            });
            return;
          }

          const member_ids = await DB_CLIENT.query(
            `Select rcmac.is_chairman, rcmac.member_id  from rating_committee_meeting_attendence_conf rcmac 
          INNER JOIN rating_committee_meeting_categories rcmc ON rcmc.id = rcmac.rating_committee_meeting_category_id 
          INNER JOIN rating_committee_types rct ON rct.id = rcmac.rating_committee_type_id 
          INNER JOIN users u ON u.id = rcmac.member_id WHERE 
          rcmc.id = :rcmc_id AND
          rct.id = :rct_id AND
          u.is_active = 1 AND
          rcmac.is_active = 1 AND
          rcmac.conf_day = :conf`,
            {
              replacements: {
                rcmc_id: rating_committee_meeting_category.id,
                rct_id: rating_committee_type.id,
                conf: week_day,
              },
              type: QueryTypes.SELECT,
            }
          );

          const rating_committee_meeting = await RatingCommitteeMeeting.create({
            uuid: uuidv4(),
            meeting_at: params["meeting_at"],
            meeting_type: params["meeting_type"],
            status: "Upcoming",
            number_of_cases: 0,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: request.user.id,
            rating_committee_type_id: rating_committee_type.id,
            rating_committee_meeting_category_id:
            rating_committee_meeting_category.id,
          });

          const bulk_data = [];

          console.log("member_ids: ", member_ids);

          member_ids.map((el) => {
            let obj = {};
            obj.member_id = el.member_id;
            obj.is_chairman = el.is_chairman;
            obj.rating_committee_meeting_id = rating_committee_meeting.id;

            bulk_data.push(obj);
          });

          console.log("bulk_data: ", bulk_data);

          bulk_data.map(async (el) => {
            const result = await DB_CLIENT.query(
              `INSERT INTO meeting_has_members (is_chairman,is_active,member_id,rating_committee_meeting_id) values (:is_chairman,1,:member_id,:rating_committee_meeting_id)`,
              {
                replacements: {
                  is_chairman: el.is_chairman,
                  member_id: el.member_id,
                  rating_committee_meeting_id: el.rating_committee_meeting_id,
                },
                type: QueryTypes.INSERT,
              }
            );
          });

          // const bulk_response =  await MeetingHasMember.bulkCreate(bulk_data);

          await LOG_TO_DB(request, {
            activity: "CREATE_RATING_COMMITTEE_MEETINGS",
            params: {
              data: params,
            },
          });

          return reply.send({
            success: true,
            rating_committee_meeting_uuid: rating_committee_meeting.uuid,
            // bulk_response: bulk_response
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_committee_meetings/create",
            activity: "CREATE_RATING_COMMITTEE_MEETINGS",
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

    fastify.post("/rating_committee_meetings/view", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "CommitteeMeeting.View");
        const rating_committee_meeting = await RatingCommitteeMeeting.findOne({
          where: {
            uuid: request.body.params.uuid,
          },
          include: [
            {
              model: RatingCommitteeType,
              as: "rating_committee_type",
              attributes: { exclude: ["id"] },
            },
            {
              model: RatingCommitteeMeetingCategory,
              as: "rating_committee_meeting_category",
              attributes: { exclude: ["id"] },
            },
          ],
          raw: true,
          nest: true,
        });

        const db_date = moment(rating_committee_meeting.meeting_at).format(
          "YYYY-MM-DD HH:mm:ss"
        );

        let d = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
        d = moment(d).add(5, "hours").format("YYYY-MM-DD HH:mm:ss");
        d = moment(d).add(30, "minutes").format("YYYY-MM-DD HH:mm:ss");

        if (db_date <= d && rating_committee_meeting.status != "Completed") {
          rating_committee_meeting.status = "Live";
        }

        await LOG_TO_DB(request, {
          activity: "VIEW_RATING_COMMITTEE_MEETINGS",
          params: {
            data: request.body.params,
          },
        });

        reply.send({
          success: true,
          rating_committee_meeting: rating_committee_meeting,
        });
      } catch (error) {
        let error_log = {
          api: "v1/rating_committee_meetings/view",
          activity: "VIEW_RATING_COMMITTEE_MEETINGS",
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

    fastify.post(
      "/rating_committee_meetings/delete_member",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeMeeting.Edit");
          const { params } = request.body;

          const rating_committee_meeting_object =
            await RatingCommitteeMeeting.findOne({
              where: {
                uuid: params.rating_committee_meeting_uuid,
              },
              raw: true,
            });

          if (!rating_committee_meeting_object) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_MEETING_FOUND"],
            });
            return;
          }

          const member_count = await DB_CLIENT.query(
            `SELECT COUNT(1) AS member_count FROM meeting_has_members mhm
            INNER JOIN rating_committee_meetings rcm ON rcm.id = mhm.rating_committee_meeting_id 
            WHERE rating_committee_meeting_id = :rating_committee_meeting_id`,
            {
              replacements: {
                rating_committee_meeting_id: rating_committee_meeting_object.id,
              },
              type: QueryTypes.SELECT,
            }
          );

          if (member_count[0].member_count < 3) {
            reply.statusCode = 403;
            return reply.send({
              success: false,
              error: "Meeting Members can't be less than 3",
            });
          }

          const member = await User.findOne({
            where: {
              uuid: params.member_uuid,
              is_active: true,
            },
            raw: true,
          });

          if (!member) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO_MEMBER_FOUND",
            });
            return;
          }

          // const meeting_member_update_done = await MeetingHasMember.update(APPEND_USER_DATA(request, {
          //   is_chairman: params["is_chairman"],
          //   is_active: params["is_active"],
          // }),
          // {
          //   where: {
          //     member_id: member.id,
          //   },
          // });

          const result = await DB_CLIENT.query(
            `WITH UpdatedList AS (SELECT TOP(1) is_active, is_chairman FROM meeting_has_members
            WHERE member_id = :member_id AND rating_committee_meeting_id = :rating_committee_meeting_id
            ORDER BY id DESC
            )
            UPDATE UpdatedList SET is_active = :is_active, is_chairman = :is_chairman`,
            {
              replacements: {
                member_id: member.id,
                rating_committee_meeting_id: rating_committee_meeting_object.id,
                is_chairman: params["is_chairman"],
                is_active: params["is_active"],
              },
              type: QueryTypes.UPDATE,
            }
          );

          await LOG_TO_DB(request, {
            activity: "EDIT_RATING_COMMITTEE_MEETING_MEMBERS",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            meeting_member_update_done: result,
          });
        } catch (error) {
          console.log(error);
          let error_log = {
            api: "v1/rating_committee_meetings/delete_member",
            activity: "EDIT_RATING_COMMITTEE_MEETINGS",
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
      }
    );

    fastify.post(
      "/rating_committee_meetings/view_members",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeMeeting.View");
          const { params } = request.body;

          const rating_committee_meeting_object =
            await RatingCommitteeMeeting.findOne({
              where: {
                uuid: params.rating_committee_meeting_uuid,
              },
              raw: true,
            });

          if (!rating_committee_meeting_object) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_MEETING_FOUND"],
            });
            return;
          }

          const result = await DB_CLIENT.query(
            `SELECT u.full_name, u.uuid, u.employee_code, mhm.is_chairman from users u INNER JOIN meeting_has_members mhm ON mhm.member_id = u.id  WHERE rating_committee_meeting_id=:rating_committee_meeting_id AND mhm.is_active = 1`,
            {
              replacements: {
                rating_committee_meeting_id: rating_committee_meeting_object.id,
              },
              type: QueryTypes.SELECT,
            }
          );

          await LOG_TO_DB(request, {
            activity: "VIEW_RATING_COMMITTEE_MEETING_MEMBERS",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            members: result,
          });
        } catch (error) {
          console.log(error);
          let error_log = {
            api: "v1/rating_committee_meetings/view_members",
            activity: "VIEW_RATING_COMMITTEE_MEETING_MEMBERS",
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
      }
    );

    fastify.post(
      "/rating_committee_meetings/add_member",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeMeeting.Create");
          const { params } = request.body;

          const rating_committee_meeting_object =
            await RatingCommitteeMeeting.findOne({
              where: {
                uuid: params.rating_committee_meeting_uuid,
              },
              raw: true,
            });

          if (!rating_committee_meeting_object) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_MEETING_FOUND"],
            });
            return;
          }

          const member = await User.findOne({
            where: {
              uuid: params.member_uuid,
              is_active: true,
            },
            raw: true,
          });

          if (!member) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO_MEMBER_FOUND",
            });
            return;
          }

          const result = await DB_CLIENT.query(
            `INSERT INTO meeting_has_members (is_chairman,is_active,member_id,rating_committee_meeting_id) values (:is_chairman,1,:member_id,:rating_committee_meeting_id)`,
            {
              replacements: {
                is_chairman: params["is_chairman"],
                member_id: member.id,
                rating_committee_meeting_id: rating_committee_meeting_object.id,
              },
              type: QueryTypes.INSERT,
            }
          );

          await LOG_TO_DB(request, {
            activity: "ADD_RATING_COMMITTEE_MEETING_MEMBERS",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            insert_result: Boolean(result[1] !== 0),
          });
        } catch (error) {
          console.log(error);
          let error_log = {
            api: "v1/rating_committee_meetings/add_member",
            activity: "EDIT_RATING_COMMITTEE_MEETINGS",
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
      }
    );

    fastify.post("/rating_committee_meetings/edit", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "CommitteeMeeting.Edit");
        const { params } = request.body;

        const rating_committee_meeting_object =
          await RatingCommitteeMeeting.findOne({
            where: {
              uuid: params.uuid,
            },
          });

        if (!rating_committee_meeting_object) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_COMMITTEE_MEETING_FOUND"],
          });
          return;
        }

        const rating_committee_meeting_category =
          await RatingCommitteeMeetingCategory.findOne({
            where: {
              uuid: params["rating_committee_meeting_category_uuid"],
              is_active: true,
            },
          });

        if (!rating_committee_meeting_category) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_COMMITTEE_MEETING_CATEGORY"],
          });
          return;
        }

        const rating_committee_type = await RatingCommitteeType.findOne({
          where: {
            uuid: params["rating_committee_type_uuid"],
            is_active: true,
          },
        });

        if (!rating_committee_type) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_COMMITTEE_TYPE_FOUND"],
          });
          return;
        }

        const rating_committee_meeting = await RatingCommitteeMeeting.update(
          APPEND_USER_DATA(request, {
            meeting_at: params["meeting_at"],
            meeting_type: params["meeting_type"],
            is_active: params["is_active"],
          }),
          {
            where: {
              uuid: params["uuid"],
            },
          }
        );

        await rating_committee_meeting_object.setRating_committee_type(
          rating_committee_type
        );
        await rating_committee_meeting_object.setRating_committee_meeting_category(
          rating_committee_meeting_category
        );

        await LOG_TO_DB(request, {
          activity: "EDIT_RATING_COMMITTEE_MEETINGS",
          params: {
            data: params,
          },
        });

        return reply.send({
          success: true,
          rating_committee_meeting_update_done: Boolean(
            rating_committee_meeting[0] === 1
          ),
        });
      } catch (error) {
        let error_log = {
          api: "v1/rating_committee_meetings/edit",
          activity: "EDIT_RATING_COMMITTEE_MEETINGS",
          params: {
            error: String(error),
          },
        };
        error_logger.info(JSON.stringify(error_log));
        reply.statusCode = 422;
        return reply.send({
          success: false,
          error: String(error),
        });
      }
    });

    fastify.post(
      "/rating_committee_meeting_registers",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeRegister.List");

          const { params } = request.body;

          const rating_committee_meeting = await RatingCommitteeMeeting.findOne({
            where: {
              uuid: params["rating_committee_meeting_uuid"],
              is_active: true,
            },
            raw: true,
          });
  
          if (!rating_committee_meeting) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_MEETING_FOUND"],
            });
            return;
          }

          let rating_committee_meeting_register = [];

          if(request.active_role_name === 'System Admin' || request.active_role_name === 'Compliance'){
             rating_committee_meeting_register = await DB_CLIENT.query(
              `SELECT null rating_date, null rating_assigned, null location, rcmr.uuid, rcmr.instrument_text, rcmr.instrument_size_number, rcmr.instrument_text,
              c.name AS company_name, rcmr.voting_status AS voting_status, rcmr.agenda AS agenda_type, rcmr.long_term_rating_recommendation AS long_term_rating_recommendation, rcmr.short_term_rating_recommendation AS short_term_rating_recommendation, rcmr.short_term_outlook_recommendation AS short_term_outlook_recommendation, rcmr.long_term_outlook_recommendation AS long_term_outlook_recommendation, rcmr.long_term_outlook AS outlook, rct.name AS committee_type,
              rcvm.rating AS previous_rating, rcmc.name AS category, m.mandate_id AS mandate_id,  c.uuid AS company_uuid, ic.category_name AS category_name, isc.category_name AS sub_category_name, rcm.meeting_type AS meeting_type from 
              companies c INNER JOIN
              rating_committee_meeting_registers rcmr ON rcmr.company_id = c.id
              INNER JOIN instrument_categories ic ON ic.id = rcmr.instrument_category_id
              INNER JOIN instrument_sub_categories isc ON isc.id = rcmr.instrument_sub_category_id
              INNER JOIN rating_committee_meetings rcm ON rcm.id = rcmr.rating_committee_meeting_id
              INNER JOIN mandates m ON m.id = rcmr.mandate_id
              INNER JOIN rating_committee_voting_metadata rcvm ON rcvm.instrument_detail_id = rcmr.instrument_detail_id 
              INNER JOIN rating_committee_types rct ON rct.id = rcmr.rating_committee_type_id 
              INNER JOIN rating_committee_meeting_categories rcmc ON rcmc.id = rcmr.rating_committee_meeting_category_id
              INNER JOIN meeting_has_members mhm ON mhm.rating_committee_meeting_id = rcmr.rating_committee_meeting_id    
              WHERE rcmr.rating_committee_meeting_id = :rating_committee_meeting_id 
              ORDER BY  m.mandate_id DESC
             
            `,
              {
                replacements: {
                  user_id: request.user.id,
                  rating_committee_meeting_id: rating_committee_meeting.id,
                },
                type: QueryTypes.SELECT,
              }
            );
          }
          else{
           rating_committee_meeting_register = await DB_CLIENT.query(
            `SELECT null rating_date, null rating_assigned, null location, rcmr.uuid, rcmr.instrument_text, rcmr.instrument_size_number, rcmr.instrument_text,
            c.name AS company_name, rcmr.voting_status AS voting_status, rcmr.agenda AS agenda_type, rcmr.long_term_rating_recommendation AS long_term_rating_recommendation, rcmr.short_term_rating_recommendation AS short_term_rating_recommendation, rcmr.short_term_outlook_recommendation AS short_term_outlook_recommendation, rcmr.long_term_outlook_recommendation AS long_term_outlook_recommendation, rcmr.long_term_outlook AS outlook, rct.name AS committee_type,
            rcvm.rating AS previous_rating, rcmc.name AS category, m.mandate_id AS mandate_id,  c.uuid AS company_uuid, ic.category_name AS category_name, isc.category_name AS sub_category_name, rcm.meeting_type AS meeting_type from 
            companies c INNER JOIN
            rating_committee_meeting_registers rcmr ON rcmr.company_id = c.id
            INNER JOIN instrument_categories ic ON ic.id = rcmr.instrument_category_id
            INNER JOIN instrument_sub_categories isc ON isc.id = rcmr.instrument_sub_category_id
            INNER JOIN rating_committee_meetings rcm ON rcm.id = rcmr.rating_committee_meeting_id
            INNER JOIN mandates m ON m.id = rcmr.mandate_id
            INNER JOIN rating_committee_voting_metadata rcvm ON rcvm.instrument_detail_id = rcmr.instrument_detail_id 
            INNER JOIN rating_committee_types rct ON rct.id = rcmr.rating_committee_type_id 
            INNER JOIN rating_committee_meeting_categories rcmc ON rcmc.id = rcmr.rating_committee_meeting_category_id
            INNER JOIN meeting_has_members mhm ON mhm.rating_committee_meeting_id = rcmr.rating_committee_meeting_id    
            WHERE rcmr.rating_committee_meeting_id = :rating_committee_meeting_id 
            AND (m.gh_id = :user_id OR mhm.member_id = :user_id) ORDER BY  m.mandate_id DESC
           
          `,
            {
              replacements: {
                user_id: request.user.id,
                rating_committee_meeting_id: rating_committee_meeting.id,
              },
              type: QueryTypes.SELECT,
            }
          );
          }

          console.log("rating_committee_meeting_register---->", rating_committee_meeting_register);

          await LOG_TO_DB(request, {
            activity: "RATING_COMMITTEE_MEETING_REGISTER",
            params: {
              data: params,
            },
          });
  
          return reply.send({
            success: true,
            rating_committee_meeting_register: rating_committee_meeting_register,
          });

          // let whereClause = Object.keys(params).length === 0 ? {} : params;
          // const rating_committee_meeting_registers =
          //   await RatingCommitteeMeetingRegister.findAll({
          //     where: whereClause,
          //     attributes: { exclude: ["id"] },
          //     include: [
          //       {
          //         model: RatingCommitteeMeeting,
          //         as: "rating_committee_meeting",
          //         attributes: { exclude: ["id"] },
          //       },
          //       {
          //         model: InstrumentCategory,
          //         as: "instrument_category",
          //         attributes: { exclude: ["id"] },
          //       },
          //       {
          //         model: InstrumentSubCategory,
          //         as: "instrument_sub_category",
          //         attributes: { exclude: ["id"] },
          //       },
          //       {
          //         model: Company,
          //         as: "company",
          //         attributes: { exclude: ["id"] },
          //       },
          //       {
          //         model: Mandate,
          //         as: "mandate",
          //         include: {
          //           model: BranchOffice,
          //           as: "branch_office",
          //         },
          //       },
          //     ],
          //   });

          // await LOG_TO_DB(request, {
          //   activity: "LIST_RATING_COMMITTEE_MEETING_REGISTER",
          //   params: {
          //     data: params,
          //   },
          // });

          // return reply.send({
          //   success: true,
          //   rating_committee_meeting_registers:
          //     rating_committee_meeting_registers,
          // });
        } catch (error) {
          let error_log = {
            api: "v1/rating_committee_meeting_registers",
            activity: "LIST_RATING_COMMITTEE_MEETING_REGISTER",
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
      "/rating_committee_meeting_registers/create",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeRegister.Create");
          const { params } = request.body;

          const instrument_detail = await InstrumentDetail.findOne({
            where: {
              uuid: params["instrument_detail_uuid"],
              is_active: true,
            },
          });

          if (!instrument_detail) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_INSTRUMENT_DETAIL_FOUND"],
            });
            return;
          }

          const instrument_category = await InstrumentCategory.findOne({
            where: {
              uuid: params["instrument_category_uuid"],
              is_active: true,
            },
          });

          if (!instrument_category) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_INSTRUMENT_CATEGORY_FOUND"],
            });
            return;
          }

          const instrument_sub_category = await InstrumentSubCategory.findOne({
            where: {
              uuid: params["instrument_sub_category_uuid"],
              is_active: true,
            },
          });

          if (!instrument_sub_category) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_INSTRUMENT_CATEGORY_FOUND"],
            });
            return;
          }

          const rating_committee_meeting = await RatingCommitteeMeeting.findOne(
            {
              where: {
                uuid: params["rating_committee_meeting_uuid"],
                is_active: true,
              },
            }
          );

          if (!rating_committee_meeting) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_MEETING_FOUND"],
            });
            return;
          }

          const rating_committee_meeting_register =
            await RatingCommitteeMeetingRegister.create({
              uuid: uuidv4(),
              category_text: params["category_text"],
              sub_category_text: params["sub_category_text"],
              instrument_text: params["instrument_text"],
              instrument_size_number: params["instrument_size_number"],
              instrument_size_text: params["instrument_size_text"],
              long_term_rating_assgined_text:
                params["long_term_rating_assgined_text"],
              short_term_rating_assgined_text:
                params["short_term_rating_assgined_text"],
              long_term_outlook: params["long_term_outlook"],
              long_term_outlook: params["long_term_outlook"],
              long_term_outlook: params["long_term_outlook"],
              long_term_outlook: params["long_term_outlook"],
              short_term_outlook: params["short_term_outlook"],
              long_term_outlook_recommendation:
                params["long_term_outlook_recommendation"],
              short_term_outlook_recommendation:
                params["short_term_outlook_recommendation"],
              long_term_rating_recommendation:
                params["long_term_rating_recommendation"],
              short_term_rating_recommendation:
                params["short_term_rating_recommendation"],
              agenda: params["agenda"],
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
              created_by: request.user.id,
            });

          await rating_committee_meeting_register.setRating_committee_meeting(
            rating_committee_meeting
          );
          await rating_committee_meeting_register.setInstrument_detail(
            instrument_detail
          );
          await rating_committee_meeting_register.setInstrument_category(
            instrument_category
          );
          await rating_committee_meeting_register.setInstrument_sub_category(
            instrument_sub_category
          );

          await LOG_TO_DB(request, {
            activity: "CREATE_RATING_COMMITTEE_MEETING_REGISTER",
            params: {
              data: params,
            },
          });

          return reply.send({
            success: true,
            rating_committee_meeting_register:
              rating_committee_meeting_register.uuid,
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_committee_meeting_registers/create",
            activity: "CREATE_RATING_COMMITTEE_MEETING_REGISTER",
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
      "/rating_committee_meeting_registers/view",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeRegister.View");

          const rating_committee_meeting_register =
            await RatingCommitteeMeetingRegister.findOne({
              where: {
                uuid: request.body.params.uuid,
              },
              attributes: { exclude: ["id"] },
              include: [
                {
                  model: RatingCommitteeMeeting,
                  as: "rating_committee_meeting",
                  attributes: { exclude: ["id"] },
                },
                {
                  model: InstrumentDetail,
                  as: "instrument_detail",
                  attributes: { exclude: ["id"] },
                },
                {
                  model: InstrumentCategory,
                  as: "instrument_category",
                  attributes: { exclude: ["id"] },
                },
                {
                  model: InstrumentSubCategory,
                  as: "instrument_sub_category",
                  attributes: { exclude: ["id"] },
                },
              ],
            });

          await LOG_TO_DB(request, {
            activity: "VIEW_RATING_COMMITTEE_MEETING_REGISTER",
            params: {
              data: request.body.params,
            },
          });

          return reply.send({
            success: true,
            rating_committee_meeting_register:
              rating_committee_meeting_register,
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_committee_meeting_registers/view",
            activity: "VIEW_RATING_COMMITTEE_MEETING_REGISTER",
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
      "/rating_committee_meeting_registers/edit",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeRegister.Edit");
          const { params } = request.body;

          const rating_committee_meeting_register_object =
            await RatingCommitteeMeetingRegister.findOne({
              where: {
                uuid: params["rating_committee_meeting_register_uuid"],
                is_active: true,
              },
            });

          if (!rating_committee_meeting_register) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_MEETING_REGISTER_FOUND"],
            });
            return;
          }

          const instrument_detail = await InstrumentDetail.findOne({
            where: {
              uuid: params["instrument_detail_uuid"],
              is_active: true,
            },
          });

          if (!instrument_detail) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_INSTRUMENT_DETAIL_FOUND"],
            });
            return;
          }

          const instrument_category = await InstrumentCategory.findOne({
            where: {
              uuid: params["instrument_category_uuid"],
              is_active: true,
            },
          });

          if (!instrument_category) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_INSTRUMENT_CATEGORY_FOUND"],
            });
            return;
          }

          const instrument_sub_category = await InstrumentSubCategory.findOne({
            where: {
              uuid: params["instrument_sub_category_uuid"],
              is_active: true,
            },
          });

          if (!instrument_sub_category) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_INSTRUMENT_CATEGORY_FOUND"],
            });
            return;
          }

          const rating_committee_meeting = await RatingCommitteeMeeting.findOne(
            {
              where: {
                uuid: params["rating_committee_meeting_uuid"],
                is_active: true,
              },
            }
          );

          if (!rating_committee_meeting) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_MEETING_FOUND"],
            });
            return;
          }

          const rating_committee_meeting_register =
            await RatingCommitteeMeeting.update(
              APPEND_USER_DATA(request, {
                category_text: params["category_text"],
                sub_category_text: params["sub_category_text"],
                instrument_text: params["instrument_text"],
                instrument_size_number: params["instrument_size_number"],
                instrument_size_text: params["instrument_size_text"],
                is_active: params["is_active"],
              }),
              {
                where: {
                  uuid: params["uuid"],
                },
              }
            );

          await rating_committee_meeting_register_object.setRating_committee_meeting(
            rating_committee_meeting
          );
          await rating_committee_meeting_register_object.setInstrument_detail(
            instrument_detail
          );
          await rating_committee_meeting_register_object.setInstrument_category(
            instrument_category
          );
          await rating_committee_meeting_register_object.setInstrument_sub_category(
            instrument_sub_category
          );

          await LOG_TO_DB(request, {
            activity: "EDIT_RATING_COMMITTEE_MEETING_REGISTER",
            params: {
              data: params,
            },
          });

          return reply.send({
            success: true,
            rating_committee_meeting_register_update_done: Boolean(
              rating_committee_meeting_register[0] === 1
            ),
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_committee_meeting_registers/edit",
            activity: "EDIT_RATING_COMMITTEE_MEETING_REGISTER",
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
      "/rating_committee_data/assign_documents",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeMeeting.Edit");

          const company =
            await Company.findOne({
              where: {
                uuid: request.body['company_uuid'].value,
                is_active: true,
              },
              raw: true,
            });

          if (!company) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO_COMPANY_FOUND",
            });
            return;
          }

          const workflow_doc = await DB_CLIENT.query(
            `SELECT TOP 1 * FROM workflow_documents wd WHERE company_id = :company_id ORDER BY updated_at DESC`,
            {
              replacements: {
                company_id: company.id,
              },
              type: QueryTypes.SELECT,
            }
          );

          let document_buffer = {};
          var document_path = {};
          var documents = [];
          if (request.body["rating_note"]) {
            document_buffer = await request.body["rating_note"].toBuffer();
            document_path = await UPLOAD_TO_AZURE_STORAGE(document_buffer, {
              path: request.body.rating_note.filename,
            });
            const workflow_document = await WorkflowDocument.create({
              uuid: uuidv4(),
              rating_note: document_path,
              financial: workflow_doc.length
              ? workflow_doc[0].financial
              : null,
              other_document: workflow_doc.length
                ? workflow_doc[0].other_document
                : null,  
              provisional_communication: workflow_doc.length
              ? workflow_doc[0].provisional_communication
              : null,
              rating_letter: workflow_doc.length
                ? workflow_doc[0].rating_letter
                : null,
              press_release: workflow_doc.length
                ? workflow_doc[0].press_release
                : null,
              rating_sheet: workflow_doc.length
                ? workflow_doc[0].rating_sheet
                : null,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
              created_by: request.user.id,
              company_id: company.id,
              role_id: request.active_role_id,
            });

            documents.push(workflow_document);
          }
           if (request.body["financial"]) {
            document_buffer = await request.body["financial"].toBuffer();
            document_path = await UPLOAD_TO_AZURE_STORAGE(document_buffer, {
              path: request.body.financial.filename,
            });

            const workflow_document = await WorkflowDocument.create({
              uuid: uuidv4(),
              rating_note: workflow_doc.length
                ? workflow_doc[0].rating_note
                : null,
              financial: document_path,
              other_document: workflow_doc.length
              ? workflow_doc[0].other_document
              : null,
              provisional_communication: workflow_doc.length
              ? workflow_doc[0].provisional_communication
              : null,
              rating_letter: workflow_doc.length
                ? workflow_doc[0].rating_letter
                : null,
              press_release: workflow_doc.length
                ? workflow_doc[0].press_release
                : null,
              rating_sheet: workflow_doc.length
                ? workflow_doc[0].rating_sheet
                : null,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
              created_by: request.user.id,
              company_id: company.id,
              role_id: request.active_role_id,
            });
            documents.push(workflow_document);

          }
           if (request.body["other_document"]) {
            document_buffer = await request.body["other_document"].toBuffer();
            document_path = await UPLOAD_TO_AZURE_STORAGE(document_buffer, {
              path: request.body.other_document.filename,
            });

            const workflow_document = await WorkflowDocument.create({
              uuid: uuidv4(),
              rating_note: workflow_doc.length
                ? workflow_doc[0].rating_note
                : null,
              other_document: document_path,
              financial: workflow_doc.length
              ? workflow_doc[0].financial
              : null,
              provisional_communication: workflow_doc.length
              ? workflow_doc[0].provisional_communication
              : null,
              rating_letter: workflow_doc.length
                ? workflow_doc[0].rating_letter
                : null,
              press_release: workflow_doc.length
                ? workflow_doc[0].press_release
                : null,
              rating_sheet: workflow_doc.length
                ? workflow_doc[0].rating_sheet
                : null,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
              created_by: request.user.id,
              company_id: company.id,
              role_id: request.active_role_id,
            });

            documents.push(workflow_document);

          }

          console.log("document_path: ", document_path);

          return reply.send({
            success: true,
            committee_metadata_document: documents,
          });
        } catch (error) {
          reply.statusCode = 422;
          return reply.send({
            success: false,
            error: String(error),
          });
        }
      }
    );

    fastify.post("/sent_to_committee/create", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "CommitteeMeeting.Create");
        let { params } = request.body;

        const company = await Company.findOne({
          where: {
            uuid: request.body["company_uuid"],
            is_active: true,
          },
        });

        if (!company) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: "NO_COMPANY_FOUND",
          });
          return;
        }

        const rating_committee_meeting = await RatingCommitteeMeeting.findOne({
          where: {
            uuid: request.body["rating_committee_meeting_uuid"],
            is_active: true,
          },
        });

        if (!rating_committee_meeting) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_COMMITTEE_MEETING_FOUND"],
          });
          return;
        }

        const rating_committee_meeting_category =
          await RatingCommitteeMeetingCategory.findOne({
            where: {
              uuid: request.body["rating_committee_meeting_category_uuid"],
              is_active: true,
            },
          });

        if (!rating_committee_meeting_category) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: "NO_RATING_COMMITTEE_MEETING_CATEGORY_FOUND",
          });
          return;
        }

        const rating_committee_type = await RatingCommitteeType.findOne({
          where: {
            uuid: request.body["rating_committee_type_uuid"],
            is_active: true,
          },
        });

        if (!rating_committee_type) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_COMMITTEE_TYPE_FOUND"],
          });
          return;
        }

        const rating_process = await RatingProcess.findOne({
          where: {
            uuid: request.body["rating_process_uuid"],
            is_active: true,
          },
          raw: true
        });

        params =  await Promise.all(params.map( async el=> {

          const mandate = await Mandate.findOne({
            where: {
              uuid: el["mandate_uuid"],
              is_active: true,
            },
            raw: true
          });
  
          if (!mandate) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO_MANDATE_FOUND",
            });
            return;
          }
          const instrument_category = await InstrumentCategory.findOne({
            where: {
              uuid: el["instrument_category_uuid"],
              is_active: true,
            },
            raw: true
          });
  
          if (!instrument_category) {
            reply.statusCode = 403;
            reply.send({
              success: false,
              error: "NO_INSTRUMENT_CATEGORY_FOUND",
            });
            return;
          }
  
          const instrument_sub_category = await InstrumentSubCategory.findOne({
            where: {
              uuid: el["instrument_sub_category_uuid"],
              is_active: true,
            },
            raw: true
          });
  
          if (!instrument_sub_category) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO_INSTRUMENT_CATEGORY_FOUND",
            });
            return;
          }
  
          const instrument = await Instrument.findOne({
            where: {
              uuid: el["instrument_uuid"],
              is_active: true,
            },
            raw: true
          });
  
          if (!instrument) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO_INSTRUMENT_FOUND",
            });
            return;
          }
  
          const instrument_detail = await InstrumentDetail.findOne({
            where: {
              uuid: el["instrument_detail_uuid"],
              is_active: true,
            },
            include: {
              model: RatingProcess,
              as: 'rating_process',
              attributes: ['uuid', 'id', 'name']
            },
            raw: true,
            nest: true
          });
  
          if (!instrument_detail) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO_INSTRUMENT_DETAIL_FOUND",
            });
            return;
          }

          const transaction_instrument = await TransactionInstrument.findOne({
            where: {
              uuid: el["transaction_instrument_uuid"],
              is_active: true,
            },
            raw: true
          });
  
          if (!transaction_instrument) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO_TRANSACTION_INSTRUMENT_FOUND",
            });
            return;
          }

          el.transaction_instrument_id = transaction_instrument.id;
          el.instrument_detail_id = instrument_detail.id;
          el.rating_process_id = instrument_detail.rating_process_id;
          el.instrument_id = instrument.id;
          el.instrument_sub_category_id = instrument_sub_category.id;
          el.instrument_category_id = instrument_category.id;
          el.mandate_id = mandate.id

          const previous_record = await DB_CLIENT.query(
            `SELECT long_term_rating_assgined_text, long_term_outlook FROM rating_committee_meeting_registers WHERE transaction_instrument_id=:id AND is_fresh = 1`,
            {
              replacements: {
                id: transaction_instrument.id
              },
              type: QueryTypes.SELECT,
            }
          );
  
          if(previous_record.length){
            el['previous_rating'] = previous_record[0].long_term_rating_assgined_text;
            el['previous_outlook'] = previous_record[0].long_term_outlook;
          }
  
          const up_res = await DB_CLIENT.query(
            `UPDATE rating_committee_meeting_registers set is_fresh = 0 WHERE transaction_instrument_id=:id`,
            {
              replacements: {
                id: transaction_instrument.id
              },
              type: QueryTypes.UPDATE,
            }
          );
           
          console.log("sent_to_committee up_res: ", up_res);

          return el;
        })
        )

        const committee_bulk_data = params.map(el=>{
          console.log("el: ", el);
          const obj = {
            uuid: uuidv4(),
            category_text: el["category_text"],
            sub_category_text: el["sub_category_text"],
            instrument_text: el["instrument_text"],
            instrument_size_number: el["instrument_size_number"],
            previous_rating: el['previous_rating'],
            previous_outlook: el['previous_outlook'],
            long_term_rating_assigned_text:
              el["long_term_rating_assigned_text"],
            short_term_rating_assgined_text:
              el["short_term_rating_assigned_text"],
            long_term_outlook_recommendation:
              el["long_term_outlook_recommendation"],
            short_term_outlook_recommendation:
              el["short_term_outlook_recommendation"],
            long_term_outlook: el["long_term_outlook"],
            short_term_outlook: el["short_term_outlook"],
            long_term_rating_recommendation:
              el["long_term_rating_recommendation"],
            short_term_rating_recommendation:
              el["short_term_rating_recommendation"],
            agenda: el["agenda"],
            remark: el["remark"],
            voting_status: "Upcoming",
            overall_status: "SENT TO COMMITTEE",
            is_short_term: el["short_term_rating_recommendation"] ? 1 : 0,
            is_long_term: el["long_term_rating_recommendation"] ? 1 : 0,
            is_active: true,
            is_fresh: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: request.user.id,
            instrument_detail_id: el.instrument_detail_id,
            instrument_category_id: el.instrument_category_id,
            instrument_sub_category_id: el.instrument_sub_category_id,
            instrument_id: el.instrument_id,
            transaction_instrument_id: el.transaction_instrument_id,
            rating_committee_meeting_id: rating_committee_meeting.id,
            rating_committee_meeting_category_id: rating_committee_meeting_category.id,
            rating_committee_type_id: rating_committee_type.id,
            mandate_id: el.mandate_id,
            company_id: company.id
          }
          return obj;
        })

        const bulk_data = await RatingCommitteeMeetingRegister.bulkCreate(committee_bulk_data);

        await DB_CLIENT.query(
          `UPDATE rating_committee_meetings set number_of_cases = number_of_cases + 1 WHERE id=:id`,
          {
            replacements: {
              id: rating_committee_meeting.id,
            },
            type: QueryTypes.UPDATE,
          }
        );

        const compliance = await DB_CLIENT.query(
          `SELECT uuid From users u WHERE id IN (SELECT user_id from user_has_roles uhr INNER JOIN roles r ON r.id = uhr.role_id WHERE r.name = 'Compliance' ) AND is_active = 1`,
          {
            type: QueryTypes.SELECT,
          }
        );

        const my_set = new Set();

        params.map(async el=> {
          my_set.add(el.mandate_id);
      })

      my_set.forEach(async key => {
        await DB_CLIENT.query(
          `UPDATE mandates set mandate_status = 'SENT TO COMMITTEE' WHERE id=:id`,
          {
            replacements: {
              id: key
            },
            type: QueryTypes.UPDATE,
          }
        );

      const get_args_params = {
        code: "10450",
        rating_process: rating_process,
        mandate_id: key,
        user_uuid: compliance[0].uuid,
        request: request,
        reply: reply,
      };

      console.log("get_args_params: ", get_args_params);

      await get_args(get_args_params);
      })

        await LOG_TO_DB(request, {
          activity: "CREATE_RATING_COMMITTEE_MEETING_REGISTER",
          params: {
            data: params,
          },
        });

        return reply.send({
          success: true,
          rating_committee_meeting_register:
          bulk_data,
        });
      } catch (error) {
        console.log("error: ", error);
        let error_log = {
          api: "v1/committee_metadata/create",
          activity: "CREATE_COMMITTEE_METADATA",
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
    });

    fastify.post(
      "/rating_committee_data/view_documents",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeMeeting.View");
          const { params } = request.body;

          const company = await Company.findOne({
            where: {
              uuid: params["company_uuid"],
              is_active: true,
            },
            raw: true,
          });

          if (!company) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO_COMMITTEE_METADATA_FOUND",
            });
            return;
          }

          const committee_metadata_document =  await DB_CLIENT.query(
            `SELECT TOP 1 * FROM workflow_documents wd WHERE company_id = :company_id ORDER BY updated_at DESC
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
            committee_metadata_document: committee_metadata_document,
          });
        } catch (error) {
          reply.statusCode = 422;
          return reply.send({
            success: false,
            error: String(error),
          });
        }
      }
    );

    fastify.post(
      "/committee_agenda/view",
      { schema: CreateCommitteeAgendaSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeAgenda.View");
          const { params } = request.body;

          const rating_committee_meeting = await RatingCommitteeMeeting.findOne(
            {
              where: {
                uuid: params["rating_committee_meeting_uuid"],
                is_active: true,
              },
              raw: true,
            }
          );

          if (!rating_committee_meeting) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_MEETING_FOUND"],
            });
            return;
          }

          const committee_agendas =
          await DB_CLIENT.query(
            `SELECT DISTINCT c.uuid, c.name, m.mandate_id, m.mandate_type, m.total_size, rcmr.voting_status, rcmr.agenda AS agenda_type
             FROM rating_committee_meeting_registers rcmr 
            INNER JOIN companies c ON c.id = rcmr .company_id 
            INNER JOIN mandates m ON m.id = rcmr .mandate_id  
            INNER JOIN rating_committee_meetings rcm ON rcm.id = rcmr.rating_committee_meeting_id  
            where rcmr.rating_committee_meeting_id = :meeting_id ORDER BY m.mandate_id;
          `,
            {
              replacements: {
                meeting_id: rating_committee_meeting.id,
              },
              type: QueryTypes.SELECT,
            }
          );

          await LOG_TO_DB(request, {
            activity: "VIEW_COMMITTEE_AGENDA",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            committee_agendas: committee_agendas,
          });
        } catch (error) {
          let error_log = {
            api: "v1/committee_agenda/view",
            activity: "VIEW_COMMITTEE_AGENDA",
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
      "/committee_agenda/generate",
      { schema: CreateCommitteeAgendaSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeAgenda.View");
          const { params } = request.body;

          const rating_committee_meeting = await RatingCommitteeMeeting.findOne(
            {
              where: {
                uuid: params["rating_committee_meeting_uuid"],
                is_active: true,
              },
              raw: true,
            }
          );

          if (!rating_committee_meeting) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_MEETING_FOUND"],
            });
            return;
          }

          const committee_agendas =
          await DB_CLIENT.query(
            `SELECT DISTINCT c.uuid, c.name, m.mandate_id, rcmr.instrument_text, rcmr.instrument_size_number, rp.name AS rating_process, rcm.meeting_at, rcm.id AS meeting_id, rcm.meeting_type FROM rating_committee_meeting_registers rcmr 
            INNER JOIN companies c ON c.id = rcmr .company_id 
            INNER JOIN mandates m ON m.id = rcmr .mandate_id  
            INNER JOIN instrument_details id ON id.id = rcmr.instrument_detail_id 
            INNER JOIN rating_processes rp ON rp.id = id.rating_process_id 
            INNER JOIN rating_committee_meetings rcm ON rcm.id = rcmr.rating_committee_meeting_id   
            where rcmr.rating_committee_meeting_id = :meeting_id ;
          `,
            {
              replacements: {
                meeting_id: rating_committee_meeting.id,
              },
              type: QueryTypes.SELECT,
            }
          );

          await LOG_TO_DB(request, {
            activity: "COMMITTEE_AGENDA_GENERATE",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            committee_agendas: committee_agendas,
          });
        } catch (error) {
          let error_log = {
            api: "v1/committee_agenda/generate",
            activity: "COMMITTEE_AGENDA_GENERATE",
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

    fastify.post("/rating_register", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "RatingRegister.List");
        const { params } = request.body;

        console.log(request.active_role_name);

        const rating_committee_meeting = await RatingCommitteeMeeting.findOne({
          where: {
            uuid: params["rating_committee_meeting_uuid"],
            is_active: true,
          },
          raw: true,
        });

        if (!rating_committee_meeting) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_COMMITTEE_MEETING_FOUND"],
          });
          return;
        }

        // const rating_committee_type = await RatingCommitteeType.findOne({
        //   where: {
        //     uuid: params["rating_committee_type_uuid"],
        //     is_active: true,
        //   },
        // });

        // if (!rating_committee_type) {
        //   reply.status_code = 403;
        //   reply.send({
        //     success: false,
        //     error: L["NO_RATING_COMMITTEE_TYPE_FOUND"],
        //   });
        //   return;
        // }

        // const rating_committee_meeting_category =
        //   await RatingCommitteeMeetingCategory.findOne({
        //     where: {
        //       uuid: params["rating_committee_meeting_category_uuid"],
        //       is_active: true,
        //     },
        //     raw: true,
        //   });

        // if (!rating_committee_meeting_category) {
        //   reply.status_code = 403;
        //   reply.send({
        //     success: false,
        //     error: L["NO_RATING_COMMITTEE_MEETING_CATEGORY_FOUND"],
        //   });
        //   return;
        // }

        let rating_register = '';

        switch(request.active_role_name) {
          case "Compliance":
          case "System Admin": 
          rating_register = await DB_CLIENT.query(
            `SELECT null AS model_rating, rcmr.uuid, rcmr.instrument_text, rcmr.instrument_size_number,rcmr.category_text, rcmr.sub_category_text,  
            c.name AS company_name, rcmr.voting_status, rcmr.agenda AS agenda_type, rcmr.long_term_rating_recommendation,
            rcmr.short_term_rating_recommendation, rcmr.short_term_outlook_recommendation,bo.name AS branch_office,
            rcmr.long_term_outlook_recommendation, rcmr.long_term_outlook AS current_outlook, rcmr.long_term_rating_assgined_text  AS current_rating,
            rcmr.previous_rating, rcmr.previous_outlook, rct.name AS committee_type,
             rcmc.name AS category, m.mandate_id AS mandate_id,  c.uuid AS company_uuid,rcm.meeting_type AS meeting_type from 
            companies c INNER JOIN
            rating_committee_meeting_registers rcmr ON rcmr.company_id = c.id
            INNER JOIN rating_committee_meetings rcm ON rcm.id = rcmr.rating_committee_meeting_id
            INNER JOIN mandates m ON m.id = rcmr.mandate_id
            INNER JOIN branch_offices bo ON bo.id = m.branch_office_id 
            INNER JOIN rating_committee_types rct ON rct.id = rcmr.rating_committee_type_id 
            INNER JOIN rating_committee_meeting_categories rcmc ON rcmc.id = rcmr.rating_committee_meeting_category_id    
            WHERE rcmr.rating_committee_meeting_id = :rating_committee_meeting_id AND rcmr.long_term_rating_assgined_text IS NOT NULL
            ORDER BY m.mandate_id DESC
          `,
            {
              replacements: {
                user_id: request.user.id,
                rating_committee_meeting_id: rating_committee_meeting.id,
              },
              type: QueryTypes.SELECT,
            }
          );
          break;

          default: 
          rating_register = await DB_CLIENT.query(
            `SELECT null AS model_rating, rcmr.uuid, rcmr.instrument_text, rcmr.instrument_size_number,rcmr.category_text, rcmr.sub_category_text,  
            c.name AS company_name, rcmr.voting_status, rcmr.agenda AS agenda_type, rcmr.long_term_rating_recommendation,
            rcmr.short_term_rating_recommendation, rcmr.short_term_outlook_recommendation,bo.name AS branch_office,
            rcmr.long_term_outlook_recommendation, rcmr.long_term_outlook AS current_outlook, rcmr.long_term_rating_assgined_text AS current_rating,rcmr.previous_rating, rcmr.previous_outlook, rct.name AS committee_type,
             rcmc.name AS category, m.mandate_id AS mandate_id,  c.uuid AS company_uuid,rcm.meeting_type AS meeting_type from 
            companies c INNER JOIN
            rating_committee_meeting_registers rcmr ON rcmr.company_id = c.id
            INNER JOIN rating_committee_meetings rcm ON rcm.id = rcmr.rating_committee_meeting_id
            INNER JOIN mandates m ON m.id = rcmr.mandate_id
            INNER JOIN branch_offices bo ON bo.id = m.branch_office_id 
            INNER JOIN rating_committee_types rct ON rct.id = rcmr.rating_committee_type_id 
            INNER JOIN rating_committee_meeting_categories rcmc ON rcmc.id = rcmr.rating_committee_meeting_category_id
            INNER JOIN meeting_has_members mhm ON mhm.rating_committee_meeting_id = rcmr.rating_committee_meeting_id    
            WHERE rcmr.rating_committee_meeting_id = :rating_committee_meeting_id AND rcmr.long_term_rating_assgined_text IS NOT NULL
            AND (m.gh_id = :user_id OR mhm.member_id = :user_id) ORDER BY  m.mandate_id DESC
          `,
            {
              replacements: {
                user_id: request.user.id,
                rating_committee_meeting_id: rating_committee_meeting.id,
              },
              type: QueryTypes.SELECT,
            }
          );
          break;
        }

        rating_register =  await Promise.all(rating_register.map(async el => {
          el.rating_action = el.agenda_type === 'Initial' ? 'Assigned' : null; 

         if(el.previous_rating && el.current_rating){
          console.log("previous_rating: ",el.previous_rating);
           
           let old_rating = el.previous_rating.indexOf('/') >= 0 ? el.previous_rating.split('/')[0] : el.previous_rating.split('/')[0];

           console.log("old_rating: ",old_rating);

           const old_rating_suffixes = await RatingSymbolMapping.findOne({
             where: {
               final_rating: old_rating,
               is_active: true
             },
             attributes: ['prefix', 'suffix'],
             raw: true
           });

           console.log("old_rating_suffixes: ", old_rating_suffixes);

           if(old_rating_suffixes.suffix != ''){
            old_rating  = old_rating[0].split(old_rating_suffixes.suffix)[0]; 
           }

           if(old_rating_suffixes.prefix != ''){
             old_rating  = old_rating[0].split(old_rating_suffixes.prefix)[0];
            }

           console.log("old_rating: ", old_rating);

           const old_rating_weightage = await RatingSymbolMaster.findOne({
             where: {
               rating_symbol: old_rating,
             },
             attributes: ['weightage'],
             raw: true
           });

           console.log("current_rating: ", el.current_rating);
           let current_rating = el.current_rating.indexOf('/') >= 0 ? el.current_rating.split('/')[0] : el.current_rating.split('/')[0];
           console.log("new current_rating: ", current_rating);

           const current_rating_suffixes = await RatingSymbolMapping.findOne({
             where: {
               final_rating: current_rating,
               is_active: true
             },
             attributes: ['prefix', 'suffix'],
             raw: true
           });

           if(current_rating_suffixes.suffix != ''){
             current_rating  = current_rating[0].split(current_rating_suffixes.suffix)[0]; 
            }

            if(current_rating_suffixes.prefix != ''){
              current_rating  = current_rating[0].split(current_rating_suffixes.prefix)[0];
             }

           const current_rating_weightage = await RatingSymbolMaster.findOne({
             where: {
               rating_symbol: current_rating,
               is_active: true
             },
             attributes: ['weightage'],
             raw: true
           });

           console.log("old_rating_weightage: ",old_rating_weightage);
           console.log("current_rating_weightage: ",current_rating_weightage);

           if(old_rating_weightage.weightage > current_rating_weightage.weightage){
           el.rating_action = 'Downgraded'
           }
           else if(old_rating_weightage.weightage < current_rating_weightage.weightage){
             el.rating_action = 'Upgraded'
           }
           else if(old_rating_weightage.weightage == current_rating_weightage.weightage){
             el.rating_action = 'Reaffirmed'
           } 
         }
         
         return el;
       })
       )

        console.log("rating_register----->", rating_register);

        await LOG_TO_DB(request, {
          activity: "RATING_REGISTER",
          params: {
            data: params,
          },
        });

        return reply.send({
          success: true,
          rating_register: rating_register,
        });
      } catch (error) {
        let error_log = {
          api: "v1/rating_register",
          activity: "RATING_REGISTER",
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
    });

    fastify.post(
      "/rating_committee_voting/create",
      { schema: CreateRatingCommitteeVotingSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeVoting.Create");
          const { params } = request.body;

          if (request.active_role_name != "Committee Member") {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "You are not a committtee member!",
            });
            return;
          }

          const instrument_detail = await InstrumentDetail.findOne({
            where: {
              uuid: params["instrument_detail_uuid"],
            },
            raw: true,
          });

          if (!instrument_detail) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO_INSTRUMENT_DETAIL_FOUND",
            });
            return;
          }

          const rating_committee_meeting = await RatingCommitteeMeeting.findOne(
            {
              where: {
                uuid: params["rating_committee_meeting_uuid"],
                is_active: true,
              },
              raw: true,
            }
          );

          if (!rating_committee_meeting) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: L["NO_RATING_COMMITTEE_MEETING_FOUND"],
            });
            return;
          }

          const rating_committee_voting = await RatingCommitteeVoting.create({
            uuid: uuidv4(),
            voted_rating: params["voted_rating"],
            voted_outlook: params["voted_outlook"],
            voted_weightage: params["is_chairman"] ? 1.1 : 1,
            remarks: params["remarks"],
            dissent_remark: params["dissent_remark"],
            dissent: params["dissent"],
            is_verified: params["is_verified"],
            is_chairman: params["is_chairman"],
            instrument_detail_id: instrument_detail.id,
            member_id: request.user.id,
            rating_committee_meeting_id: rating_committee_meeting.id,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: request.user.id,
          });

          // const short_term_symbol_master = await InstrumentDetail.findOne({
          //   where: {
          //     uuid: params["instrument_detail_uuid"],
          //   },
          //   raw: true,
          // });

          const meeting_member = await await DB_CLIENT.query(
            `SELECT SUM(1) AS cnt from meeting_has_members mhm WHERE rating_committee_meeting_id = :meeting_id
             AND mhm.is_active =1 
            `,
            {
              replacements: {
                meeting_id: rating_committee_meeting.id,
              },
              type: QueryTypes.SELECT,
            }
          );

          const final_rating = await DB_CLIENT.query(
            `SELECT voted_rating,voted_outlook, SUM(voted_weightage) AS voting_score from rating_committee_votings WHERE rating_committee_meeting_id= :meeting_id AND instrument_detail_id= :detail_id GROUP BY voted_rating, voted_outlook
              ORDER BY voting_score DESC 
              `,
            {
              replacements: {
                meeting_id: rating_committee_meeting.id,
                detail_id: instrument_detail.id,
              },
              type: QueryTypes.SELECT,
            }
          );

          console.log("final_rating: ", final_rating);

          const voting_count = await RatingCommitteeVoting.findAll({
            where: {
              instrument_detail_id: instrument_detail.id,
              is_active: true
            },
            raw: true,
          });

          const committee_metadata_uuid =
            await RatingCommitteeVotingMetadata.findOne({
              where: {
                instrument_detail_id: instrument_detail.id,
                is_active: true,
              },
              attributes: ["uuid"],
              raw: true,
            });

          let up_res = {};
          console.log((meeting_member[0].cnt % 2)," :cnt");
          console.log(final_rating[0].voting_score," :final_rating voting_score");

           if((meeting_member[0].cnt % 2 === 0 && ((final_rating[0].voting_score > Math.ceil(meeting_member[0].cnt/2)))) || (meeting_member[0].cnt % 2 != 0 && final_rating[0].voting_score >= Math.ceil(meeting_member[0].cnt/2)) || (voting_count.length > meeting_member[0].cnt - 1))
            {
              const rating_committee_metadata =
            await RatingCommitteeVotingMetadata.upsert({
              uuid: committee_metadata_uuid
                ? committee_metadata_uuid.uuid
                : uuidv4(),
              rating: final_rating[0].voted_rating,
              outlook: final_rating[0].voted_outlook,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
              created_by: request.user.id,
              rating_committee_meeting_id: rating_committee_meeting.id,
              instrument_detail_id: instrument_detail.id,
            });

            console.log("rating_committee_metadata: ", rating_committee_metadata);

            up_res = await DB_CLIENT.query(
              `UPDATE rating_committee_votings
              set dissent = 1 WHERE instrument_detail_id = :detail_id AND voted_rating != :voted_rating
                `,
              {
                replacements: {
                  detail_id: instrument_detail.id,
                  voted_rating: final_rating[0].voted_rating
                },
                type: QueryTypes.UPDATE,
              }
            );

            previous_rating = await DB_CLIENT.query(
              `SELECT previous_rating FROM rating_committee_meeting_registers
              WHERE instrument_detail_id = :detail_id
                `,
              {
                replacements: {
                  detail_id: instrument_detail.id,
                },
                type: QueryTypes.UPDATE,
              }
            );

            let rating_action = 'Assigned';

            if(previous_rating[0].previous_rating != null){

            let old_rating = previous_rating[0].previous_rating.indexOf('/') >= 0 ? previous_rating[0].previous_rating.split('/')[0] : previous_rating[0].previous_rating.split('/');

            console.log("old_rating: ",old_rating);

            const old_rating_suffixes = await RatingSymbolMapping.findOne({
              where: {
                final_rating: old_rating,
                is_active: true
              },
              attributes: ['prefix', 'suffix'],
              raw: true
            });

            console.log("old_rating_suffixes: ", old_rating_suffixes);

            if(old_rating_suffixes.suffix){
             old_rating  = old_rating[0].split(old_rating_suffixes.suffix)[0]; 
            }

            if(old_rating_suffixes.prefix){
              old_rating  = old_rating[0].split(old_rating_suffixes.prefix)[0];
             }

            console.log("old_rating: ", old_rating);

            const old_rating_weightage = await RatingSymbolMaster.findOne({
              where: {
                rating_symbol: old_rating,
                is_active: true
              },
              attributes: ['weightage'],
              raw: true
            });

            let current_rating = final_rating[0].voted_rating.indexOf('/') >= 0 ? final_rating[0].voted_rating.split('/')[0] : final_rating[0].voted_rating.split('/');

            const current_rating_suffixes = await RatingSymbolMapping.findOne({
              where: {
                final_rating: current_rating,
                is_active: true
              },
              attributes: ['prefix', 'suffix'],
              raw: true
            });

            if(current_rating_suffixes.suffix){
              current_rating  = current_rating[0].split(current_rating_suffixes.suffix)[0]; 
             }
 
             if(current_rating_suffixes.prefix){
               current_rating  = current_rating[0].split(current_rating_suffixes.prefix)[0];
              }

            const current_rating_weightage = await RatingSymbolMaster.findOne({
              where: {
                rating_symbol: current_rating,
                is_active: true
              },
              attributes: ['weightage'],
              raw: true
            });

            console.log("old_rating_weightage: ",old_rating_weightage);
            console.log("current_rating_weightage: ",current_rating_weightage);

            if(old_rating_weightage.weightage > current_rating_weightage.weightage){
            rating_action = 'Downgraded'
            }
            else if(old_rating_weightage.weightage < current_rating_weightage.weightage){
              rating_action = 'Upgraded'
            }
            else if(old_rating_weightage.weightage == current_rating_weightage.weightage){
              rating_action = 'Reaffirmed'
            }
          }

            await DB_CLIENT.query(
              `UPDATE rating_committee_meeting_registers set long_term_rating_assgined_text = :long_term_rating_assgined_text, rating_action =:rating_action, long_term_outlook =  :long_term_outlook
              WHERE instrument_detail_id = :detail_id
                `,
              {
                replacements: {
                  long_term_rating_assgined_text: final_rating[0].voted_rating,
                  long_term_outlook: final_rating[0].voted_outlook,
                  detail_id: instrument_detail.id,
                  rating_action: rating_action
                },
                type: QueryTypes.UPDATE,
              }
            );

            await DB_CLIENT.query(
              `UPDATE rating_committee_votings 
              set dissent = 0 WHERE instrument_detail_id = :detail_id AND voted_rating = :voted_rating
                `,
              {
                replacements: {
                  detail_id: instrument_detail.id,
                  voted_rating: final_rating[0].voted_rating
                },
                type: QueryTypes.UPDATE,
              }
            );
            }

          await LOG_TO_DB(request, {
            activity: "CREATE_RATING_COMMITTEE_VOTING",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            rating_committee_voting: rating_committee_voting,
            is_dissent: Boolean(up_res[0] != 0),
          });
        } catch (error) {
          let error_log = {
            api: "v1/rating_committee_voting",
            activity: "RATING_COMMITTEE_VOTING",
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

    fastify.post("/rating_committee_voting/view", async (request, reply) => {
      try {
        const { params } = request.body;

        await CHECK_PERMISSIONS(request, 'CommitteeVoting.View')

        const rating_committee_meeting = await RatingCommitteeMeeting.findOne({
          where: {
            uuid: params["rating_committee_meeting_uuid"],
            is_active: true,
          },
          raw: true,
        });

        if (!rating_committee_meeting) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_COMMITTEE_MEETING_FOUND"],
          });
          return;
        }

        const rating_committee_voting = await RatingCommitteeVoting.findAll({
          where: {
            rating_committee_meeting_id: rating_committee_meeting.id,
            member_id: request.user.id,
          },
          include: {
            model: User,
            as: "member",
            attributes: ["uuid", "full_name", "employee_code", "email"],
          },
          raw: true,
          nest: true
        });

        const instrument_detail_id_array = rating_committee_voting.map(el=> el.instrument_detail_id);

        const final_ratings = await RatingCommitteeVotingMetadata.findAll({
          where: {
            instrument_detail_id: instrument_detail_id_array,
            is_active: true
          },
          attributes: ['uuid','rating', 'outlook'],
          include: {
            model: InstrumentDetail,
            as: 'instrument_detail',
            attributes: ['uuid']
          }
        })

        await LOG_TO_DB(request, {
          activity: "RATING_COMMITTEE_VOTING",
          params: {
            data: params,
          },
        });

        reply.send({
          success: true,
          rating_committee_voting: rating_committee_voting,
          final_ratings: final_ratings
        });
      } catch (error) {
        let error_log = {
          api: "v1/rating_committee_voting",
          activity: "RATING_COMMITTEE_VOTING",
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

    fastify.post(
      "/rating_committee_voting/edit",
      { schema: CreateRatingCommitteeVotingSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeVoting.Edit");
          const { params } = request.body;

          const voting_object = await RatingCommitteeVoting.findOne({
            where: {
              uuid: params["uuid"],
            },
            raw: true,
          });

          if (!voting_object) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO_VOTING_OBJECT_FOUND",
            });
            return;
          }

          const voting_count = await RatingCommitteeVoting.findAll({
            where: {
              instrument_detail_id: voting_object.instrument_detail_id,
            },
            raw: true,
          });

          const committee_metadata_uuid =
            await RatingCommitteeVotingMetadata.findOne({
              where: {
                instrument_detail_id: voting_object.instrument_detail_id,
                is_active: true,
              },
              attributes: ["uuid"],
              raw: true,
            });

          const rating_committee_voting = await RatingCommitteeVoting.update(
            APPEND_USER_DATA(request, {
              voted_rating: params["voted_rating"],
              voted_outlook: params["voted_outlook"],
              remarks: params["remarks"],
              voted_weightage: params["is_chairman"] ? 1.1 : 1,
              dissent: params["dissent"],
              dissent_remark: params["dissent_remarks"],
              is_chairman: params["is_chairman"],
              is_active: params["is_active"],
            }),
            {
              where: {
                uuid: params["uuid"],
              },
            }
          );

          const meeting_member = await await DB_CLIENT.query(
            `SELECT SUM(1) AS cnt from meeting_has_members mhm WHERE rating_committee_meeting_id = :meeting_id
             AND mhm.is_active =1 
            `,
            {
              replacements: {
                meeting_id: voting_object.rating_committee_meeting_id,
              },
              type: QueryTypes.SELECT,
            }
          );

          const final_rating = await DB_CLIENT.query(
            `SELECT voted_rating,voted_outlook, SUM(voted_weightage) AS voting_score from rating_committee_votings WHERE rating_committee_meeting_id= :meeting_id AND instrument_detail_id= :detail_id GROUP BY voted_rating, voted_outlook
              ORDER BY voting_score DESC 
              `,
            {
              replacements: {
                meeting_id: voting_object.rating_committee_meeting_id,
                detail_id: voting_object.instrument_detail_id,
              },
              type: QueryTypes.SELECT,
            }
          );

          console.log("final_rating: ", final_rating);

          let up_res = {};

          console.log(Math.ceil(meeting_member[0].cnt/2)," :cnt");
          console.log(final_rating[0].voting_score," :final_rating count");

          if((meeting_member[0].cnt % 2 === 0 && ((final_rating[0].voting_score > Math.ceil(meeting_member[0].cnt/2)))) || (meeting_member[0].cnt % 2 != 0 && final_rating[0].voting_score >= Math.ceil(meeting_member[0].cnt/2)) || (voting_count.length > meeting_member[0].cnt - 1))
            {
              const rating_committee_metadata =
            await RatingCommitteeVotingMetadata.upsert({
              uuid: committee_metadata_uuid
                ? committee_metadata_uuid.uuid
                : uuidv4(),
              rating: final_rating[0].voted_rating,
              outlook: final_rating[0].voted_outlook,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
              created_by: request.user.id,
              rating_committee_meeting_id: voting_object.rating_committee_meeting_id,
              instrument_detail_id: voting_object.instrument_detail_id,
            });

            console.log("rating_committee_metadata: ", rating_committee_metadata);

            previous_rating = await DB_CLIENT.query(
              `SELECT previous_rating FROM rating_committee_meeting_registers
              WHERE instrument_detail_id = :detail_id
                `,
              {
                replacements: {
                  detail_id: voting_object.instrument_detail_id,
                },
                type: QueryTypes.UPDATE,
              }
            );

            let rating_action = 'Assigned';

            if(previous_rating[0].previous_rating != null){
              console.log("previous_rating: ", previous_rating);
            let old_rating = previous_rating[0].previous_rating.indexOf('/') >= 0 ? previous_rating[0].previous_rating.split('/')[0] : previous_rating[0].previous_rating.split('/');

            console.log("old_rating: ",old_rating);

            const old_rating_suffixes = await RatingSymbolMapping.findOne({
              where: {
                final_rating: old_rating,
                is_active: true
              },
              attributes: ['prefix', 'suffix'],
              raw: true
            });

            console.log("old_rating_suffixes: ", old_rating_suffixes);

            if(old_rating_suffixes.suffix){
             old_rating  = old_rating[0].split(old_rating_suffixes.suffix)[0]; 
            }

            if(old_rating_suffixes.prefix){
              old_rating  = old_rating[0].split(old_rating_suffixes.prefix)[0];
             }

            console.log("old_rating: ", old_rating);

            const old_rating_weightage = await RatingSymbolMaster.findOne({
              where: {
                rating_symbol: old_rating,
                is_active: true
              },
              attributes: ['weightage'],
              raw: true
            });

            let current_rating = final_rating[0].voted_rating.indexOf('/') >= 0 ? final_rating[0].voted_rating.split('/')[0] : final_rating[0].voted_rating.split('/');

            const current_rating_suffixes = await RatingSymbolMapping.findOne({
              where: {
                final_rating: current_rating,
                is_active: true
              },
              attributes: ['prefix', 'suffix'],
              raw: true
            });

            if(current_rating_suffixes.suffix){
              current_rating  = current_rating[0].split(current_rating_suffixes.suffix)[0]; 
             }
 
             if(current_rating_suffixes.prefix){
               current_rating  = current_rating[0].split(current_rating_suffixes.prefix)[0];
              }

            const current_rating_weightage = await RatingSymbolMaster.findOne({
              where: {
                rating_symbol: current_rating,
                is_active: true
              },
              attributes: ['weightage'],
              raw: true
            });

            console.log("old_rating_weightage: ",old_rating_weightage);
            console.log("current_rating_weightage: ",current_rating_weightage);

            if(old_rating_weightage.weightage > current_rating_weightage.weightage){
            rating_action = 'Downgraded'
            }
            else if(old_rating_weightage.weightage < current_rating_weightage.weightage){
              rating_action = 'Upgraded'
            }
            else if(old_rating_weightage.weightage == current_rating_weightage.weightage){
              rating_action = 'Reaffirmed'
            }

          }

            await DB_CLIENT.query(
              `UPDATE rating_committee_meeting_registers set long_term_rating_assgined_text = :long_term_rating_assgined_text, rating_action =:rating_action, long_term_outlook =  :long_term_outlook
              WHERE instrument_detail_id = :detail_id
                `,
              {
                replacements: {
                  long_term_rating_assgined_text: final_rating[0].voted_rating,
                  long_term_outlook: final_rating[0].voted_outlook,
                  detail_id: voting_object.instrument_detail_id,
                  rating_action: rating_action
                },
                type: QueryTypes.UPDATE,
              }
            );


            up_res = await DB_CLIENT.query(
              `UPDATE rating_committee_votings 
              set dissent = 1 WHERE instrument_detail_id = :detail_id AND voted_rating != :voted_rating
                `,
              {
                replacements: {
                  detail_id: voting_object.instrument_detail_id,
                  voted_rating: final_rating[0].voted_rating
                },
                type: QueryTypes.UPDATE,
              }
            );

            await DB_CLIENT.query(
              `UPDATE rating_committee_votings 
              set dissent = 0 WHERE instrument_detail_id = :detail_id AND voted_rating = :voted_rating
                `,
              {
                replacements: {
                  detail_id: voting_object.instrument_detail_id,
                  voted_rating: final_rating[0].voted_rating
                },
                type: QueryTypes.UPDATE,
              }
            );
            }


          await LOG_TO_DB(request, {
            activity: "UPDATE_RATING_COMMITTEE_VOTING",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            rating_committee_voting_update_result: Boolean(!rating_committee_voting[0]===0),
            is_dissent: Boolean(up_res[0] != 0),
          });
        } catch (error) {
          console.log("error: ", error);
          let error_log = {
            api: "v1/rating_committee_voting",
            activity: "UPDATE_RATING_COMMITTEE_VOTING",
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

    fastify.post("/dissent_members", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "CommitteeVoting.List");
        const { params } = request.body;

        const company = await Company.findOne({
          where: {
            uuid: params["company_uuid"],
            is_active: true,
          },
        });

        if (!company) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: "NO_COMPANY_FOUND",
          });
          return;
        }

        const rating_committee_meeting = await RatingCommitteeMeeting.findOne({
          where: {
            uuid: params["rating_committee_meeting_uuid"],
            is_active: true,
          },
        });

        if (!rating_committee_meeting) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: L["NO_RATING_COMMITTEE_MEETING_FOUND"],
          });
          return;
        }

        const meeting_member = await MeetingHasMember.findAll({
          where: {
            rating_committee_meeting_id: rating_committee_meeting.id,
            is_active: true
          }
        })

        let instruments = await DB_CLIENT.query(
          `SELECT id.id FROM rating_committee_meeting_registers rcmr 
          INNER JOIN companies c ON c.id = rcmr.company_id 
          INNER JOIN rating_committee_meetings rcm ON rcm.id = rcmr.rating_committee_meeting_id 
          INNER JOIN instrument_details id ON id.id = rcmr.instrument_detail_id WHERE rcm.id = :meeting_id AND 
          c.id = :company_id`,
          {
            replacements: {
              meeting_id: rating_committee_meeting.id,
              company_id: company.id,
            },
            type: QueryTypes.SELECT,
          }
        );

        instruments = instruments.map((el) => el.id);

        const committee_voting = await RatingCommitteeVoting.findAll({
          where: {
            instrument_detail_id: instruments[0],
            is_active: true,
          },
        });

        let has_voted = committee_voting.length == meeting_member.length ? 1 : 0;

        const dissent_members = await DB_CLIENT.query(
          `SELECT  DISTINCT(u.full_name) , u.email , u.employee_code, u.uuid, rcv.dissent, rcv.dissent_remark  FROM rating_committee_votings rcv 
          INNER JOIN rating_committee_voting_metadata rcvm ON rcvm.instrument_detail_id = rcv.instrument_detail_id
          INNER JOIN rating_committee_meeting_registers rcmr ON rcmr.instrument_detail_id = rcvm.instrument_detail_id 
          INNER JOIN rating_committee_meetings rcm ON rcm.id = rcmr.rating_committee_meeting_id 
          INNER JOIN companies c ON c.id = rcmr.company_id
          INNER JOIN users u ON u.id = rcv.member_id WHERE rcvm.rating != rcv.voted_rating AND rcv.dissent_remark IS NULL AND rcv.dissent = 1 AND rcm.id = :meeting_id AND c.id = :company_id`,
          {
            replacements: {
              meeting_id: rating_committee_meeting.id,
              company_id: company.id,
            },
            type: QueryTypes.SELECT,
          }
        );

        await LOG_TO_DB(request, {
          activity: "RATING_COMMITTEE_VOTING",
          params: {
            data: params,
          },
        });

        return reply.send({
          success: true,
          dissent_members: dissent_members,
          has_voted: has_voted,
        });
      } catch (error) {
        let error_log = {
          api: "v1/rating_committee_voting",
          activity: "RATING_COMMITTEE_VOTING",
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
    });

    fastify.post("/member/meeting/voting_list", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "CommitteeVoting.List");
        const { params } = request.body;

        let meeting = await RatingCommitteeMeeting.findOne({
          where: {
            uuid: params["rating_committee_meeting_uuid"],
            is_active: true,
          },
          raw: true,
        });

        let d = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
        d = moment(d).add(5, "hours").format("YYYY-MM-DD HH:mm:ss");
        d = moment(d).add(30, "minutes").format("YYYY-MM-DD HH:mm:ss");

        var voting_list = {};

        switch (request.active_role_name) {
          case "Committee Member":
            voting_list = await DB_CLIENT.query(
              `SELECT DISTINCT(c.name) AS company_name, rcv.voted_rating, rcv.dissent,rcmr.voting_status,rcm.meeting_at,
        c.uuid AS company_uuid from companies c
        INNER JOIN rating_committee_meeting_registers rcmr ON rcmr.company_id =c.id 
        INNER JOIN rating_committee_meetings rcm ON rcm.id = rcmr.rating_committee_meeting_id
        LEFT JOIN rating_committee_votings rcv ON rcv.instrument_detail_id = rcmr.instrument_detail_id 
        INNER JOIN meeting_has_members mhm ON mhm.rating_committee_meeting_id = rcm.id
        WHERE rcm.id = :meeting_id AND mhm.member_id = :member_id AND mhm.is_active=1 AND rcm.is_active =1;`,
              {
                replacements: {
                  meeting_id: meeting.id,
                  member_id: request.user.id,
                },
                type: QueryTypes.SELECT,
              }
            );
            break;
          case "Compliance":
          case "System Admin":
            voting_list = await DB_CLIENT.query(
              `SELECT DISTINCT(c.name) AS company_name, rcm.meeting_at,rcmr.voting_status,rcm.meeting_at,
        c.uuid AS company_uuid from companies c
        INNER JOIN rating_committee_meeting_registers rcmr ON rcmr.company_id =c.id 
        INNER JOIN rating_committee_meetings rcm ON rcm.id = rcmr.rating_committee_meeting_id
        WHERE rcm.id = :meeting_id AND rcm.is_active =1;`,
              {
                replacements: {
                  meeting_id: meeting.id,
                },
                type: QueryTypes.SELECT,
              }
            );

            break;
        }

        const mySet1 = new Set();

        voting_list.forEach((element) => {
          mySet1.add(element.company_uuid);
        });

        const result = [];

        voting_list = voting_list.map((el) => {
          if (mySet1.has(el.company_uuid)) {
            if (
              !(
                el.voting_status == "Completed" ||
                el.voting_status == "Rating Given"
              ) &&
              moment(el.meeting_at).format("YYYY-MM-DD HH:mm:ss") <= d
            ) {
              el.voting_status = "Live";
            }
            mySet1.delete(el.company_uuid);
            result.push(el);
            return el;
          }
        });

        await LOG_TO_DB(request, {
          activity: "MEMBER_VOTING_LIST",
          params: {
            data: params,
          },
        });

        voting_list = result;
        reply.send({
          success: true,
          voting_list: voting_list,
        });
      } catch (error) {
        let error_log = {
          api: "v1/member/voting_list",
          activity: "MEMBER_VOTING_LIST",
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

    fastify.post("/member/voting_list", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "CommitteeVoting.List");
        const { params } = request.body;

        const member = await User.findOne({
          where: {
            uuid: params["member_uuid"],
            is_active: true,
          },
        });

        if (!member) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: NO_COMMITTEE_MEMBER_FOUND,
          });
          return;
        }

        let meeting_ids = await MeetingHasMember.findAll({
          where: {
            member_id: member.id,
            is_active: true,
          },
          attributes: ["rating_committee_meeting_id"],
          raw: true,
        });

        meeting_ids = meeting_ids.map((el) => el.rating_committee_meeting_id);

        let voting_list = await RatingCommitteeMeetingRegister.findAll({
          where: {
            rating_committee_meeting_id: meeting_ids,
            is_active: true,
          },
          include: [
            {
              model: RatingCommitteeType,
              as: "rating_committee_type",
            },
            {
              model: RatingCommitteeMeeting,
              as: "rating_committee_meeting",
            },
            {
              model: RatingCommitteeMeetingCategory,
              as: "rating_committee_meeting_category",
            },
            {
              model: Company,
              as: "company",
            },
            {
              model: Mandate,
              as: "mandate",
            },
          ],
        });

        voting_list = voting_list.map((el) => {
          if (
            el.voting_status === "Upcoming" &&
            el.rating_committee_meeting.meeting_at >= Date.now()
          ) {
            el.voting_status === "Live";
          }
          return el;
        });

        await LOG_TO_DB(request, {
          activity: "MEMBER_VOTING_LIST",
          params: {
            data: params,
          },
        });

        return reply.send({
          success: true,
          voting_list: voting_list,
        });
      } catch (error) {
        let error_log = {
          api: "v1/member/voting_list",
          activity: "MEMBER_VOTING_LIST",
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
    });

    fastify.post("/voting/companies", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "CommitteeVoting.List");
        const { params } = request.body;

        const company_object = await Company.findOne({
          where: {
            uuid: params["company_uuid"],
            is_active: true,
          },
          raw: true,
        });

        const rating_committee_meeting = await RatingCommitteeMeeting.findOne({
          where: {
            uuid: params["rating_committee_meeting_uuid"],
            is_active: true,
          },
          raw: true,
        });

        if (!company_object) {
          reply.status_code = 403;
          reply.send({
            success: false,
            error: "NO_CASE_FOR_VOTING",
          });
          return;
        }

        const committee_registers = await DB_CLIENT.query(
          `SELECT DISTINCT(instrument_detail_uuid),voted_rating,final_rating, final_outlook, rating_process_uuid, mandate_id,gh_name,ra_name,short_term_rating_recommendation, long_term_rating_recommendation,long_term_outlook_recommendation,instrument_text,is_short_term,
          is_long_term,voted_outlook,
                    remarks, dissent, dissent_remark AS dissent_remarks, rating_committee_voting_uuid,
                    instrument_size_number, rating_symbol_category_uuid FROM 
                    (select rcmr.long_term_rating_recommendation,rcmr.is_short_term, rcmr.is_long_term, rcmr.short_term_rating_recommendation,rcmr.instrument_text ,voted_rating ,voted_outlook,
                    remarks, dissent, dissent_remark,rating_committee_voting_uuid,final_rating, final_outlook, rp.uuid AS rating_process_uuid,
                    rcmr.long_term_outlook_recommendation, rcmr.instrument_size_number,
                    rcmr.long_term_outlook,  id.uuid AS instrument_detail_uuid, rsc.uuid AS rating_symbol_category_uuid, m.mandate_id, gh_name, ra_name
                                FROM rating_committee_meeting_registers rcmr 
                                INNER JOIN instrument_details id ON id.id = rcmr.instrument_detail_id
                                INNER JOIN rating_processes rp ON rp.id = id.rating_process_id
                                LEFT JOIN ( select rcv.uuid AS rating_committee_voting_uuid, rcv.voted_rating, rcv.voted_outlook, rcv.instrument_detail_id,
                                rcv.remarks, rcv.dissent, rcv.dissent_remark  FROM rating_committee_votings rcv INNER JOIN
                                users u2 ON u2.id = rcv.member_id WHERE rcv.member_id= :member_id   ) AS voting_tb ON voting_tb.instrument_detail_id  = rcmr.instrument_detail_id
                                LEFT JOIN ( select rcvm.rating AS final_rating, rcvm.outlook AS final_outlook, rcvm.instrument_detail_id FROM rating_committee_voting_metadata rcvm ) AS voting_mtb ON voting_mtb.instrument_detail_id  = rcmr.instrument_detail_id
                                INNER JOIN instruments i ON i.id = rcmr.instrument_id
                                INNER JOIN rating_symbol_categories rsc ON rsc.id = i.rating_symbol_category_id
                                INNER JOIN mandates m ON m.id = rcmr.mandate_id
                                INNER JOIN rating_committee_meetings rcm On rcm.id = rcmr.rating_committee_meeting_id
                                INNER JOIN (SELECT u. full_name AS gh_name, u.id from users u INNER JOIN mandates m2 ON m2.gh_id =u.id ) AS sbq ON sbq.id = m.gh_id 
                                INNER JOIN (SELECT u.full_name AS ra_name, u.id from users u INNER JOIN mandates m2 ON m2.ra_id =u.id ) AS sbq1 ON sbq1.id = m.ra_id  
                      WHERE rcmr.company_id = :company_id AND rcmr.rating_committee_meeting_id= :rating_committee_meeting_id ) AS my_query
`,
          {
            replacements: {
              company_id: company_object.id,
              rating_committee_meeting_id: rating_committee_meeting.id,
              member_id: request.user.id,
            },
            type: QueryTypes.SELECT,
          }
        );

        await LOG_TO_DB(request, {
          activity: "VIEW_COMMITTEE_AGENDA",
          params: {
            data: params,
          },
        });

        return reply.send({
          success: true,
          committee_registers: committee_registers,
        });
      } catch (error) {
        let error_log = {
          api: "v1/committee_agenda/view",
          activity: "VIEW_COMMITTEE_AGENDA",
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
    });

    fastify.post(
      "/committee-minutes/create",
      { schema: CreateRatingCommitteeSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeMinutes.Create");
          const { params } = request.body;

          const rating_committee_meeting = await RatingCommitteeMeeting.findOne(
            {
              where: {
                uuid: params["rating_committee_meeting_uuid"],
                is_active: true,
              },
            }
          );

          if (!rating_committee_meeting) {
            reply.status_code = 403;
            return reply.send({
              success: false,
              error: "NO_RATING_COMMITTEE_MEETING_FOUND",
            });
          }

          const company = await Company.findOne({
            where: {
              uuid: params["company_uuid"],
              is_active: true
            },
            raw: true
          })

          if (!company) {
            reply.status_code = 403;
            return reply.send({
              success: false,
              error: "NO_COMPANY",
            });
          }

          const committee_minutes = await CommitteeMinutes.create({
            uuid: uuidv4(),
            discussion_paragraph: params["discussion_paragraph"],
            comments_paragraph: params["comments_paragraph"],
            rating_committee_meeting_id: rating_committee_meeting.id,
            rating_analyst: params['rating_analyst'],
            group_head: params['group_head'],
            dissent_remark: params["dissent_remark"],
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: request.user.id,
          });

          await LOG_TO_DB(request, {
            activity: "CREATE_COMMITTEE_MINUTES",
            params: {
              data: params,
            },
          });

          await committee_minutes.setCompany(company.id)

          return reply.send({
            success: true,
            committee_minutes: committee_minutes,
          });
        } catch (error) {
          let error_log = {
            api: "v1/committee-minutes/create",
            activity: "COMMITTEE_MINUTES",
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
      "/committee-minutes/view",
      { schema: CreateRatingCommitteeSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeMinutes.List");
          const { params } = request.body;

          const rating_committee_meeting = await RatingCommitteeMeeting.findOne(
            {
              where: {
                uuid: params["rating_committee_meeting_uuid"],
              },
              raw: true,
            }
          );

          if (!rating_committee_meeting) {
            reply.status_code = 403;
            return reply.send({
              success: false,
              error: "NO_RATING_COMMITTEE_MEETING_FOUND",
            });
          }

          const company = await Company.findOne({
            where: {
              uuid: params["company_uuid"],
              is_active: true
            },
            raw: true
          })

          if (!company) {
            reply.status_code = 403;
            return reply.send({
              success: false,
              error: "NO_COMPANY",
            });
          }

          const committee_minutes = await CommitteeMinutes.findOne({
            where: {
              rating_committee_meeting_id: rating_committee_meeting.id,
              company_id: company.id
            },
          });

          if (!committee_minutes) {
            reply.status_code = 403;
            return reply.send({
              success: false,
              error: "NO_COMMITTEE_MINUTES_FOUND",
            });
          }

          await LOG_TO_DB(request, {
            activity: "VIEW_COMMITTEE_MINUTES",
            params: {
              data: params,
            },
          });

          return reply.send({
            success: true,
            committee_minutes: committee_minutes,
          });
        } catch (error) {
          let error_log = {
            api: "v1/committee-minutes/view",
            activity: "VIEW_COMMITTEE_MINUTES",
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

    fastify.post("/committee-minutes/edit", async (request, reply) => {
      try {

        const { params } = request.body;

        const rating_committee_meeting = await RatingCommitteeMeeting.findOne({
          where: {
            uuid: params["rating_committee_meeting_uuid"]
          },
          raw: true
        })

        if (!rating_committee_meeting) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: "NO_RATING_COMMITTEE_MEETING_FOUND",
          });
        }

        const company = await Company.findOne({
          where: {
            uuid: params["company_uuid"],
            is_active: true
          },
          raw: true
        })

        if (!company) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: "NO_COMPANY",
          });
        }

        const committee_minutes_object = await CommitteeMinutes.findOne({
          where: {
            rating_committee_meeting_id: rating_committee_meeting.id
          }
        })

        const committee_minutes_update_result = await CommitteeMinutes.update(APPEND_USER_DATA(request, {
          discussion_paragraph: params["discussion_paragraph"],
          comments_paragraph: params["comments_paragraph"],
          dissent_remark: params["dissent_remark"],
          rating_committee_meeting_id: rating_committee_meeting.id,
          is_active: true
        }), {
          where: {
            rating_committee_meeting_id: rating_committee_meeting.id
          }
        })

        await LOG_TO_DB(request, {
          activity: "EDIT_COMMITTEE_MINUTES",
          params: {
            data: params,
          },
        });

        await committee_minutes_object.setCompany(company.id)

        return reply.send({
          success: true,
          committee_minutes_update_result: committee_minutes_update_result,
        });

      } catch(error) {
          let error_log = {
            api: "v1/committee-minutes/edit",
            activity: "EDIT_COMMITTEE_MINUTES",
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
    })

    fastify.post(
      "/gh_ra/view",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CommitteeMinutes.List");
          const { params } = request.body;

          const company = await Company.findOne(
            {
              where: {
                uuid: params["company_uuid"],
              },
              raw: true,
            }
          );

          if (!company) {
            reply.status_code = 403;
            return reply.send({
              success: false,
              error: "NO_COMPANY_FOUND",
            });
          }

          const gh_ra_list = await DB_CLIENT.query(
            `SELECT DISTINCT group_head, rating_analyst, dissent_remark,dissenting_member  FROM mandates m
            INNER JOIN companies c ON c.id = m.company_id  
            INNER JOIN workflow_instances wi ON wi.mandate_id = m.id 
            INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id = wi.id 
            INNER JOIN workflow_configs wc ON wc.id = wil.workflow_config_id 
            INNER JOIN activities a ON a.id = wc.current_activity_id 
            INNER JOIN (SELECT id, full_name AS group_head FROM users ) AS sbq ON sbq.id = m.gh_id
            INNER JOIN (SELECT id, full_name AS rating_analyst FROM users ) AS sbq1 ON sbq1.id = m.ra_id
            INNER JOIN rating_committee_meeting_registers rcmr ON rcmr.company_id = c.id 
            LEFT JOIN (SELECT rcv2.instrument_detail_id, rcv2.dissent_remark, u.full_name AS dissenting_member FROM rating_committee_votings rcv2 INNER JOIN
            users u ON u.id = rcv2.member_id WHERE rcv2.dissent =1  ) AS rcv ON rcv.instrument_detail_id = rcmr.instrument_detail_id 
            WHERE c.id = :company_id AND wil.is_active = 1 AND m.is_active = 1`,
            {
              replacements: {
                code: params["code"],
                company_id: company.id,
              },
              type: QueryTypes.SELECT,
            }
          );

          await LOG_TO_DB(request, {
            activity: "GH_RH_VIEW",
            params: {
              data: params,
            },
          });

          return reply.send({
            success: true,
            gh_ra_list: gh_ra_list,
          });
        } catch (error) {
          let error_log = {
            api: "v1/gh_ra/view",
            activity: "GH_RH_VIEW",
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

    fastify.post("/rating_verification/view", async (request, reply) => {
      try {
        const { params } = request.body;

        await CHECK_PERMISSIONS(request, 'CommitteeVerfication.View')

        const rating_committee_meeting = await RatingCommitteeMeeting.findOne({
          where: {
            uuid: params["rating_committee_meeting_uuid"],
          },
        });

        if (!rating_committee_meeting) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: L["NO_RATING_COMMITTEE_MEETING_FOUND"],
          });
        }

        const rating_verification = await DB_CLIENT.query(
          `
        SELECT rcmr.uuid, rcmr.instrument_text, rcmr.instrument_size_number, rcmr.instrument_text, m.mandate_id, 
          c.name AS company_name,
          rcvm.rating AS assigned_rating from 
          companies c INNER JOIN rating_committee_meeting_registers rcmr ON rcmr.company_id = c.id
          INNER JOIN rating_committee_voting_metadata rcvm ON rcvm.instrument_detail_id = rcmr.instrument_detail_id
          INNER JOIN mandates m ON m.id = rcmr.mandate_id
          WHERE m.gh_id = :gh_id
        `,
          {
            replacements: {
              gh_id: request.user.id,
            },
            type: QueryTypes.SELECT,
          }
        );

        await LOG_TO_DB(request, {
          activity: "RATING_VERIFICATION",
          params: {
            data: params,
          },
        });

        reply.send({
          success: true,
          rating_verification: rating_verification,
        });
      } catch (error) {
        let error_log = {
          api: "v1/committee-minutes",
          activity: "COMMITTEE_MINUTES",
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
    });

    fastify.post("/rating/verification/view", async (request, reply) => {
      try {
        const { params } = request.body;

        await CHECK_PERMISSIONS(request, 'CommitteeVerfication.View')

        const company = await Company.findOne({
          where: {
            uuid: params["company_uuid"],
            is_active: true,
          },
          raw: true,
        });

        if (!company) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: "NO_COMPANY_FOUND",
          });
        }
        const rating_verification = await DB_CLIENT.query(
          `
        SELECT c.name AS company_name,rcmr.agenda, rcmr.instrument_text,rcmr.category_text, rcmr.instrument_size_number, m.mandate_id, id.uuid
          AS instrument_detail_uuid, rcm.uuid
          AS rating_committee_meeting_uuid, rcvm.rating AS assigned_rating from rating_committee_meeting_registers rcmr 
          INNER JOIN rating_committee_voting_metadata rcvm ON rcvm.instrument_detail_id  = rcmr.instrument_detail_id 
          INNER JOIN companies c ON c.id = rcmr.company_id
          INNER JOIN mandates m ON m.id = rcmr.mandate_id
          INNER JOIN instrument_details id ON id.id = rcmr.instrument_detail_id
          INNER JOIN rating_committee_meetings rcm ON rcm.id = rcmr.rating_committee_meeting_id
          INNER JOIN users u ON u.id = m.gh_id 
          WHERE m.gh_id = :user_id AND c.id = :company_id AND rcmr.overall_status != 'Rating Verified'
          ORDER BY m.mandate_id DESC
        `,
          {
            replacements: {
              user_id: request.user.id,
              company_id: company.id,
            },
            type: QueryTypes.SELECT,
          }
        );

        await LOG_TO_DB(request, {
          activity: "RATING_VERIFICATION",
          params: {
            data: params,
          },
        });

        reply.send({
          success: true,
          rating_verification: rating_verification,
        });
      } catch (error) {
        let error_log = {
          api: "v1/rating/verification/view",
          activity: "RATING_VERIFICATION",
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
    });

    fastify.post("/voting/status", async (request, reply) => {
      try {
        const { params } = request.body;

        await CHECK_PERMISSIONS(request, 'CommitteeVoting.List')

        const rating_committee_meeting = await RatingCommitteeMeeting.findOne({
          where: {
            uuid: params["rating_committee_meeting_uuid"],
          },
          raw: true
        });

        let voting_status = [];

        if(request.active_role_name === 'Group Head' || request.active_role_name === 'Committee Member'){
        voting_status = await DB_CLIENT.query(
          `
        SELECT DISTINCT rcmr.instrument_detail_id
        AS instrument_detail_id, '' AS dissent_remark, null AS dissent, null AS rating_team_non_cooperation, rcm.meeting_at, c.name AS company_name, c.uuid AS company_uuid, m.mandate_id AS gen_mandate_id, i.name AS instrument_name, rcvm.rating AS members_rating, rcvm.outlook AS members_outlook, rcmr.mandate_id AS mandate_id, u.full_name AS group_head, rcmr.long_term_rating_recommendation,
        rcmr.short_term_rating_recommendation , rcvm.rating AS rc_members_output, rcmr.remark AS remarks, rcmr.voting_status AS voting_status from rating_committee_meeting_registers rcmr 
        INNER JOIN rating_committee_voting_metadata rcvm ON rcvm.instrument_detail_id  = rcmr.instrument_detail_id 
        INNER JOIN rating_committee_meetings rcm ON rcm.id = rcvm.rating_committee_meeting_id
        INNER JOIN companies c ON c.id = rcmr.company_id
        INNER JOIN mandates m ON m.id = rcmr.mandate_id
        INNER JOIN transaction_instruments ti ON ti.id = rcmr.transaction_instrument_id
        INNER JOIN instruments i ON i.id = ti.instrument_id
        INNER JOIN users u ON u.id = m.gh_id
        INNER JOIN meeting_has_members mhm ON mhm.rating_committee_meeting_id = rcmr.rating_committee_meeting_id 
        WHERE rcmr.rating_committee_meeting_id = :rating_committee_meeting_id 
        AND (m.gh_id = :user_id OR mhm.member_id = :user_id) ORDER BY  m.mandate_id DESC
        `,
          {
            replacements: {
              user_id: request.user.id,
              rating_committee_meeting_id: rating_committee_meeting.id,
            },
            type: QueryTypes.SELECT,
          }
        );
        }
        else if(request.active_role_name === 'Compliance'){
          voting_status = await DB_CLIENT.query(
            `
          SELECT DISTINCT rcmr.instrument_detail_id
          AS instrument_detail_id, '' AS dissent_remark, null AS dissent, null AS rating_team_non_cooperation, rcm.meeting_at, c.name AS company_name, c.uuid AS company_uuid, m.mandate_id AS gen_mandate_id, i.name AS instrument_name, rcvm.rating AS members_rating, rcvm.outlook AS members_outlook, rcmr.mandate_id AS mandate_id, u.full_name AS group_head, rcmr.long_term_rating_recommendation,
          rcmr.short_term_rating_recommendation , rcvm.rating AS rc_members_output, rcmr.remark AS remarks, rcmr.voting_status AS voting_status from rating_committee_meeting_registers rcmr 
          INNER JOIN rating_committee_voting_metadata rcvm ON rcvm.instrument_detail_id  = rcmr.instrument_detail_id 
          INNER JOIN rating_committee_meetings rcm ON rcm.id = rcvm.rating_committee_meeting_id
          INNER JOIN companies c ON c.id = rcmr.company_id
          INNER JOIN mandates m ON m.id = rcmr.mandate_id
          INNER JOIN transaction_instruments ti ON ti.id = rcmr.transaction_instrument_id
          INNER JOIN instruments i ON i.id = ti.instrument_id
          INNER JOIN users u ON u.id = m.gh_id
          INNER JOIN meeting_has_members mhm ON mhm.rating_committee_meeting_id = rcmr.rating_committee_meeting_id 
          WHERE rcmr.rating_committee_meeting_id = :rating_committee_meeting_id 
          ORDER BY  m.mandate_id DESC
          `,
            {
              replacements: {
                user_id: request.user.id,
                rating_committee_meeting_id: rating_committee_meeting.id,
              },
              type: QueryTypes.SELECT,
            }
          );
          }


        console.log("voting_status----->", voting_status);

        let voting_dissent = await DB_CLIENT.query(
          `
          SELECT rcv.instrument_detail_id, rcv.dissent_remark, rcv.rating_committee_meeting_id  FROM rating_committee_votings rcv 
INNER JOIN instrument_details id ON id.id = rcv.instrument_detail_id 
INNER JOIN rating_committee_meeting_registers rcmr ON rcmr.instrument_detail_id = rcv.instrument_detail_id 
INNER JOIN rating_committee_voting_metadata rcvm ON rcvm.instrument_detail_id = rcmr.instrument_detail_id 
WHERE rcv.rating_committee_meeting_id=:rating_committee_meeting_id AND rcv.dissent = 1  ORDER BY rcv.instrument_detail_id DESC
        `,
          {
            replacements: {
              user_id: request.user.id,
              rating_committee_meeting_id: rating_committee_meeting.id,
            },
            type: QueryTypes.SELECT,
          }
        );

        console.log("voting_dissent----->", voting_dissent);


        const map1 = new Map();
        let d = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
        d = moment(d).add(5, "hours").format("YYYY-MM-DD HH:mm:ss");
        d = moment(d).add(30, "minutes").format("YYYY-MM-DD HH:mm:ss");

        voting_status = voting_status.map(voting_element => {
          voting_dissent.map(el=>{
            if(voting_element.instrument_detail_id == el.instrument_detail_id ){
              voting_element.dissent_remark = voting_element.dissent_remark + el.dissent_remark;
              voting_element.dissent = true;
            }
          })

          if (moment(voting_element.meeting_at).format("YYYY-MM-DD HH:mm:ss") <= d && voting_element.voting_status != "Completed") {
            voting_element.voting_status = "Live";
          }
          return voting_element;
        })

        await LOG_TO_DB(request, {
          activity: "VOTING_STATUS",
          params: {
            data: params,
          },
        });

        reply.send({
          success: true,
          voting_status: voting_status,
        });
      } catch (error) {
        let error_log = {
          api: "v1/voting/status",
          activity: "VOTING_STATUS",
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
    });

    fastify.post("/chairman/view_votes", async (request, reply) => {
      try {
        const { params } = request.body;

        await CHECK_PERMISSIONS(request, 'CommitteeVoting.View')

        const rating_committee_meeting = await RatingCommitteeMeeting.findOne({
          where: {
            uuid: params["rating_committee_meeting_uuid"],
            is_active: true,
          },
        });

        const company = await Company.findOne({
          where: {
            uuid: params["company_uuid"],
            is_active: true,
          },
        });

        const rating_process = await RatingProcess.findOne({
          where: {
            uuid: params["rating_process_uuid"],
            is_active: true,
          },
        });

        const chairman = await MeetingHasMember.findOne({
          where: {
            member_id: request.user.id,
            rating_committee_meeting_id: rating_committee_meeting.id,
            is_active: true,
          },
        });

        if (!chairman) {
          return reply.send({
            success: false,
            error: "No Committee Member Found",
          });
        }

        let instrument_detail_ids = await DB_CLIENT.query(
          `
          SELECT rcmr.instrument_detail_id  FROM rating_committee_meeting_registers rcmr 
          INNER JOIN instrument_details id ON id.id = rcmr.instrument_detail_id 
          INNER JOIN rating_processes rp ON rp.id = id.rating_process_id
           WHERE rcmr.rating_committee_meeting_id =:meeting_id AND rcmr.company_id
          =:company_id AND rp.id = :rating_process_id
        `,
          {
            replacements: {
              company_id: company.id,
              meeting_id: rating_committee_meeting.id,
              rating_process_id: rating_process.id
            },
            type: QueryTypes.SELECT,
          }
        );

        instrument_detail_ids = instrument_detail_ids.map(el=> el.instrument_detail_id);

        const rating_committee_voting = await RatingCommitteeVoting.findAll({
          where: {
            instrument_detail_id: instrument_detail_ids,
            is_active: true,
          },
          include:[{
            model: User,
            as: "member",
            attributes: ["uuid", "full_name", "employee_code", "email"],
          },
          {
            model: InstrumentDetail,
            as: "instrument_detail",
            attributes: ["uuid"],
          },
        ]
        });

        console.log(rating_committee_voting);

        return reply.send({
          success: true,
          rating_committee_voting: rating_committee_voting,
        });
      } catch (error) {
        let error_log = {
          api: "v1/chairman/view_votes",
          activity: "CHAIRMAN_VIEW_VOTES",
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
    });

    fastify.post("/rating_sheet_data", async (request, reply) => {
      try {

        const { params } = request.body

       const rating_committee_meeting = await RatingCommitteeMeeting.findOne({
          where: {
            uuid: params["rating_committee_meeting_uuid"]
          }, 
          raw: true
        })

        // console.log("rating_committee_meeting--->", rating_committee_meeting);

        if (!rating_committee_meeting) {
          reply.status_code = 403;
          return reply.send({
            success: false,
            error: "NO_RATING_COMMITTEE_MEETING_FOUND",
          });
        }

        const rating_sheet_data = await DB_CLIENT.query(`
        SELECT c.name AS entity_name, ic.category_name AS instrument, m.total_size, rp.name AS nature_of_assignment, rcmr.short_term_rating_recommendation AS existing_rating, rcmr.long_term_rating_recommendation AS proposed_rating,
        rcvm.rating AS committee_assigned_rating, rcm.id AS rating_committee_meeting_id, rcm.meeting_at AS meeting_at FROM rating_committee_meeting_registers rcmr 
        INNER JOIN companies c ON c.id = rcmr.company_id
        INNER JOIN mandates m ON m.id = rcmr.mandate_id
        INNER JOIN instrument_categories ic ON ic.id = rcmr.instrument_category_id
        INNER JOIN instrument_details id ON id.id = rcmr.instrument_detail_id
        INNER JOIN rating_processes rp ON rp.id = id.rating_process_id
        INNER JOIN rating_committee_meetings rcm ON rcm.id = :rating_committee_meeting_id
        INNER JOIN rating_committee_voting_metadata rcvm ON rcvm.id = :rating_committee_meeting_id
        WHERE rcmr.rating_committee_meeting_id = :rating_committee_meeting_id
        `, {
          replacements: {
            rating_committee_meeting_id: rating_committee_meeting.id
          },
          type: QueryTypes.SELECT
        })

        console.log("rating_sheet_data----.", rating_sheet_data);

        return reply.send({
          success: true,
          rating_sheet_data: rating_sheet_data,
        });

      } catch(error) {
        let error_log = {
          api: "v1/rating_sheet_data",
          activity: "RATING_SHEET_DATA",
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
    })

    fastify.post("/rating_action", async (request, reply) => {
      try {

        const { params } = request.body;

       const prev_rating_weightage = await RatingCommitteeMeeting.findOne({
          where: {
            uuid: params["previous_rating"]
          }, 
          raw: true
        })

        const current_rating_weightage = await RatingCommitteeMeeting.findOne({
          where: {
            uuid: params["current_rating"]
          }, 
          raw: true
        })

        // const rating_sheet_data = await DB_CLIENT.query(`
        // SELECT c.name AS entity_name, ic.category_name AS instrument, m.total_size, rp.name AS nature_of_assignment, rcmr.short_term_rating_recommendation AS existing_rating, rcmr.long_term_rating_recommendation AS proposed_rating,
        // rcvm.rating AS committee_assigned_rating, rcm.id AS rating_committee_meeting_id, rcm.meeting_at AS meeting_at FROM rating_committee_meeting_registers rcmr 
        // INNER JOIN companies c ON c.id = rcmr.company_id
        // INNER JOIN mandates m ON m.id = rcmr.mandate_id
        // INNER JOIN instrument_categories ic ON ic.id = rcmr.instrument_category_id
        // INNER JOIN instrument_details id ON id.id = rcmr.instrument_detail_id
        // INNER JOIN rating_processes rp ON rp.id = id.rating_process_id
        // INNER JOIN rating_committee_meetings rcm ON rcm.id = :rating_committee_meeting_id
        // INNER JOIN rating_committee_voting_metadata rcvm ON rcvm.id = :rating_committee_meeting_id
        // WHERE rcmr.rating_committee_meeting_id = :rating_committee_meeting_id
        // `, {
        //   replacements: {
        //     rating_committee_meeting_id: rating_committee_meeting.id
        //   },
        //   type: QueryTypes.SELECT
        // })

        // console.log("rating_sheet_data----.", rating_sheet_data);

        return reply.send({
          success: true,
          current_rating_weightage: current_rating_weightage,
        });

      } catch(error) {
        let error_log = {
          api: "v1/rating_sheet_data",
          activity: "RATING_SHEET_DATA",
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
    })

    done();
  });
}

module.exports = {
  rating_committee_routes,
};
