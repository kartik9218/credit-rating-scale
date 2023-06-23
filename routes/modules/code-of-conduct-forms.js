const { v4: uuidv4, validate } = require("uuid");
const moment = require("moment");
const { error_logger } = require("../../loki-push-agent");
const { LOG_TO_DB } = require("../../logger");
const {
  FormInvestmentData,
  FormMetadata,
  Relative,
  FormType,
  FormWitnesses,
  RelationshipType,
} = require("../../models/modules/code_of_conduct");
const { Sequelize, DATE } = require("sequelize");

const { User, UserAttribute } = require("../../models/modules/onboarding");
const { DB_CLIENT } = require("../../db");

const {
  CHECK_PERMISSIONS,
  APPEND_USER_DATA,
  UPLOAD_TO_AZURE_STORAGE,
} = require("../../helpers");
const {
  FormDataListSchema,
  FormDataCreateSchema,
} = require("../../schemas/CodeOfConduct/formData");
const Op = Sequelize.Op;

async function code_of_conduct_form_routes(fastify) {
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

    /*List Submitted forms*/
    fastify.post(
      "/code_of_conduct/submit_form",

      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CodeofConduct.List");
          let whereClause =
            Object.keys(request.body.params).length === 0 ? {} : request.body;

          const forms = await FormMetadata.findAll({
            where: whereClause,
            attributes: [
              "id",
              "uuid",
              "status",
              "last_edited",
              "signature",
              "form_date",
              "approved_at",
              "updated_at",
              "is_active",
              "created_at",
            ],
            include: [
              {
                model: FormType,
                as: "coc_form_type",
                attributes: ["uuid", "name"],
              },
              {
                model: UserAttribute,
                as: "user_data",
                attributes: [
                  "address",
                  "designation",
                  "contact_number",
                  "location",
                ],
                include: [
                  {
                    model: User,
                    as: "user",
                    attributes: ["uuid", "full_name", "employee_code"],
                  },
                ],
              },
            ],
          });

          const formType = await FormType.findAll({
            where: {
              category: "submit",
              is_active: true,
            },
            raw: true,
          });

          if (formType.length > 0) {
            const form_ids = formType.map((val) => val.form_number);

            let formMeta = [];
            try {
              formMeta = await FormMetadata.findAll({
                where: {
                  id: {
                    [Op.in]: form_ids,
                    // created_by: request.user.id,
                    // financial_year
                  },
                  created_by: request.user.id,
                },
                raw: true,
              });

              // find form TYFormTypes in form_type
              // filter forms of user on basis of created_by, financial_year,form_ids
              let merged_form_data = [];
              console.log(formMeta, "m");
              merged_form_data = formType.map((type_obj) => {
                let meta_obj = formMeta.find(
                  (meta) => meta.form_type_id == type_obj.id
                );
                console.log(meta_obj, "meta");
                if (meta_obj !== undefined) {
                  type_obj.status = meta_obj.status;
                  type_obj.last_edited = meta_obj.last_edited;
                  type_obj.form_uuid = meta_obj.uuid;
                } else {
                  type_obj.status = "To be filled";
                  type_obj.last_edited = "";
                  type_obj.form_uuid = "";
                }
                return type_obj;
              });

              reply.send({
                success: true,
                data: merged_form_data,
              });
            } catch (err) {
              console.log(err);
              reply.statusCode = 422;
              reply.send({
                success: false,
                error: String(err),
              });
            }
          }
        } catch (error) {
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );
    /*Create Form Data*/
    fastify.post(
      "/code_of_conduct/submit_form/create",
      async (request, reply) => {
        reply.statusCode = 200;

        try {
          await CHECK_PERMISSIONS(request, "CodeofConduct.Create");
          const {
            relatives_data,
            relative_investment,
            user_investment,
            witness_data,
          } = request.body.params;
          // find user
          const user = await User.findOne({
            where: { id: request.user.id, is_active: true },
          });

          // find user attributes

          const user_attributes = await UserAttribute.findOne({
            where: { user_id: request.user.id },
          });

          // find form type
          const form_type = await FormType.findOne({
            where: {
              uuid: request.body.params.form_type_uuid,
            },
            raw: true,
          });

          if (!form_type) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO FORM TYPE",
            });
            return;
          }

          const create_form_metadata = await FormMetadata.create(
            APPEND_USER_DATA(request, {
              uuid: uuidv4(),
              status: request.body.params.status,
              signature: request.body.params.signature,
              last_edited: Date.now(),
              form_date: Date.now(),
              user_name: user.full_name,
              designation: user_attributes?.designation,
              address: user_attributes?.address,
              telephone: user_attributes?.contact_number,
              branch: user_attributes?.location,
              created_at: Date.now(),
              created_by: request.user.id,
              is_active: true,
              form_type_id: form_type.id,
            })
          );
          if (form_type.id == "1") {
            // save data to witness and form_metadata table

            const updated_witness_data = await FormWitnesses.create(
              APPEND_USER_DATA(request, {
                uuid: uuidv4(),
                form_id: create_form_metadata.id,
                is_active: true,
                created_at: Date.now(),
                created_by: request.user.id,
                ...witness_data,
              })
            );
          } else if (form_type.id == "2") {
            const resolver = () => {
              // resolver returns promise
              return new Promise((resolve, reject) => {
                // that waits for all promises in map function to resolve
                Promise.all(
                  relatives_data.map(async ({ relationship_uuid, name }) => {
                    // findone returns promise, so await can be used...
                    // find relationship object for relationship uuid
                    const relation_object = await RelationshipType.findOne({
                      where: { uuid: relationship_uuid },
                    });
                    return {
                      uuid: uuidv4(),
                      form_id: create_form_metadata.id,
                      // add relationship_id in relative_data
                      relationship_id: relation_object.id,
                      name,
                      created_at: Date.now(),
                      updated_at: Date.now(),
                      created_by: request.user.id,
                      updated_by: request.user.id,
                      is_active: true,
                    };
                  })
                )
                  .then((response) => {
                    resolve(response);
                  })
                  .catch((err) => reject(err));
              });
            };
            // array of relatives
            const relative_bulk_data = [...(await resolver())];
            reply.send({
              success: true,
            });
            // creating all the relatives in one go
            await Relative.bulkCreate(relative_bulk_data);
          } else {
            // find relative id using relative uuid from relative table
            if (relative_investment.length) {
              const relative_uuids = relative_investment.map(
                (val) => val.relative_uuid
              );

              let relatives_data = [];
              try {
                relatives_data = await Relative.findAll({
                  where: {
                    uuid: {
                      [Op.in]: relative_uuids,
                    },
                  },
                });
              } catch (err) {
                console.log(err);
                reply.statusCode = 422;
                reply.send({
                  success: false,
                  error: String(err),
                });
              }
              let common_data = {
                created_at: Date.now(),
                created_by: request.user.id,
                form_id: create_form_metadata.id,
              };

              let user_relative_investment_bulk = [
                ...relative_investment,
                ...user_investment,
              ].map((val1) => {
                let obj = relatives_data.find(
                  (val2) => val2.uuid == val1.relative_uuid
                );
                if (obj) val1.relative_id = obj.id;
                val1.uuid = uuidv4();
                val1 = { ...val1, ...common_data };
                return val1;
              });

              await FormInvestmentData.bulkCreate(
                user_relative_investment_bulk
              );
            }
          }
          await LOG_TO_DB(request, {
            activity: "CREATE_INVESTMENT_DATA",
            params: {},
          });
          reply.send({
            success: true,
            data: "Data Stored Successfully",
          });
        } catch (error) {
          let error_log = {
            api: "v1/form_data/create",
            activity: "CREATE_INVESTMENT_DATA",
            params: {
              error: String(error),
            },
          };
          console.log(error);
          error_logger.info(JSON.stringify(error_log));
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: String(error),
          });
        }
      }
    );
    /*Edit Form Data*/
    fastify.post(
      "/code_of_conduct/submit_form/edit",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CodeofConduct.Edit");

          const {
            relatives_data,
            relative_investment,
            user_investment,
            witness_data,
          } = request.body.params;

          // find user
          const user = await User.findOne({
            where: { id: request.user.id, is_active: true },
          });

          // find user attributes
          const user_attributes = await UserAttribute.findOne({
            where: { user_id: request.user.id },
          });

          // find form
          const form = await FormMetadata.findOne({
            where: {
              uuid: request.body.params.form_uuid,
            },
          });

          if (!form) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO FORM",
            });
            return;
          }
          // update data in form_metadata table
          const update_form_metadata = await FormMetadata.update(
            APPEND_USER_DATA(request, {
              status: request.body.params.status,
              signature: request.body.params.signature,
              last_edited: Date.now(),

              user_name: user.full_name,
              designation: user_attributes.designation,
              address: user_attributes.address,
              telephone: user_attributes.contact_number,
              branch: user_attributes.location,

              is_active: request.body.params.is_active || true,
            }),
            {
              where: {
                uuid: form.uuid,
              },
            }
          );

          if (form.form_type_id == "1") {
            // update data in witness table
            const updated_witness_data = await FormWitnesses.update(
              APPEND_USER_DATA(request, {
                is_active: request.body.params.is_active || true,
                ...witness_data,
              }),
              {
                where: { form_id: form.id },
              }
            );
          } else if (form.form_type_id == "2") {
            (async function update_relatives_data() {
              let relationship_type_data = [];
              let relationship_type_uuids = [];
              if (relatives_data.length) {
                relationship_type_uuids = relatives_data.map(
                  (val) => val.relationship_uuid
                );
              }
              try {
                relationship_type_data = await RelationshipType.findAll({
                  where: {
                    uuid: {
                      [Op.in]: relationship_type_uuids,
                    },
                  },
                });
              } catch (err) {
                console.log(err);
                reply.statusCode = 422;
                reply.send({
                  success: false,
                  error: String(err),
                });
              }
              let common_data = {
                created_at: Date.now(),
                created_by: request.user.id,
                form_id: form.id,
              };

              let relative_bulk_data = relatives_data.map((relative) => {
                let relationship_obj = relationship_type_data.find(
                  (relation) => relation.uuid == relative.relationship_uuid
                );
                if (relationship_obj)
                  relative.relationship_id = relationship_obj.id;
                relative = { ...relative, ...common_data };
                return relative;
              });

              for (i = 0; i < relative_bulk_data.length; i++) {
                let updated_val = await Relative.update(
                  APPEND_USER_DATA(request, {
                    ...relative_bulk_data[i],
                  }),
                  {
                    where: {
                      uuid: relative_bulk_data[i].uuid,
                    },
                  }
                );
              }
            })();
          } else {
            // find relative id using relative uuid from relative table

            if (relative_investment.length) {
              const relative_uuids = relative_investment.map(
                (val) => val.relative_uuid
              );

              let relatives_data = [];
              try {
                relatives_data = await Relative.findAll({
                  where: {
                    uuid: {
                      [Op.in]: relative_uuids,
                    },
                  },
                });
              } catch (err) {
                console.log(err);
                reply.statusCode = 422;
                reply.send({
                  success: false,
                  error: String(err),
                });
              }

              let user_relative_investment_bulk = [
                ...relative_investment,
                ...user_investment,
              ].map((val1) => {
                let obj = relatives_data.find(
                  (val2) => val2.uuid == val1.relative_uuid
                );
                if (obj) val1.relative_id = obj.id;
                return val1;
              });

              for (i = 0; i < user_relative_investment_bulk.length; i++) {
                let updated_val = await FormInvestmentData.update(
                  APPEND_USER_DATA(request, {
                    ...user_relative_investment_bulk[i],
                  }),
                  {
                    where: {
                      uuid: user_relative_investment_bulk[i].uuid,
                    },
                  }
                );
              }
            }
          }

          reply.send({
            success: true,
          });

          reply.send({ success: true });
        } catch (error) {
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );
    /*View Form Data*/
    fastify.post(
      "/code_of_conduct/submit_form/view",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CodeofConduct.View");
          const form_uuid = request.body.params.form_uuid;
          // find form

          const form = await FormMetadata.findOne({
            where: {
              uuid: form_uuid,
            },
          });

          if (!form) {
            reply.send({
              success: true,
              message: "form not found",
              form_data: "",
            });
            return;
          }

          if (form.form_type_id == "1") {
            // find form data
            const form_data = await FormWitnesses.findOne({
              where: {
                form_id: form.id,
              },
              include: [
                {
                  model: FormMetadata,
                  as: "coc_form_id",
                  attributes: {
                    exclude: ["id"],
                  },
                },
              ],
            });
            reply.send({
              success: true,
              message: "form found",
              witness_data: form_data,
            });
            return;
          } else if (form.form_type_id == "2") {
            // find form data
            const form_data = await Relative.findAll({
              where: {
                form_id: form.id,
              },
              attributes: ["name", "uuid"],
              include: [
                {
                  model: RelationshipType,
                  as: "coc_relationship",
                  attributes: ["name"],
                },
              ],
            });
            reply.send({
              success: true,
              message: "form found",
              relative_data: form_data,
            });
          } else {
            const form_data = await FormInvestmentData.findAll({
              where: {
                form_id: form.id,
              },
              attributes: { exclude: ["id"] },
              include: [
                {
                  model: Relative,
                  as: "coc_relative",
                  attributes: { exclude: ["id"] },
                  include: [
                    {
                      model: RelationshipType,
                      as: "coc_relationship",
                      attributes: { exclude: ["id"] },
                    },
                  ],
                },
              ],
            });
            reply.send({
              success: true,
              message: "form found",
              form_data: form_data,
            });
          }

          reply.send({
            success: true,
          });

          reply.send({ success: true });
        } catch (error) {
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );
    /*View History*/
    fastify.post(
      "/code_of_conduct/view_history",
      // { schema: FormDataListSchema },
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CodeofConduct.List");
          let whereClause =
            Object.keys(request.body.params).length === 0 ? {} : request.body;

          const forms = await FormMetadata.findAll({
            where: whereClause,
            attributes: [
              "id",
              "uuid",
              "status",
              "last_edited",
              "signature",
              "form_date",
              "approved_at",
              "updated_at",
              "is_active",
              "created_at",
            ],
            include: [
              {
                model: FormType,
                as: "coc_form_type",
                attributes: ["uuid", "name"],
              },
              {
                model: UserAttribute,
                as: "user_data",
                attributes: [
                  "address",
                  "designation",
                  "contact_number",
                  "location",
                ],
                include: [
                  {
                    model: User,
                    as: "user",
                    attributes: ["uuid", "full_name", "employee_code"],
                  },
                ],
              },
            ],
          });

          reply.send({
            success: true,
            forms_data: forms,
          });
        } catch (error) {
          reply.statusCode = 422;
          reply.send({
            success: false,
            error: error["errors"] ?? String(error),
          });
        }
      }
    );
    /*Upload Signature*/
    fastify.post(
      "/code_of_conduct/assign_documents",
      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "CodeOfConductDocument.Edit");

          const formMeta_data = await FormMetadata.findOne({
            where: {
              uuid: request.body["form_uuid"].value,
              is_active: true,
            },
          });

          if (!formMeta_data) {
            reply.status_code = 403;
            reply.send({
              success: false,
              error: "NO COC FORM DATA FOUND",
            });
            return;
          }

          const document_buffer = await request.body["document"].toBuffer();
          const document_path = await UPLOAD_TO_AZURE_STORAGE(document_buffer, {
            path: request.body.document.filename,
          });

          const coc_form_document = await formMeta_data.update({
            uuid: request.body.uuid,
            signature: document_path,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: request.user.id,
          });

          await LOG_TO_DB(request, {
            activity: "ASSIGN_COC_FORM_DOCUMENT",
            params: {
              data: request.query,
            },
          });

          reply.send({
            success: true,
            coc_form_document: coc_form_document,
          });
        } catch (error) {
          let error_log = {
            api: "v1/code_of_conduct/assign_documents",
            activity: "ASSIGN_COC_FORM_DOCUMENT",
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

    /*Code of conduct RELATIVE APIs*/

    fastify.post("/submit_form/relative/create", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "COCRelative.Create");
        const { params } = request.body;

        const relative_bulk_data = params.map((param) => {
          param.uuid = uuidv4();
          param.created_at = Date.now();
          param.updated_at = Date.now();
          param.created_by = request.user.id;
          param.updated_by = request.user.id;
          param.is_active = true;
          return param;
        });

        const relative_data = Relative.bulkCreate(relative_bulk_data);

        await LOG_TO_DB(request, {
          activity: "CREATE_INVESTMENT_DATA",
          params: {
            data: params,
          },
        });
        reply.send({
          success: true,
          relative_data: relative_data,
        });
      } catch (error) {
        let error_log = {
          api: "v1/submit_form/relative/create",
          activity: "CREATE_RELATIVE_DATA",
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

    fastify.post(
      "/submit_form/relative",

      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "COCRelatives.List");
          const { params } = request.body;

          // let whereClause = Object.keys(params).length === 0 ? {} : params;
          const relatives = await Relative.findAll({
            where: {
              created_by: request.user.id,
            },
          });

          await LOG_TO_DB(request, {
            activity: "REALTIVE",
            params: {
              data: params,
            },
          });

          reply.send({
            success: true,
            relatives: relatives,
          });
        } catch (error) {
          let error_log = {
            api: "v1/submit_form/relative",
            activity: "RELATIVE",
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
      "/submit_form/relative/view",

      async (request, reply) => {
        try {
          await CHECK_PERMISSIONS(request, "COCRelative.View");

          const relative = await Relative.findOne({
            where: {
              uuid: request.body.params.uuid,
            },
          });

          await LOG_TO_DB(request, {
            activity: "RELATIVE",
            params: {
              data: request.body.params,
            },
          });

          reply.send({
            success: true,
            relative: relative,
          });
        } catch (error) {
          let error_log = {
            api: "v1/submit_form/relative/view",
            activity: "FORM_TYPE",
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

    fastify.post("/submit_form/relative/edit", async (request, reply) => {
      try {
        await CHECK_PERMISSIONS(request, "COCRelative.Edit");
        const { params } = request.body;

        const relative = await Relative.update(
          APPEND_USER_DATA(request, {
            name: params["name"],
            relationship: params["relationship"],
            is_active: params["is_active"],
          }),
          {
            where: {
              uuid: params["uuid"],
            },
          }
        );
        await LOG_TO_DB(request, {
          activity: "RELATIVE",
          params: {
            data: params,
          },
        });

        reply.send({
          success: true,
          relative_update_done: Boolean(relative[0] === 1),
        });
      } catch (error) {
        let error_log = {
          api: "v1/submit_form/relative/edit",
          activity: "EDIT_FORM_TYPE",
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
    done();
  });
}

module.exports = {
  code_of_conduct_form_routes,
};
