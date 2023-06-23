const { base_routes } = require("./base");
const { auth_routes } = require("./auth");
const { api_routes } = require("./api");

const {
  rating_model_routes,
  rating_committee_routes,
  due_diligence_json,
  interaction_routes,
  workflows_routes,
  mis_reports_routes,
} = require("./modules/index");

const {
  masters_common_routes,
  categories_routes,
  cities_routes,
  countries_routes,
  departments_routes,
  industries_routes,
  macro_economic_indicator_routes,
  states_routes,
  sub_categories_routes,
  sub_industries_routes,
  sectors_routes,
  branch_office_routes,
  instrument_routes,
  code_of_conduct_routes,
  relative_routes,
} = require("./modules/masters");
const { sync_routes } = require("./sync");

module.exports = {
  base_routes,
  auth_routes,
  api_routes,
  masters_common_routes,
  categories_routes,
  cities_routes,
  countries_routes,
  departments_routes,
  industries_routes,
  macro_economic_indicator_routes,
  states_routes,
  sub_categories_routes,
  sub_industries_routes,
  sectors_routes,
  sync_routes,
  rating_model_routes,
  rating_committee_routes,
  branch_office_routes,
  instrument_routes,
  due_diligence_json,
  workflows_routes,
  interaction_routes,
  mis_reports_routes,
  code_of_conduct_routes,
  relative_routes,
};
