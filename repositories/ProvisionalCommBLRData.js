const { QueryTypes } = require("sequelize");
const { DB_CLIENT } = require("../db");
const { RatingCommitteeMeeting } = require("../models/modules/rating-committee");
const { Company } = require("../models/modules/onboarding");

// GET_PROV_COMM_BLR_DATA
async function GET_PROV_COMM_BLR_DATA(query) {
  return new Promise(async (resolve, reject) => {
    
    const rating_committee_meeting = await RatingCommitteeMeeting.findOne({
        where:  query.rating_committee_meeting_params,
        raw: true
      })

      if (!rating_committee_meeting) {
        reject({
          success: false,
          error: "NO_RATING_COMMITTEE_MEETING_FOUND",
        });
      }

      const company = await Company.findOne({
        where: query.company_params,
        raw: true
      })

      if (!company) {
        reject({
            success: false,
            error: "NO_COMPANY_FOUND"
        })
      }

      const meeting_details = {}

      const prov_comm_blr_ratings = await DB_CLIENT.query(`
      SELECT rcmr.category_text, rcmr.instrument_size_number, rcmr.is_long_term, rcmr.is_short_term, c.name AS company_name, cd.name AS company_contact, ca.address_1, id.rating_letter_date, cd.designation AS designation, rcmr.long_term_rating_assgined_text AS rating, rcmr.rating_action, ti.complexity_level,
      rcmr.rating_committee_meeting_id
      FROM rating_committee_meeting_registers rcmr 
      LEFT JOIN companies c ON c.id = rcmr.company_id 
      LEFT JOIN contact_details cd ON cd.company_id = c.id
      LEFT JOIN company_addresses ca ON ca.company_id = c.id
      LEFT JOIN instrument_details id ON id.id = rcmr.instrument_detail_id
      LEFT JOIN transaction_instruments ti ON ti.id = rcmr.transaction_instrument_id
      WHERE rcmr.rating_committee_meeting_id = :rating_committee_meeting_id AND c.id = :company_id AND cd.is_primary_contact = 1 AND cd.is_active = 1 AND ca.is_active = 1
      `, {
        replacements: {
          rating_committee_meeting_id: rating_committee_meeting.id,
          company_id: company.id
        },
        type: QueryTypes.SELECT,
      });

      console.log("press_release_ratings========>", prov_comm_blr_ratings);

      meeting_details.prov_comm_blr_ratings = prov_comm_blr_ratings
    
      if (meeting_details) resolve(meeting_details)

    else {
      reject({
        success: false,
        error: "RATING_SHEET_DATA_NOT_FOUND",
      });
    }
  });
}

module.exports = {
    GET_PROV_COMM_BLR_DATA,
}