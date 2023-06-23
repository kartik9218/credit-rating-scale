
const cron = require('node-cron');

const hrms_integration = cron.schedule('1,2,4,5 * * * *', function() {
    console.log('---------------------');
    console.log('Running Cron Job');
  });

  module.exports = 
  {
    hrms_integration
  }