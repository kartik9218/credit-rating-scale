const { QueryTypes } = require("sequelize");
const { DB_CLIENT } = require("../db");
const { RatingCommitteeMeeting } = require("../models/modules/rating-committee");

// GET_RATING_SHEET_DATA
async function GET_MOM_SHEET_DATA(query) {
  return new Promise(async (resolve, reject) => {
    
    const rating_committee_meeting = await RatingCommitteeMeeting.findOne({
        where:  query,
        raw: true
      })

      if (!rating_committee_meeting) {
        reject({
          success: false,
          error: "NO_RATING_COMMITTEE_MEETING_FOUND",
        });
      }

      const meeting_details = {}

      const rating_sheet_data = await DB_CLIENT.query(`
      SELECT DISTINCT c.name AS entity_name, c.cin AS company_cin, ic.category_name AS instrument, m.total_size AS size_in_crore, rp.name AS nature_of_assignment, rcmr.short_term_rating_recommendation AS existing_rating, rcmr.long_term_rating_recommendation AS proposed_rating,
      rcvm.rating AS current_assigned_rating, rcm.id AS rating_committee_meeting_id, rcm.meeting_at AS meeting_at, u.full_name AS rating_analyst, u1.full_name AS rating_committee_members_present, u2.full_name AS ra_persons_attended_rcm, u3.full_name AS gh_persons_attended_rcm, u4.full_name AS rh_persons_attended_rcm, r.name AS persons_roles_ra, r1.name AS persons_roles_gh, r2.name AS persons_roles_rh, u5.full_name AS chairman FROM rating_committee_meeting_registers rcmr 
      LEFT JOIN companies c ON c.id = rcmr.company_id
      LEFT JOIN mandates m ON m.id = rcmr.mandate_id
      LEFT JOIN instrument_categories ic ON ic.id = rcmr.instrument_category_id
      LEFT JOIN instrument_details id ON id.id = rcmr.instrument_detail_id
      LEFT JOIN rating_processes rp ON rp.id = id.rating_process_id
      LEFT JOIN meeting_has_members mhm ON mhm.rating_committee_meeting_id = rcmr.rating_committee_meeting_id
      LEFT JOIN users u ON u.id = m.ra_id
      LEFT JOIN users u1 ON u1.id = mhm.member_id
      LEFT JOIN rating_committee_meetings rcm ON rcm.id = :rating_committee_meeting_id
      LEFT JOIN users u2 ON u2.id = m.ra_id
      LEFT JOIN users u3 ON u3.id = m.gh_id
      LEFT JOIN users u4 ON u4.id = m.rh_id
      LEFT JOIN user_has_roles uhr ON uhr.user_id = u2.id
      LEFT JOIN user_has_roles uhr1 ON uhr1.user_id = u3.id
      LEFT JOIN user_has_roles uhr2 ON uhr2.user_id = u4.id
      LEFT JOIN roles r ON r.id = uhr.role_id
      LEFT JOIN roles r1 ON r1.id = uhr1.role_id
      LEFT JOIN roles r2 ON r2.id = uhr2.role_id
      LEFT JOIN meeting_has_members mhm1 ON mhm1.rating_committee_meeting_id = rcmr.rating_committee_meeting_id 
      LEFT JOIN users u5 ON u5.id = mhm1.member_id
      LEFT JOIN rating_committee_voting_metadata rcvm ON rcvm.id = :rating_committee_meeting_id
      WHERE rcmr.rating_committee_meeting_id = :rating_committee_meeting_id AND mhm1.is_chairman = 1
      `, {
        replacements: {
          rating_committee_meeting_id: rating_committee_meeting.id,
        },
        type: QueryTypes.SELECT,
      });

      const minutes = await DB_CLIENT.query(`
      SELECT cm.discussion_paragraph AS rating_analyst_points, cm.comments_paragraph AS post_presentation_committee_discussed_issue FROM committee_minutes cm
      WHERE cm.rating_committee_meeting_id = :rating_committee_meeting_id
      `, {
      replacements: {
        rating_committee_meeting_id: rating_committee_meeting.id
      },
      type: QueryTypes.SELECT
      })

      const penultimate_meeting_details = await DB_CLIENT.query(`
    SELECT rcm.id AS rating_committee_meeting_id, rcm.meeting_at AS meeting_at FROM rating_committee_meetings rcm
    WHERE (rcm.id < :rating_committee_meeting_id AND rcm.rating_committee_type_id <= :rating_committee_type_id AND rcm.rating_committee_meeting_category_id <= :rating_committee_meeting_category_id) ORDER BY rcm.id DESC
    `, {
      replacements: {
        rating_committee_meeting_id: rating_committee_meeting.id,
        rating_committee_type_id: rating_committee_meeting.rating_committee_type_id,
        rating_committee_meeting_category_id: rating_committee_meeting.rating_committee_meeting_category_id,
      },
      type: QueryTypes.SELECT
    })

    meeting_details.penultimate_meeting_details = penultimate_meeting_details

      var docs_data = [];
      var companies_props = [];

      rating_sheet_data.forEach(row => {
      const company_prop = row['company_cin'];
      if (companies_props.includes(company_prop)) {
        docs_data.forEach(company => {
        
          if (company['company_cin'] === company_prop) {
           docs_data.push({agenda_table_data_1: [
            {instruments: company['instruments'].push({
              instrument: row['instrument'],
              rating_committee_meeting_id: row['rating_committee_meeting_id'],
              meeting_at: row['meeting_at'],
              chairman: row['chairman']
            }),
            size: company['size'].push(row['size_in_crore']),
            rating_process: company['rating_process'].push(row['nature_of_assignment']),
            existing_rating: company['existing_rating'].push(row['existing_rating']),
            proposed_rating: company['proposed_rating'].push(row['proposed_rating']),
            current_rating_assigned: company['current_rating_assigned'].push(row['current_rating_assigned']),
            rating_analyst: company['rating_analyst'].push(row['rating_analyst']),
            rating_committee_members_present: company['rating_committee_members_present'].push({
              name: row['rating_committee_members_present'],
            }),
            persons_attended_rcm: company['persons_attended_rcm'].push({
              name: row['ra_persons_attended_rcm'],
              position: row['persons_roles_ra']
            }, {
              name: row['gh_persons_attended_rcm'],
              position: row['persons_roles_gh']
            }, {
              name: row['rh_persons_attended_rcm'],
              position: row['persons_roles_r']
            })}
          ]})
          }
        });
      }

      else {
        companies_props.push(company_prop);
        docs_data.push({
          entity_name: row['entity_name'],
          agenda_table_data_1: [
          {instruments: [{
            entity_name: row['entity_name'],
            instrument: row['instrument'],
            rating_committee_meeting_id: row['rating_committee_meeting_id'],
            meeting_at: row['meeting_at'],
          }],
            size: [row['size_in_crore']],
            rating_process: [row['nature_of_assignment']],
            existing_rating: [row['existing_rating']],
            proposed_rating: [row['proposed_rating']],
            current_rating_assigned: [row['current_rating_assigned']],
            rating_analyst: [row['rating_analyst']],
            rating_committee_members_present: [{
              name: row['rating_committee_members_present'],
            }],
            persons_attended_rcm: [{
              name: row['ra_persons_attended_rcm'],
              position: row['persons_roles_ra']
            }, {
              name: row['gh_persons_attended_rcm'],
              position: row['persons_roles_gh']
            }, {
              name: row['rh_persons_attended_rcm'],
              position: row['persons_roles_r']
            }],
            chairman: row['chairman']}
          ]
        });
      }
    });

    docs_data.push(minutes)

    meeting_details.docs_data = docs_data
    
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
    GET_MOM_SHEET_DATA,
}