const { QueryTypes, Sequelize } = require("sequelize");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
const { DB_CLIENT } = require("../../db");
const {
  WorkflowInstance,
  WorkflowConfig,
  Activity,
  WorkflowInstanceLog,
  WorkflowDocument,
  WorkflowRollbackLog,
  WorkflowDocumentRemark,
} = require("../../models/modules/workflow");
const { ACTIVITY_LOGICS, ACTIVITY_ROLLBACK_LOGICS } = require("../../services/workflow-activities-bl");
const { User, Mandate, Company } = require("../../models/modules/onboarding");
const {
  CHECK_PERMISSIONS,
  UPLOAD_DOCUMENT,
  UPLOAD_TO_AZURE_STORAGE,
  CONVERT_TO_ARRAY,
} = require("../../helpers");
const { RatingProcess, RatingSymbolMaster, RatingSymbolMapping } = require("../../models/modules/rating-model");
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
} = require("@azure/storage-blob");

const get_args = async (params) => {
  try{
    
  // const workflow_obj = await WorkflowInstance.findOne({
  //   where: {
  //     mandate_id: params.mandate_id,
  //     is_active: true,
  //   },
  //   raw: true,
  // });

  const workflow_instance = await DB_CLIENT.query(
    `SELECT wi.id, wi.financial_year_id FROM mandates m 
    INNER JOIN workflow_instances wi ON wi.mandate_id = m.id 
    INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id = wi.id 
    INNER JOIN workflow_configs wc ON wc.id = wil.workflow_config_id 
    INNER JOIN rating_processes rp ON rp.id = wc.rating_process_id 
    WHERE rp.id= :process_id AND wil.is_active =1 AND m.id = :mandate_id
    AND m.is_active = 1
    `,
    {
      replacements: {
        mandate_id: params.mandate_id,
        process_id: params.rating_process.id,
      },
      type: QueryTypes.SELECT,
    }
  );

  let given_user = await User.findOne({
    where: {
      uuid: params["user_uuid"],
      is_active: true,
    },
    raw: true,
  });

  // console.log("workflow_obj: ", workflow_obj);
  // console.log("given_user: ", given_user);

  if(!workflow_instance.length || !given_user){
    params.reply.statusCode = 422;
        return params.reply.send({
          success: false,
          error: "Workflow not found",
        });
  }

  const args = {
    instance: workflow_instance[0],
    user: given_user.id,
    mandate_id: params.mandate_id,
    activity_code: params["code"],
    // next_activity_code: nex_activity[0].code,
    request: params.request,
    rating_process: params.rating_process.id,
  };

  console.log("args: ", args);

  const result = await ACTIVITY_LOGICS(args);
}catch(error){
  params.reply.statusCode = 422;
        return params.reply.send({
          success: false,
          error: error["errors"] ?? String(error),
        });
}
};

async function inbox_routes(fastify) {
  fastify.post("/inbox/execution/assign_to_user", async (request, reply) => {
    try {
      await CHECK_PERMISSIONS(request, "Inbox.List");
      const { params } = request.body;

      const mandates = await Mandate.findAll({
        where: {
          mandate_id: params["mandate_id"],
          is_active: true,
        },
        raw: true,
      });

      const rating_process = await RatingProcess.findOne({
        where: {
          uuid: params["rating_process_uuid"],
          is_active: true,
        },
        raw: true,
      });

      if ( !mandates || !rating_process) {
        (reply.statusCode = 422),
          reply.send({
            success: false,
            error: "No Workflow Found",
          });
        return;
      }

      const company = await Company.findOne({
        where: {
          id: mandates[0].company_id,
          is_active: true,
        },
        raw: true,
      });

      const workflow_doc = await DB_CLIENT.query(
        `SELECT TOP 1 * FROM workflow_documents wd WHERE company_id = :company_id AND rating_process_id =:rating_process_id  ORDER BY updated_at DESC`,
        {
          replacements: {
            company_id: company.id,
            rating_process_id: rating_process.id
          },
          type: QueryTypes.SELECT,
        }
      );

      const workflow_doc_remark_update = await DB_CLIENT.query(
        `UPDATE workflow_document_remarks set is_active = 0 WHERE workflow_document_id =:workflow_document_id`,
        {
          replacements: {
            workflow_document_id: workflow_doc.length > 0 ? workflow_doc[0].id : null
          },
          type: QueryTypes.UPDATE,
        }
      );

      const result = mandates.map(async (el) => {
        const workflow_instance = await DB_CLIENT.query(
          `SELECT wi.id FROM mandates m 
          INNER JOIN workflow_instances wi ON wi.mandate_id = m.id 
          INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id = wi.id 
          INNER JOIN workflow_configs wc ON wc.id = wil.workflow_config_id 
          INNER JOIN rating_processes rp ON rp.id = wc.rating_process_id 
          WHERE rp.id= :process_id AND wil.is_active =1 AND m.id = :mandate_id AND m.is_active = 1
          `,
          {
            replacements: {
              mandate_id: el.id,
              process_id: rating_process.id,
            },
            type: QueryTypes.SELECT,
          }
        );

        if (!workflow_instance ) {
          (reply.statusCode = 422),
            reply.send({
              success: false,
              error: "No Workflow Found",
            });
          return;
        }

        console.log("workflow_instance: ", workflow_instance);

        let given_user = await User.findOne({
          where: {
            uuid: params["user_uuid"],
            is_active: true,
          },
          raw: true,
        });

        if (params["code"] === "10500") {
          given_user = await User.findOne({
            where: {
              id: el.gh_id,
              is_active: true,
            },
            raw: true,
          });
        }
        if (params["code"] === "10550" || params["code"] === "10600") {
          given_user = await User.findOne({
            where: {
              id: el.ra_id,
              is_active: true,
            },
            raw: true,
          });
        }

        const args = {
          instance: workflow_instance[0],
          user: given_user ? given_user.id : request.user.id,
          mandate_id: el.id,
          activity_code: params["code"],
          // next_activity_code: nex_activity[0].code,
          request: request,
          reply: reply,
          rating_process: rating_process.id,
        };

        const res = await ACTIVITY_LOGICS(args);
        return res;
      });

      return reply.send({
        success: true,
        result: result,
      });
    } catch (error) {
      reply.statusCode = 422;
      return reply.send({
        success: false,
        error: String(error),
      });
    }
  });

  fastify.post("/inbox/execution/upload_doc", async (request, reply) => {
    try {
      await CHECK_PERMISSIONS(request, "Inbox.List");

      const mandate_id = CONVERT_TO_ARRAY(request.body["mandate_id[]"]).map(
        (row) => row["value"]
      );

      console.log("body: ", request.body);

      const rating_process = await RatingProcess.findOne({
        where: {
          uuid: request.body["rating_process_uuid"].value,
          is_active: true,
        },
        raw: true,
      });

      if (!rating_process) {
        (reply.statusCode = 422),
          reply.send({
            success: false,
            error: "No Rating Process Found",
          });
        return;
      }

      console.log("rating_process: ", rating_process);

      const mandates = await Mandate.findAll({
        where: {
          mandate_id: mandate_id,
          is_active: true,
        },
        raw: true,
      });

      console.log("mandates: ", mandates);

      if (!mandates) {
        (reply.statusCode = 422),
          reply.send({
            success: false,
            error: "No Mandate Found",
          });
        return;
      }

      var document_path = {};

      const company = await Company.findOne({
        where: {
          id: mandates[0].company_id,
          is_active: true,
        },
        raw: true,
      });

      const workflow_instance = await DB_CLIENT.query(
        `SELECT wi.id, wi.financial_year_id FROM mandates m 
        INNER JOIN workflow_instances wi ON wi.mandate_id = m.id 
        INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id = wi.id 
        INNER JOIN workflow_configs wc ON wc.id = wil.workflow_config_id 
        INNER JOIN rating_processes rp ON rp.id = wc.rating_process_id 
        WHERE rp.id= :process_id AND wil.is_active =1 AND m.id = :mandate_id
        AND m.is_active = 1
        `,
        {
          replacements: {
            mandate_id: mandates[0].id,
            process_id: rating_process.id,
          },
          type: QueryTypes.SELECT,
        }
      );

      if (!company || !workflow_instance) {
        (reply.statusCode = 422),
          reply.send({
            success: false,
            error: "No Workflow Found",
          });
        return;
      }

      const workflow_doc = await DB_CLIENT.query(
        `SELECT TOP 1 * FROM workflow_documents wd WHERE company_id = :company_id AND rating_process_id =:rating_process_id  ORDER BY updated_at DESC`,
        {
          replacements: {
            company_id: company.id,
            rating_process_id: rating_process.id
          },
          type: QueryTypes.SELECT,
        }
      );

      const workflow_doc_remark_update = await DB_CLIENT.query(
        `UPDATE workflow_document_remarks set is_active = 0 WHERE workflow_document_id =:workflow_document_id`,
        {
          replacements: {
            workflow_document_id: workflow_doc.length > 0 ? workflow_doc[0].id : null
          },
          type: QueryTypes.UPDATE,
        }
      );

      let workflow_document_remark = {};
      if(request.body.remark && request.body.status){
        workflow_document_remark = await WorkflowDocumentRemark.create({
          uuid: uuidv4(),
          remark: request.body['remark'].value,
          status: request.body['status'].value,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id
        });
      }

      console.log("workflow_document_remark: ", workflow_document_remark);

      if (request.body["rating_note"]) {
        const document_buffer = await request.body["rating_note"].toBuffer();
        document_path = await UPLOAD_TO_AZURE_STORAGE(document_buffer, {
          path: request.body.rating_note.filename,
        });

        const workflow_document = await WorkflowDocument.create({
          uuid: uuidv4(),
          rating_note: document_path,
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
financial_year_id: workflow_instance[0].financial_year_id,
rating_process_id: rating_process.id,
        });

        if(Object.keys(workflow_document_remark).length > 0){
         workflow_document_remark.setWorkflow_document(workflow_document);
           }

      } else if (request.body["provisional_communication"]) {
        const document_buffer = await request.body[
          "provisional_communication"
        ].toBuffer();
        document_path = await UPLOAD_TO_AZURE_STORAGE(document_buffer, {
          path: request.body.provisional_communication.filename,
        });

        const workflow_document = await WorkflowDocument.create({
          uuid: uuidv4(),
          rating_note: workflow_doc.length
            ? workflow_doc[0].rating_note
            : null,
          provisional_communication: document_path,
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
financial_year_id: workflow_instance[0].financial_year_id,
rating_process_id: rating_process.id
        });

        if(Object.keys(workflow_document_remark).length > 0){
          workflow_document_remark.setWorkflow_document(workflow_document);
            }

      } else if (request.body["rating_letter"]) {
        const document_buffer = await request.body["rating_letter"].toBuffer();
        document_path = await UPLOAD_TO_AZURE_STORAGE(document_buffer, {
          path: request.body.rating_letter.filename,
        });

        const workflow_document = await WorkflowDocument.create({
          uuid: uuidv4(),
          rating_letter: document_path,
          rating_note: workflow_doc.length
            ? workflow_doc[0].rating_note
            : null,
          provisional_communication: workflow_doc.length
            ? workflow_doc[0].provisional_communication
            : null,
          press_release: workflow_doc.length
            ? workflow_doc[0].press_release
            : null,
          rating_sheet: workflow_doc.length
            ? workflow_doc[0].rating_sheet
            : null,
          financial: workflow_doc.length
            ? workflow_doc[0].financial
            : null,
          other_document: workflow_doc.length
              ? workflow_doc[0].other_document
              : null,  
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
          company_id: company.id,
          role_id: request.active_role_id,
financial_year_id: workflow_instance[0].financial_year_id,
rating_process_id: rating_process.id
        });

        if(Object.keys(workflow_document_remark).length > 0){
          workflow_document_remark.setWorkflow_document(workflow_document);
            }

      } else if (request.body["press_release"]) {
        const document_buffer = await request.body["press_release"].toBuffer();
        document_path = await UPLOAD_TO_AZURE_STORAGE(document_buffer, {
          path: request.body.press_release.filename,
        });

        const workflow_document = await WorkflowDocument.create({
          uuid: uuidv4(),
          press_release: document_path,
          rating_letter: workflow_doc.length
            ? workflow_doc[0].rating_letter
            : null,
          rating_note: workflow_doc.length
            ? workflow_doc[0].rating_note
            : null,
          provisional_communication: workflow_doc.length
            ? workflow_doc[0].provisional_communication
            : null,
          rating_sheet: workflow_doc.length
            ? workflow_doc[0].rating_sheet
            : null,
          financial: workflow_doc.length
            ? workflow_doc[0].financial
            : null,
          other_document: workflow_doc.length
              ? workflow_doc[0].other_document
              : null,  
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
          company_id: company.id,
          role_id: request.active_role_id,
          financial_year_id: workflow_instance[0].financial_year_id,
          rating_process_id: rating_process.id
        });

        if(Object.keys(workflow_document_remark).length > 0){
         workflow_document_remark.setWorkflow_document(workflow_document);
           }

      } else if (request.body["rating_sheet"]) {
        const document_buffer = await request.body["rating_sheet"].toBuffer();
        document_path = await UPLOAD_TO_AZURE_STORAGE(document_buffer, {
          path: request.body.rating_sheet.filename,
        });

        const workflow_document = await WorkflowDocument.create({
          uuid: uuidv4(),
          rating_sheet: document_path,
          press_release: workflow_doc.length
            ? workflow_doc[0].press_release
            : null,
          rating_letter: workflow_doc.length
            ? workflow_doc[0].rating_letter
            : null,
          rating_note: workflow_doc.length
            ? workflow_doc[0].rating_note
            : null,
          provisional_communication: workflow_doc.length
            ? workflow_doc[0].provisional_communication
            : null,
          financial: workflow_doc.length
            ? workflow_doc[0].financial
            : null,
          other_document: workflow_doc.length
              ? workflow_doc[0].other_document
              : null,  
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id,
          company_id: company.id,
          role_id: request.active_role_id,
          financial_year_id: workflow_instance[0].financial_year_id,
rating_process_id: rating_process.id
        });
        if(Object.keys(workflow_document_remark).length > 0){
          workflow_document_remark.setWorkflow_document(workflow_document);
            }
      }

      var doc_upload_data = [];

      const result = mandates.map(async (el) => {
        const workflow_instance = await DB_CLIENT.query(
          `SELECT wi.id, wi.financial_year_id FROM mandates m 
          INNER JOIN workflow_instances wi ON wi.mandate_id = m.id 
          INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id = wi.id 
          INNER JOIN workflow_configs wc ON wc.id = wil.workflow_config_id 
          INNER JOIN rating_processes rp ON rp.id = wc.rating_process_id 
          WHERE rp.id= :process_id AND wil.is_active =1 AND m.id = :mandate_id
          `,
          {
            replacements: {
              mandate_id: el.id,
              process_id: rating_process.id,
            },
            type: QueryTypes.SELECT,
          }
        );

        const given_user = await User.findOne({
          where: {
            uuid: request.body.user_uuid.value
              ? request.body.user_uuid.value
              : null,
            is_active: true,
          },
          raw: true,
        });

        console.log("workflow_doc: ", workflow_doc);

        var workflow_document = {};

        const args = {
          instance: workflow_instance[0],
          user: given_user ? given_user.id : request.user.id,
          mandate_id: el.id,
          activity_code: request.body["code"].value,
          // next_activity_code: nex_activity[0].code,
          request: request,
          rating_process: rating_process.id,
        };

        const return_result = await ACTIVITY_LOGICS(args);
        return return_result;
      });

      return reply.send({
        success: true,
        result: result,
      });
    } catch (error) {
      reply.statusCode = 422;
      return reply.send({
        success: false,
        error: String(error),
      });
    }
  });

  fastify.post("/inbox/execution/download_doc", async (request, reply) => {
    try {
      const { params } = request.body;

      await CHECK_PERMISSIONS(request, "Inbox.List");

      const company = await Company.findOne({
        where: {
          uuid: params["company_uuid"],
          is_active: true,
        },
        raw: true,
      });

      const rating_process = await RatingProcess.findOne({
        where: {
          uuid: params["rating_process_uuid"],
          is_active: true,
        },
        raw: true,
      });

      const workflow_doc = await DB_CLIENT.query(
        `SELECT TOP 1 wd.*, wdr.remark  FROM workflow_documents wd 
        LEFT JOIN workflow_document_remarks wdr ON wdr.workflow_document_id = wd.id
        WHERE wd.company_id =:company_id AND rating_process_id=:rating_process_id ORDER BY wd.updated_at DESC
        `,
        {
          replacements: {
            company_id: company.id,
            rating_process_id: rating_process.id
          },
          type: QueryTypes.SELECT,
        }
      );

      return reply.send({
        success: true,
        workflow_doc: workflow_doc,
      });
    } catch (error) {
      reply.statusCode = 422;
      return reply.send({
        success: false,
        error: String(error),
      });
    }
  });

  fastify.post("/inbox/view_executables", async (request, reply) => {
    try {
      await CHECK_PERMISSIONS(request, "Inbox.View");
      const { params } = request.body;

      const company = await Company.findOne({
        where: {
          uuid: params["company_uuid"],
          is_active: true,
        },
        raw: true,
      });

      const rating_process = await RatingProcess.findOne({
        where: {
          uuid: params["rating_process_uuid"],
          is_active: true,
        },
        raw: true,
      });

      var companies = await DB_CLIENT.query(
        `SELECT DISTINCT (company_name),
        company_uuid,mandate_uuid,category_name,role_name,role_uuid, mandate_id, total_size, rating_process_name,gh_employee_code, ra_employee_code, rating_process_uuid , gh_name, gh_uuid, ra_uuid, ra_name,
        is_last_activity,
        activity_code FROM (SELECT c.name AS company_name, gh_name, gh_uuid, ra_uuid, ra_name,wc.tat, wc.is_last_activity, gh_employee_code, ra_employee_code,r.name AS role_name, r.uuid AS role_uuid,
        c.uuid AS company_uuid,m.uuid AS mandate_uuid, m.mandate_id, m.total_size, rp.name AS rating_process_name, rp.uuid AS rating_process_uuid ,
        a.code AS activity_code, a.name AS activity_to_be_performed,ic.category_name  from companies c
        INNER JOIN mandates m ON m.company_id = c.id
        INNER JOIN workflow_instances wi ON wi.mandate_id = m.id
        INNER JOIN transaction_instruments ti ON ti.mandate_id = m.id
        INNER JOIN instrument_categories ic ON ic.id = ti.instrument_category_id 
        INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id  = wi.id
        INNER JOIN workflow_configs wc ON wc.id = wil.workflow_config_id 
        INNER JOIN roles r ON r.id = wc.performer_role_id
        INNER JOIN rating_processes rp ON rp.id = wc.rating_process_id
        INNER JOIN activities a ON a.id = wc.current_activity_id 
        LEFT JOIN (SELECT u.full_name AS gh_name, u.id, u.uuid AS gh_uuid, u.employee_code AS gh_employee_code from users u LEFT JOIN mandates m2 ON m2.gh_id =u.id ) AS sbq ON sbq.id = m.gh_id 
        LEFT JOIN (SELECT u.full_name AS ra_name, u.id, u.uuid AS ra_uuid, u.employee_code AS ra_employee_code from users u LEFT JOIN mandates m2 ON m2.ra_id =u.id ) AS sbq1 ON sbq1.id = m.ra_id
       where a.code = :code AND wil.is_active =1 AND wc.is_active =1 AND rp.id= :rating_process_id AND c.id = :company_id AND wil.performed_by = :performed_by AND m.is_active = 1 ) AS my_query ORDER BY mandate_id DESC`,
        {
          replacements: {
            company_id: company.id,
            code: params["code"],
            rating_process_id: rating_process.id,
            performer_role_id: request.active_role_id,
            gh: request.user.id,
            performed_by: request.user.id,
          },
          type: QueryTypes.SELECT,
        }
      );

      let last_activity_record = [];

      if (companies.length > 0 && companies[0].is_last_activity) {
        last_activity_record = await DB_CLIENT.query(
          `SELECT DISTINCT rcvm.instrument_detail_id, m.mandate_id, CONCAT(rcmr.sub_category_text, '/', rcmr.category_text, '/', rcmr.instrument_text  ) AS instrument, rcmr.previous_rating, 'Assigned' as rating_action,
          id.press_release_date ,id.provisional_communication_date ,id.rating_acceptance_date ,id.rating_acceptance_status, 
          rcvm.rating, rcvm.outlook FROM rating_committee_meeting_registers rcmr 
                    INNER JOIN companies c ON c.id = rcmr.company_id 
                    INNER JOIN mandates m ON m.company_id  = c.id
                    INNER JOIN workflow_instances wi ON wi.mandate_id = m.id
                    INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id  = wi.id
                    INNER JOIN workflow_configs wc ON wc.id = wil.workflow_config_id 
                    INNER JOIN activities a ON a.id = wc.current_activity_id 
                    INNER JOIN instrument_details id ON id.id = rcmr.instrument_detail_id 
                    INNER JOIN rating_committee_voting_metadata rcvm ON rcvm.instrument_detail_id = id.id
                    INNER JOIN rating_processes rp ON rp.id = id.rating_process_id
          WHERE a.code = :code AND wil.performed_by = :performed_by AND rp.id= :rating_process_id AND c.id = :company_id AND wil.is_active =1
          `,
          {
            replacements: {
              company_id: company.id,
              performed_by: request.user.id,
              code: params["code"],
              rating_process_id: rating_process.id,
              gh: request.user.id,
              performed_by: request.user.id,
            },
            type: QueryTypes.SELECT,
          }
        );
      }

      last_activity_record = await Promise.all(last_activity_record.map(async el => {
        if(el.previous_rating){
            
          let old_rating = el.previous_rating.indexOf('/') >= 0 ? el.previous_rating.split('/')[0] : el.previous_rating.split('/');

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

          let current_rating = el.rating.indexOf('/') >= 0 ? el.rating.split('/')[0] : el.rating.split('/');

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

      reply.send({
        success: true,
        companies: companies,
        last_activity_record: last_activity_record,
      });
    } catch (error) {
      reply.statusCode = 422;
      reply.send({
        success: false,
        error: String(error),
      });
    }
  });

  fastify.post("/inbox", async (request, reply) => {
    try {
      await CHECK_PERMISSIONS(request, "Inbox.List");

      let companies = await DB_CLIENT.query(
        `                     
        SELECT COUNT( DISTINCT m.id) AS mandate_count,wc.tat,wl_sq.from_user,wl_sq.from_user_code,wil.created_at,
        a.code, a.name AS activity_to_be_performed, c.name AS company_name,c.uuid AS company_uuid,sbq.remark,sbq.status,rp.name AS rating_process_name, rp.uuid AS rating_process_uuid from companies c INNER JOIN mandates m ON m.company_id = c.id 
                       INNER JOIN workflow_instances wi ON wi.mandate_id = m.id
                       INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id  = wi.id
                       INNER JOIN ( SELECT u2.full_name AS from_user, u2.employee_code AS from_user_code, wil2 .id FROM workflow_instances_log wil2
                       INNER JOIN users u2 ON u2.id = wil2.assigned_by ) AS wl_sq ON wl_sq.id = wil.id
                       INNER JOIN workflow_configs wc ON wc.id = wil.workflow_config_id 
                       INNER JOIN rating_processes rp ON rp.id = wc.rating_process_id 
                       INNER JOIN activities a ON a.id = wc.current_activity_id
                       LEFT JOIN (SELECT TOP 1 wdr.remark,wdr.status,wd.company_id  FROM workflow_documents wd 
                       INNER JOIN workflow_document_remarks wdr ON wdr.workflow_document_id = wd.id AND wdr.is_active = 1 ORDER BY wd.created_at DESC,wdr.updated_at DESC ) AS sbq ON sbq.company_id = c.id
                       WHERE wil.is_active = 1 AND wil.performed_by = :performed_by AND wc.is_active = 1
                       GROUP BY a.name,a.code, c.name,rp.name,c.uuid,rp.uuid,wl_sq.from_user,wl_sq.from_user_code,wc.tat,wil.created_at,sbq.remark,sbq.status ORDER BY wil.created_at DESC        
      `,
        {
          replacements: {
            id: request.user.id,
            performer_role_id: request.active_role_id,
            performed_by: request.user.id,
          },
          type: QueryTypes.SELECT,
        }
      );

      const my_set = new Set();

      companies = companies.map(el=> {
        var date1 = moment(el.created_at);
        var date2 = moment();
        var days = date2.diff(date1, 'days') ;
        el.pending_days = days;
        const obj = {
        mandate_count: el.mandate_count,
        tat: el.tat,
        from_user: el.from_user,
        from_user_code: el.from_user_code,
        code: el.code,
        activity_to_be_performed: el.activity_to_be_performed,
        company_name: el.company_name,
        company_uuid: el.company_uuid,
        rating_process_name: el.rating_process_name,
        rating_process_uuid: el.rating_process_uuid,
        pending_days: el.pending_days,
        remark: el.remark,
        status: el.status
    }
        my_set.add(JSON.stringify(obj));
        return el;
      })

      const result = [];

      for (const item of my_set.values()) {
        result.push(JSON.parse(item));
      }


      // var companies = {};
      // switch (request.active_role_name) {
      //   case "Group Head":
      //     companies = await DB_CLIENT.query(
      //       `                     
      //       select COUNT( DISTINCT m.id) AS mandate_count, a.code, a.name AS activity_to_be_performed, c.name AS company_name,c.uuid AS company_uuid, rp.name AS rating_process_name, rp.uuid AS rating_process_uuid from companies c INNER JOIN mandates m ON m.company_id = c.id 
      //                  INNER JOIN workflow_instances wi ON wi.mandate_id = m.id
      //                  INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id  = wi.id
      //                  INNER JOIN workflow_configs wc ON wc.id = wil.workflow_config_id 
      //                  INNER JOIN rating_processes rp ON rp.id = wc.rating_process_id 
      //                  INNER JOIN activities a ON a.id = wc.current_activity_id
      //                  WHERE wil.is_active = 1 AND wil.performed_by = :performed_by AND wc.is_active = 1 GROUP BY a.name,a.code, c.name,rp.name,c.uuid,rp.uuid ORDER BY c.name ASC, a.code DESC, rp.name DESC         
      //     `,
      //       {
      //         replacements: {
      //           id: request.user.id,
      //           performer_role_id: request.active_role_id,
      //           performed_by: request.user.id,
      //         },
      //         type: QueryTypes.SELECT,
      //       }
      //     );
      //     break;
      //   case "Rating Head":
      //     companies = await DB_CLIENT.query(
      //       `
      //       select COUNT( DISTINCT m.id) AS mandate_count, a.code, a.name AS activity_to_be_performed, c.name AS company_name,c.uuid AS company_uuid, rp.name AS rating_process_name, rp.uuid AS rating_process_uuid from companies c INNER JOIN mandates m ON m.company_id = c.id 
      //                  INNER JOIN workflow_instances wi ON wi.mandate_id = m.id
      //                  INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id  = wi.id
      //                  INNER JOIN workflow_configs wc ON wc.id = wil.workflow_config_id 
      //                  INNER JOIN rating_processes rp ON rp.id = wc.rating_process_id 
      //                  INNER JOIN activities a ON a.id = wc.current_activity_id
      //                  WHERE wil.is_active = 1 AND wil.performed_by = :performed_by AND wc.is_active = 1 GROUP BY a.name,a.code, c.name,rp.name,c.uuid,rp.uuid ORDER BY c.name ASC, a.code DESC, rp.name DESC  
      //     `,
      //       {
      //         replacements: {
      //           id: request.user.id,
      //           performer_role_id: request.active_role_id,
      //           performed_by: request.user.id,
      //         },
      //         type: QueryTypes.SELECT,
      //       }
      //     );
      //     // inbox_activity = get_count(companies);
      //     break;
      //   case "Rating Analyst":
      //     companies = await DB_CLIENT.query(
      //       `                     
      //       select COUNT( DISTINCT m.id) AS mandate_count, a.code, a.name AS activity_to_be_performed, c.name AS company_name,c.uuid AS company_uuid, rp.name AS rating_process_name, rp.uuid AS rating_process_uuid from companies c INNER JOIN mandates m ON m.company_id = c.id 
      //                  INNER JOIN workflow_instances wi ON wi.mandate_id = m.id
      //                  INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id  = wi.id
      //                  INNER JOIN workflow_configs wc ON wc.id = wil.workflow_config_id 
      //                  INNER JOIN rating_processes rp ON rp.id = wc.rating_process_id 
      //                  INNER JOIN activities a ON a.id = wc.current_activity_id
      //                  WHERE wil.is_active = 1 AND wil.performed_by = :performed_by AND wc.is_active = 1 GROUP BY a.name,a.code, c.name,rp.name,c.uuid,rp.uuid ORDER BY c.name ASC, a.code DESC, rp.name DESC        
      //     `,
      //       {
      //         replacements: {
      //           id: request.user.id,
      //           performed_by: request.user.id,
      //           performer_role_id: request.active_role_id,
      //         },
      //         type: QueryTypes.SELECT,
      //       }
      //     );
      //     break;
      //   default:
      //     companies = await DB_CLIENT.query(
      //       `                     
      //       select COUNT( DISTINCT m.id) AS mandate_count, a.code, a.name AS activity_to_be_performed, c.name AS company_name,c.uuid AS company_uuid, rp.name AS rating_process_name, rp.uuid AS rating_process_uuid from companies c INNER JOIN mandates m ON m.company_id = c.id 
      //                  INNER JOIN workflow_instances wi ON wi.mandate_id = m.id
      //                  INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id  = wi.id
      //                  INNER JOIN workflow_configs wc ON wc.id = wil.workflow_config_id 
      //                  INNER JOIN rating_processes rp ON rp.id = wc.rating_process_id 
      //                  INNER JOIN activities a ON a.id = wc.current_activity_id
      //                  WHERE wil.is_active = 1 AND wil.performed_by = :performed_by AND wc.is_active = 1 GROUP BY a.name,a.code, c.name,rp.name,c.uuid,rp.uuid ORDER BY c.name ASC, a.code DESC, rp.name DESC       
      //     `,
      //       {
      //         replacements: {
      //           performed_by: request.user.id,
      //         },
      //         type: QueryTypes.SELECT,
      //       }
      //     );
      // }

      return reply.send({
        success: true,
        companies: result,
      });
    } catch (error) {
      reply.statusCode = 422;
      return reply.send({
        success: false,
        error: String(error),
      });
    }
  });

  fastify.post("/inbox/execution/rollback", async (request, reply) => {
    try {
      await CHECK_PERMISSIONS(request, "Inbox.List");
      const { params } = request.body;

      const company = await Company.findOne({
        where: {
          uuid: params["company_uuid"],
          is_active: true,
        },
        raw: true,
      });

      const rating_process = await RatingProcess.findOne({
        where: {
          uuid: params["rating_process_uuid"],
          is_active: true,
        },
        raw: true,
      });

        const workflow_instance = await DB_CLIENT.query(
          `SELECT wi.id, wi.mandate_id FROM companies c  
          INNER JOIN workflow_instances wi ON wi.company_id = c.id 
          INNER JOIN workflow_instances_log wil ON wil.workflow_instance_id = wi.id 
          INNER JOIN workflow_configs wc ON wc.id = wil.workflow_config_id 
          INNER JOIN rating_processes rp ON rp.id = wc.rating_process_id 
          INNER JOIN activities a ON a.id = wc.current_activity_id 
          WHERE rp.id= :process_id AND wil.is_active =1 AND a.code = :code AND c.id = :company_id
          AND wil.performed_by = :performed_by
          `,
          {
            replacements: {
              company_id: company.id,
              process_id: rating_process.id,
              code: params['code'],
              performed_by: request.user.id
            },
            type: QueryTypes.SELECT,
          }
        );

        if (!workflow_instance.length) {
          (reply.statusCode = 422),
            reply.send({
              success: false,
              error: "No Workflow Found",
            });
          return;
        }

        workflow_instance.map(async el => {

          const workflow_rollback_log = await WorkflowRollbackLog.create({
            uuid: uuidv4(),
            remark: params["remark"],
            activity_code: params["code"],
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: request.user.id,
            workflow_instance_id: el.id,
            rating_process_id: rating_process.id
          });

        const args = {
          instance: el,
          activity_code: params["code"],
          mandate_id: el.mandate_id,
          // next_activity_code: nex_activity[0].code,
          request: request,
          rating_process: rating_process.id,
        };

        ACTIVITY_ROLLBACK_LOGICS(args);

      })

      return reply.send({
        success: true,
        args: workflow_instance,
      });
    } catch (error) {
      reply.statusCode = 422;
      return reply.send({
        success: false,
        error: String(error),
      });
    }
  });
}

module.exports = {
  inbox_routes,
  get_args,
};
