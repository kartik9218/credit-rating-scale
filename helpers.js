const fs = require("fs");
const jwt = require('jsonwebtoken');
const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");

// ENCODE_JWT_DATA
function ENCODE_JWT_DATA(params) {
  return new Promise(async (resolve) => {
    let encodedObject = jwt.sign(params, process.env['JWT_SECRET_KEY'], { expiresIn: '24h' });
    resolve(encodedObject);
  });
}

// FS_TO_JSON
async function FS_TO_JSON(path) {
  return new Promise(async (resolve) => {
    const file = fs.readFileSync(path);
    const response = JSON.parse(file);
    resolve(response);
  });
}

// APPEND_USER_DATA
function APPEND_USER_DATA(request, params) {
  params['updated_at'] = new Date();
  params['updated_by'] = request.user.id;
  return params;
}

// GET_PAGINATION_PARAMS
function GET_PAGINATION_PARAMS(body) {
  return {
    "limit":  (body && body["limit"]) ?? 100,
    "offset": (body && body["offset"]) ?? 0,
  };
}

// SET_PAGINATION_PARAMS
function SET_PAGINATION_PARAMS(request, params) {
  let page_params = GET_PAGINATION_PARAMS(request.body);
  params['limit'] = page_params['limit']; 
  params['offset'] = page_params['offset']; 
  return params;
}

// SET_PAGINATION_PAGE_CONF
function SET_PAGINATION_PAGE_CONF(request, params) {
  let page_params = GET_PAGINATION_PARAMS(request.body);
  return {
    'total': params['total'],
    'page_count': Number.parseInt(params['total'] / page_params['limit'], 10) + 1,
  };
}

// CHECK_PERMISSIONS
async function CHECK_PERMISSIONS(request, permission_key) {
  console.log("CHECK_PERMISSIONS ", permission_key);
  return new Promise(async (resolve, reject) => {
    if ((process.env['CHECK_PERMISSIONS'] === 'true')) {

      if (request.user_permissions.includes(permission_key)) {
        resolve(true);
      } else {
        resolve(true);
        // reject({
        //   'error': 'NO_PERMISSION'
        // });
      }
    }
    
    else {
      resolve(true)
    }
  });
}

// UPLOAD_DOCUMENT
async function UPLOAD_DOCUMENT(parts, uuid_param) {
  const account = process.env['AZURE_STORAGE_ACCOUNT'];
  const sharedKeyCredential = new StorageSharedKeyCredential(process.env['AZURE_STORAGE_ACCOUNT'], process.env['AZURE_STORAGE_ACCESS_KEY']);
  const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    sharedKeyCredential
  );
  const containerClient = blobServiceClient.getContainerClient(process.env['CONTAINER_NAME']);
  const fields = [];
  console.log("helper called");
  for await (const part of parts) {
    console.log("fieldname : ", part['fieldname']);
    if (part.file) {
      try {
        fields.push(part.fieldname);
        const blobName = `${uuid_param}_${part.fieldname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const res = await blockBlobClient.uploadStream(part.file, 509800);
      } catch (error) {
        return false;
      }
    }
    else{
      return false;
    }
  }
  return fields;
}

// CREATE_WORKFLOW_INSTANCE
async function CREATE_WORKFLOW_INSTANCE(params) {
  // params = company_id | mandate_id 
  // return `workflow_instance_id`
}

// TRIGGER_ACTIVITY
async function TRIGGER_ACTIVITY(params) {
  // params = workflow_instance_id | primary_activity_id | assigned_by_user_id | performed_by_user_id
  // Activate `next_activity` unless current is not last_activity
  // ACTIVITY_LOGICS[code].run()
}

// CONVERT_TO_ARRAY
function CONVERT_TO_ARRAY(input) {
  return (input[0] !== undefined) ? input : [input];
}

// UPLOAD_TO_AZURE_STORAGE
async function UPLOAD_TO_AZURE_STORAGE(buffer, params) {
  const account = process.env['AZURE_STORAGE_ACCOUNT'];
  const credential = new StorageSharedKeyCredential(
    process.env['AZURE_STORAGE_ACCOUNT'], 
    process.env['AZURE_STORAGE_ACCESS_KEY']
  );
  const client = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    credential
  );
  const container_client = client.getContainerClient(process.env['CONTAINER_NAME']);
  const block_blob_client = container_client.getBlockBlobClient(params['path']);

  const response = await block_blob_client.uploadData(buffer);
  
  if (response._response.status !== 201) {
    throw new Error(
      `Error uploading document ${block_blob_client.name} to container ${block_blob_client.containerName}`
    );
  }
  
  return response._response.request.url;
}

module.exports = {
  ENCODE_JWT_DATA,
  FS_TO_JSON,
  APPEND_USER_DATA,
  CHECK_PERMISSIONS,
  GET_PAGINATION_PARAMS,
  SET_PAGINATION_PARAMS,
  SET_PAGINATION_PAGE_CONF,
  UPLOAD_DOCUMENT,
  CONVERT_TO_ARRAY,
  UPLOAD_TO_AZURE_STORAGE,
};