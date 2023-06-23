const { QueryTypes } = require("sequelize");
const moment = require("moment");
const { DB_CLIENT } = require("../db");
const { UPLOAD_DOCUMENT } = require("../helpers");
const {
  WorkflowInstanceLog,
  WorkflowDocument,
  WorkflowConfig,
} = require("../models/modules/workflow");
const { v4: uuidv4 } = require("uuid");

const workflow_progress_track = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("workflow_progress_track: instance ", params.instance);

      await DB_CLIENT.query(
        `UPDATE workflow_instances_log set is_active = 0, updated_at= :updated_at, updated_by= :updated_by WHERE workflow_instance_id =:instance_id `,
        {
          replacements: {
            updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
            updated_by: params.request.user.id,
            code: params.activity_code,
            rating_process_id: params.rating_process,
            instance_id: params.instance.id,
          },
          type: QueryTypes.UPDATE,
        }
      );

      const configs = await DB_CLIENT.query(
        `select DISTINCT(id)  from 
    workflow_configs WHERE current_activity_id IN (select next_activity_id from workflow_configs wc
    INNER JOIN activities a ON a.id = wc.current_activity_id WHERE a.code = :code AND wc.rating_process_id = :rating_process_id ) AND rating_process_id = :rating_process_id`,
        {
          replacements: {
            code: params.activity_code,
            rating_process_id: params.rating_process,
          },
          type: QueryTypes.UPDATE,
        }
      );

      console.log("configs: ", configs);

      const result = configs[0].map(async (el) => {
        const workflow_log = await WorkflowInstanceLog.create({
          uuid: uuidv4(),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: params.request.user.id,
          assigned_by: params.request.user.id,
          performed_by: params.performing_user,
          workflow_instance_id: params.instance.id,
          workflow_config_id: el.id,
        });

        console.log("workflow_log: ", workflow_log);
        return workflow_log;
      });

      resolve(result);
    } catch (error) {
      reject({
        error: "await workflow_progress_track_failed",
      });
    }
  });
};

const ACTIVITY_LOGICS = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      var result = "";
      let up_res = "";
      switch (params.activity_code) {
        case "10100":
          console.log("10100 :::::: ");
          const mandate_update_result = await DB_CLIENT.query(
            `UPDATE mandates set gh_id= :id where id= :mandate_id`,
            {
              replacements: {
                id: params.user,
                mandate_id: params.mandate_id,
              },
              type: QueryTypes.UPDATE,
            }
          );

          result = await await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,
            performing_user: params.user,
          });

          console.log("ACTIVITY_LOGICS 10100: ", result);

          resolve(result);

          break;

        case "10150":
          await DB_CLIENT.query(
            `UPDATE mandates set ra_id= :id where id= :mandate_id`,
            {
              replacements: {
                id: params.user,
                mandate_id: params.mandate_id,
              },
              type: QueryTypes.UPDATE,
            }
          );

          result = await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,
            performing_user: params.user,
          });

          resolve(result);

          break;

        case "10200":
          await DB_CLIENT.query(
            `UPDATE instrument_details set annual_result = :annual_result, quarterly_result = :quarterly_result, annual_result_date = :annual_result_date WHERE id IN (Select id.id from instrument_details id INNER JOIN transaction_instruments ti ON ti.id = id.transaction_instrument_id INNER JOIN 
        mandates m ON m.id = ti.mandate_id Where m.id = :mandate_id) AND rating_process_id = :rating_process_id`,
            {
              replacements: {
                mandate_id: params.mandate_id,
                annual_result: params.request.body.params.annual_result,
                quarterly_result: params.request.body.params.quarterly_result,
                annual_result_date:
                  params.request.body.params.annual_result_date,
                rating_process_id: params.rating_process,
              },
              type: QueryTypes.UPDATE,
            }
          );

          result = await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });

          resolve(result);

          break;

        case "10300":
          result = await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });

          resolve(result);
          break;

        case "10250":
          await DB_CLIENT.query(
            `UPDATE mandates set mandate_status= 'ASSIGNED',gh_id= :id where id= :mandate_id`,
            {
              replacements: {
                id: params.user,
                mandate_id: params.mandate_id,
              },
              type: QueryTypes.UPDATE,
            }
          );

          result = await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });

          resolve(result);
          break;

        case "10350":
          await DB_CLIENT.query(
            `UPDATE mandates set mandate_status= 'ASSIGNED' where id= :mandate_id`,
            {
              replacements: {
                id: params.user,
                mandate_id: params.mandate_id,
              },
              type: QueryTypes.UPDATE,
            }
          );

          result = await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });

          resolve(result);
          break;

        case "10400":
          await DB_CLIENT.query(
          `UPDATE mandates set mandate_status= 'ASSIGNED', ra_id = :ra_id where id= :mandate_id`,
            {
              replacements: {
                id: params.user,
                mandate_id: params.mandate_id,
                ra_id: params.user,
              },
              type: QueryTypes.UPDATE,
            }
          );

          result = await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });

          resolve(result);
          break;

        case "10425":
          await DB_CLIENT.query(
            `UPDATE mandates set mandate_status= 'ASSIGNED', gh_id = :gh_id where id= :mandate_id`,
            {
              replacements: {
                id: params.user,
                mandate_id: params.mandate_id,
                gh_id: params.user,
              },
              type: QueryTypes.UPDATE,
            }
          );

          result = await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });

          resolve(result);

          break;

        case "10450":
          await DB_CLIENT.query(
            `UPDATE mandates set mandate_status= 'SENT TO COMMITTEE' where id= :mandate_id`,
            {
              replacements: {
                id: params.user,
                mandate_id: params.mandate_id,
              },
              type: QueryTypes.UPDATE,
            }
          );

          result = await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });

          resolve(result);
          break;

        case "10500":
          result = await DB_CLIENT.query(
            `UPDATE rating_committee_meeting_registers set voting_status = 'Completed'
          WHERE mandate_id = :mandate_id`,
            {
              replacements: {
                id: params.user,
                mandate_id: params.mandate_id,
              },
              type: QueryTypes.UPDATE,
            }
          );

          await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });

          resolve(result);

          break;

        case "10550":
        case "10600":
          await DB_CLIENT.query(
            `UPDATE rating_committee_meeting_registers set overall_status = 'Rating Verified' WHERE mandate_id = :mandate_id`,
            {
              replacements: {
                id: params.user,
                mandate_id: params.mandate_id,
              },
              type: QueryTypes.UPDATE,
            }
          );

          result = await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });

          resolve(result);
          break;
        case "10650":
          up_res = await DB_CLIENT.query(
            `UPDATE instrument_details set provisional_communication_date = :provisional_communication_date WHERE id IN (Select id.id from instrument_details id INNER JOIN transaction_instruments ti ON ti.id = id.transaction_instrument_id INNER JOIN 
      mandates m ON m.id = ti.mandate_id Where m.id = :mandate_id ) AND rating_process_id = :rating_process_id`,
            {
              replacements: {
                mandate_id: params.mandate_id,
                provisional_communication_date: params.request.body
                  .provisional_communication_date
                  ? params.request.body.provisional_communication_date.value
                  : moment().format("YYYY-MM-DD HH:mm:ss"),
                rating_process_id: params.rating_process,
              },
              type: QueryTypes.UPDATE,
            }
          );
          result = await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });

          resolve(result);

          break;

        case "10700":
          console.log(
            "params.request.body.acceptance_date.value: ",
            params.request.body.acceptance_date.value
          );
          console.log(
            "params.request.body.acceptance_status.value: ",
            params.request.body.acceptance_status.value
          );

          up_res = await DB_CLIENT.query(
            `UPDATE instrument_details set rating_acceptance_date = :acceptance_date, rating_acceptance_status = :acceptance_status WHERE id IN (Select id.id from instrument_details id INNER JOIN transaction_instruments ti ON ti.id = id.transaction_instrument_id INNER JOIN 
        mandates m ON m.id = ti.mandate_id Where m.id = :mandate_id) AND rating_process_id = :rating_process_id`,
            {
              replacements: {
                mandate_id: params.mandate_id,
                acceptance_date: params.request.body.acceptance_date
                  ? params.request.body.acceptance_date.value
                  : moment().format("YYYY-MM-DD HH:mm:ss"),
                acceptance_status: params.request.body.acceptance_status
                  ? params.request.body.acceptance_status.value
                  : moment().format("YYYY-MM-DD HH:mm:ss"),
                rating_process_id: params.rating_process,
              },
              type: QueryTypes.UPDATE,
            }
          );

          console.log("up_res: ", up_res);

          result = await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });
          resolve(result);

          break;

        case "10750":
        case "10800":
          up_res = await DB_CLIENT.query(
            `UPDATE instrument_details set rating_letter_date = :rating_letter_date WHERE id IN (Select id.id from instrument_details id INNER JOIN transaction_instruments ti ON ti.id = id.transaction_instrument_id INNER JOIN 
        mandates m ON m.id = ti.mandate_id Where m.id = :mandate_id) AND rating_process_id =:rating_process_id `,
            {
              replacements: {
                mandate_id: params.mandate_id,
                rating_letter_date: params.request.body.rating_letter_date
                  ? params.request.body.rating_letter_date.value
                  : null,
                rating_process_id: params.rating_process,
              },
              type: QueryTypes.UPDATE,
            }
          );
          result = await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });
          resolve(result);

          break;
        case "10850":
        case "10900":
        case "10950":
        case "11000":
          result = await await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });

          console.log("ACTIVITY_LOGICS 10850: ", result);

          resolve(result);

          break;
        case "11050":
          up_res = await DB_CLIENT.query(
            `UPDATE instrument_details set press_release_date = :press_release_date WHERE id IN (Select id.id from instrument_details id INNER JOIN transaction_instruments ti ON ti.id = id.transaction_instrument_id INNER JOIN 
        mandates m ON m.id = ti.mandate_id Where m.id = :mandate_id) AND rating_process_id =:rating_process_id `,
            {
              replacements: {
                mandate_id: params.mandate_id,
                press_release_date: params.request.body.press_release_date
                  ? params.request.body.press_release_date.value
                  : moment().format("YYYY-MM-DD HH:mm:ss"),
                rating_process_id: params.rating_process,
              },
              type: QueryTypes.UPDATE,
            }
          );

          result = await await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });

          console.log("ACTIVITY_LOGICS 10850: ", result);

          resolve(result);

          break;
        case "11100":
          up_res = await DB_CLIENT.query(
            `UPDATE instrument_details set is_active = 0 WHERE id IN (Select id.id from instrument_details id INNER JOIN transaction_instruments ti ON ti.id = id.transaction_instrument_id INNER JOIN 
        mandates m ON m.id = ti.mandate_id Where m.id = :mandate_id) AND rating_process_id =:rating_process_id `,
            {
              replacements: {
                mandate_id: params.mandate_id,
                rating_process_id: params.rating_process,
              },
              type: QueryTypes.UPDATE,
            }
          );

          result = await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });

          resolve(result);

          break;

        default:
          result = await workflow_progress_track({
            activity_code: params.activity_code,
            // next_activity_code: params.next_activity_code,
            request: params.request,
            instance: params.instance,
            rating_process: params.rating_process,

            performing_user: params.user,
          });

          resolve(result);
          break;
      }
    } catch (error) {
      reject({
        error: "Activity logic failed",
      });
    }
  });
};

const workflow_rollback_track = async (params) => {
  try {
    console.log("workflow_rollback_track: ", params.instance);

    await DB_CLIENT.query(
      `UPDATE workflow_instances_log set status= :rollback, is_active = 0, updated_at= :updated_at, updated_by= :updated_by WHERE workflow_config_id IN (SELECT id FROM workflow_configs WHERE current_activity_id IN ( SELECT wc3.next_activity_id FROM workflow_configs wc3 WHERE wc3.current_activity_id IN
        (SELECT wc.current_activity_id FROM workflow_configs wc WHERE wc.next_activity_id IN (SELECT a.id from activities a WHERE a.code = :code) AND
        wc.rating_process_id =:rating_process_id) AND wc3.rating_process_id = :rating_process_id)) AND workflow_instance_id =:instance_id `,
      {
        replacements: {
          updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
          updated_by: params.request.user.id,
          code: params.activity_code,
          rating_process_id: params.rating_process,
          instance_id: params.instance.id,
          rollback: 'rollback'
        },
        type: QueryTypes.UPDATE,
      }
    );

    await DB_CLIENT.query(
      `UPDATE workflow_instances_log set is_active = 1 WHERE workflow_config_id IN 
      (SELECT wc.id FROM workflow_configs wc WHERE wc.next_activity_id IN (SELECT a.id from activities 
        a WHERE a.code = :code) AND wc.rating_process_id =:rating_process_id)
         AND workflow_instance_id =:instance_id `,
      {
        replacements: {
          code: params.activity_code,
          rating_process_id: params.rating_process,
          instance_id: params.instance.id,
        },
        type: QueryTypes.UPDATE,
      }
    );
  } catch (error) {
    throw error;
  }
};

const ACTIVITY_ROLLBACK_LOGICS = async (params) => {
  var result = {};
  try {
    switch (params.activity_code) {
      case "10150":
        await DB_CLIENT.query(
          `UPDATE mandates set gh_id = null where id= :mandate_id`,
          {
            replacements: {
              mandate_id: params.mandate_id,
            },
            type: QueryTypes.UPDATE,
          }
        );

        workflow_rollback_track({
          activity_code: params.activity_code,
          // next_activity_code: params.next_activity_code,
          request: params.request,
          instance: params.instance,
          rating_process: params.rating_process,
        });

        break;

      case "10200":
        await DB_CLIENT.query(
          `UPDATE mandates set ra_id = null where id= :mandate_id`,
          {
            replacements: {
              mandate_id: params.mandate_id,
            },
            type: QueryTypes.UPDATE,
          }
        );

        workflow_rollback_track({
          activity_code: params.activity_code,
          // next_activity_code: params.next_activity_code,
          request: params.request,
          instance: params.instance,
          rating_process: params.rating_process,
        });

        break;
      case "13000":
        workflow_rollback_track({
          activity_code: params.activity_code,
          // next_activity_code: params.next_activity_code,
          request: params.request,
          instance: params.instance,
          rating_process: params.rating_process,
        });
        break;

      case "10300":
        workflow_rollback_track({
          activity_code: params.activity_code,
          // next_activity_code: params.next_activity_code,
          request: params.request,
          instance: params.instance,
          rating_process: params.rating_process,
        });
        break;

      case "10250":
        workflow_rollback_track({
          activity_code: params.activity_code,
          // next_activity_code: params.next_activity_code,
          request: params.request,
          instance: params.instance,
          rating_process: params.rating_process,
        });
        break;

      case "10350":
        await DB_CLIENT.query(
          `UPDATE mandates set mandate_status= 'UNASSIGNED' where id= :mandate_id`,
          {
            replacements: {
              id: params.user,
              mandate_id: params.mandate_id,
            },
            type: QueryTypes.UPDATE,
          }
        );

        workflow_rollback_track({
          activity_code: params.activity_code,
          // next_activity_code: params.next_activity_code,
          request: params.request,
          instance: params.instance,
          rating_process: params.rating_process,
        });
        break;

      case "10400":
        await DB_CLIENT.query(
          `UPDATE mandates set mandate_status= null where id= :mandate_id`,
          {
            replacements: {
              id: params.user,
              mandate_id: params.mandate_id,
              gh_id: params.user,
            },
            type: QueryTypes.UPDATE,
          }
        );

        workflow_rollback_track({
          activity_code: params.activity_code,
          // next_activity_code: params.next_activity_code,
          request: params.request,
          instance: params.instance,
          rating_process: params.rating_process,
        });

        break;

      case "10450":
        await DB_CLIENT.query(
          `UPDATE mandates set mandate_status= 'ASSIGNED' where id= :mandate_id`,
          {
            replacements: {
              id: params.user,
              mandate_id: params.mandate_id,
            },
            type: QueryTypes.UPDATE,
          }
        );

        workflow_rollback_track({
          activity_code: params.activity_code,
          // next_activity_code: params.next_activity_code,
          request: params.request,
          instance: params.instance,
          rating_process: params.rating_process,
        });

        break;

      case "10500":
        await DB_CLIENT.query(
          `UPDATE rating_committee_meeting_registers set voting_status = 'Completed'
          WHERE mandate_id = :mandate_id`,
          {
            replacements: {
              id: params.user,
              mandate_id: params.mandate_id,
            },
            type: QueryTypes.UPDATE,
          }
        );

        workflow_rollback_track({
          activity_code: params.activity_code,
          // next_activity_code: params.next_activity_code,
          request: params.request,
          instance: params.instance,
          rating_process: params.rating_process,
        });

        break;

      case "10550":
      case "10600":
        await DB_CLIENT.query(
          `UPDATE rating_committee_meeting_registers set voting_status = 'Upcoming', overall_status = 'Voting Ongoing' WHERE mandate_id = :mandate_id`,
          {
            replacements: {
              id: params.user,
              mandate_id: params.mandate_id,
            },
            type: QueryTypes.UPDATE,
          }
        );

        workflow_rollback_track({
          activity_code: params.activity_code,
          // next_activity_code: params.next_activity_code,
          request: params.request,
          instance: params.instance,
          rating_process: params.rating_process,
        });

        break;
      case "10650":
        workflow_rollback_track({
          activity_code: params.activity_code,
          // next_activity_code: params.next_activity_code,
          request: params.request,
          instance: params.instance,
          rating_process: params.rating_process,
        });

        break;

      case "10700":
        // await DB_CLIENT.query(
        //   `UPDATE instrument_details set acceptance_date = :acceptance_date, acceptance_status = :acceptance_status WHERE id IN (Select id.id from instrument_details id INNER JOIN transaction_instruments ti ON ti.id = id.transaction_instrument_id INNER JOIN
        // mandates m ON m.id = ti.mandate_id Where m.id = :mandate_id) `,
        //   {
        //     replacements: {
        //       mandate_id: params.mandate_id,
        //       acceptance_date: params.request.body.params.acceptance_date,
        //       acceptance_status: params.request.body.params.acceptance_status,
        //     },
        //     type: QueryTypes.UPDATE,
        //   }
        // );

        workflow_rollback_track({
          activity_code: params.activity_code,
          // next_activity_code: params.next_activity_code,
          request: params.request,
          instance: params.instance,
          rating_process: params.rating_process,
        });

        break;

      case "10750":
        workflow_rollback_track({
          activity_code: params.activity_code,
          // next_activity_code: params.next_activity_code,
          request: params.request,
          instance: params.instance,
          rating_process: params.rating_process,
        });

        break;

      case "10800":
      case "10850":
      case "10900":
      case "10950":
      case "11000":
      case "11050":
      case "11100":
        workflow_rollback_track({
          activity_code: params.activity_code,
          // next_activity_code: params.next_activity_code,
          request: params.request,
          instance: params.instance,
          rating_process: params.rating_process,
        });

        break;

      default:
        workflow_rollback_track({
          activity_code: params.activity_code,
          // next_activity_code: params.next_activity_code,
          request: params.request,
          instance: params.instance,
          rating_process: params.rating_process,
        });
    }
  } catch (error) {
    throw error;
  }
};

module.exports = {
  ACTIVITY_LOGICS,
  ACTIVITY_ROLLBACK_LOGICS,
};
