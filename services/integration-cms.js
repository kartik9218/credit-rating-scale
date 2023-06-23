var axios = require("axios").default;

const cms_config = {
  "get_customer_api_url": "https://infomerics.com/uatcrm/all_data_date_wise.php",
  "get_customer_api_key": "APIKEY0023$$",
};

// For Customers
async function GET_CMS_DATA() {
  return new Promise((resolve, reject) => {
    const current_time = new Date();
    console.log(`Running CMS Data Integration at ${current_time}`);

    const pre_date = '2022-12-01'; 
    const post_date = '2023-01-31'; 

    var options = {
      method: 'POST',
      url: cms_config['get_customer_api_url'],
      params: {
        apikey: cms_config['get_customer_api_key'], 
        predate: pre_date, 
        postdate: post_date
      },
    };
    
    axios.request(options).then(function (response) {
      const customers  = response.data.body;
      resolve(customers);
    }).catch(function (error) {
      console.error(error);
      reject(error);
    });
  });
}

// For Mandates
async function GET_CMS_MANDATE_DATA() {
  return new Promise((resolve, reject) => {
    const current_time = new Date();
    console.log(`Running CMS Mandate Data Integration at ${current_time}`);
    resolve([]);
  });
}

(async () => {
  const customers = await GET_CMS_DATA();
  console.log("Customers", customers);
  
  const mandates = await GET_CMS_MANDATE_DATA();
  console.log("Mandates", mandates);
})();

module.exports = {
  GET_CMS_DATA,
  GET_CMS_MANDATE_DATA,
};