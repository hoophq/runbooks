const apiKey = process.env.API_KEY;
const apiUrl = process.env.API_URL;

const redact_types = [
  "PHONE_NUMBER", "CREDIT_CARD_NUMBER", "AUTH_TOKEN", "AWS_CREDENTIALS",
  "AZURE_AUTH_TOKEN", "BASIC_AUTH_HEADER", "ENCRYPTION_KEY", "GCP_API_KEY",
  "GCP_CREDENTIALS", "JSON_WEB_TOKEN", "HTTP_COOKIE", "OAUTH_CLIENT_SECRET",
  "PASSWORD", "SSL_CERTIFICATE", "STORAGE_SIGNED_POLICY_DOCUMENT", "STORAGE_SIGNED_URL",
  "WEAK_PASSWORD_HASH", "XSRF_TOKEN", "CREDIT_CARD_TRACK_NUMBER", "EMAIL_ADDRESS",
  "IBAN_CODE", "HTTP_COOKIE", "IMEI_HARDWARE_ID", "IP_ADDRESS", "STORAGE_SIGNED_URL",
  "URL", "VEHICLE_IDENTIFICATION_NUMBER", "BRAZIL_CPF_NUMBER",
  "AMERICAN_BANKERS_CUSIP_ID", "FDA_CODE", "US_PASSPORT", "US_SOCIAL_SECURITY_NUMBER"
]

const connectionTypesDictionary = {
  "mysql": {
    "type": "database",
    "subtype": "mysql"
  },
  "postgres": {
    "type": "database",
    "subtype": "postgres"
  },
  "mssql": {
    "type": "database",
    "subtype": "mssql"
  },
  "oracledb": {
    "type": "database",
    "subtype": "oracledb"
  },
  "mongodb": {
    "type": "database",
    "subtype": "mongodb"
  },
  "custom": {
    "type": "custom",
    "subtype": "custom"
  },
}

function parseSecrets(secrets) {
  return Object.entries(secrets).reduce((acc, [key, value]) => {
    const envvarKey = `envvar:${key.toUpperCase()}`;
    acc[envvarKey] = Buffer.from(value).toString('base64');
    return acc;
  }, {});
}

// Function create connection
async function createConnection(connection) {
  console.log("CREATE CONNECTION\n");

  console.log("Parsing connection...");
  const secretsParsed = parseSecrets(connection.secrets)

  const payload = {
    name: connection.name,
    type: connectionTypesDictionary[connection.type].type,
    subtype: connectionTypesDictionary[connection.type].subtype,
    secret: secretsParsed,
    agent_id: connection.agentId,
    redact_enabled: connection.datamasking,
    redact_types: connection.datamasking ? redact_types : [],
    reviewers: connection.reviewGroups || [],
    access_mode_runbooks: connection.accessMode.runbook ? "enabled" : "disabled",
    access_mode_exec: connection.accessMode.native ? "enabled" : "disabled",
    access_mode_connect: connection.accessMode.web ? "enabled" : "disabled",
    access_schema: connection.schema ? "enabled" : "disabled"
  };
  console.log("Connection parsed: ", payload, "\n");

  console.log("Requesting connection creation...");
  const response = await fetch(`${apiUrl}/connections`, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  console.log('Connection created successfully:', result, "\n");
  console.log("--------------------------------\n");
  return result;
}

// Function to get plugins
async function getPlugins() {
  console.log("Requesting plugins...");
  const response = await fetch(`${apiUrl}/plugins`, {
    method: 'GET',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });

  console.log("Plugins fetched successfully.\n");
  return response.json();
}

// Function to update the plugins
async function updatePlugin(pluginName, connections) {
  console.log("Parsing plugin ", pluginName, "...");
  const payload = {
    name: pluginName,
    priority: 0,
    source: null,
    connections,
  };
  console.log(`Plugin ${pluginName} parsed:`, payload, "\n");

  console.log(`Requesting plugin ${pluginName} update...`);
  const response = await fetch(`${apiUrl}/plugins/${pluginName}`, {
    method: 'PUT',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  console.log(`Plugin ${pluginName} updated successfully:`, result, "\n");
}

// Function to process and associate the plugins to the original payload
async function processUpdatePlugins(payload) {
  console.log('PROCESSING UPDATE PLUGINS\n');
  const plugins = await getPlugins();

  // Associate the plugins based on accessControl and runbook_config
  const accessControlPlugin = plugins.find(plugin => plugin.name === "access_control");
  console.log("Access Control Plugin: ", accessControlPlugin, "\n");

  const runbooksPlugin = plugins.find(plugin => plugin.name === "runbooks");
  console.log("Runbooks Plugin: ", runbooksPlugin, "\n");

  console.log("--------------------------------\n");
  // Update the Access Control plugin if accessControl exists in the payload
  if (payload.accessControl && accessControlPlugin) {
    console.log("UPDATE PLUGIN ACCESS CONTROL\n");

    console.log("Parsing connections of Access Control plugin...");
    const accessControlConnections = [
      ...accessControlPlugin.connections,
      {
        id: payload.connectionId,
        name: payload.connectionName,
        config: [...payload.accessControl]
      }
    ];
    console.log("Connections of Access Control parsed: ", accessControlConnections, "\n");

    await updatePlugin('access_control', accessControlConnections);
    console.log("--------------------------------\n");
  }

  // Update the Runbooks plugin if runbook_config exists in the payload
  if (payload.runbook_config && runbooksPlugin) {
    console.log("UPDATE PLUGIN RUNBOOKS\n");
    console.log("Parsing connections of Runbooks plugin...\n");
    const runbookConnections = [
      ...runbooksPlugin.connections,
      {
        id: payload.connectionId,
        name: payload.connectionName,
        config: [payload.runbook_config]
      }
    ];
    console.log("Connections of Runbooks parsed: ", runbookConnections, "\n");

    await updatePlugin('runbooks', runbookConnections);
    console.log("--------------------------------\n");
  }
}

// Function to delete a connection
async function deleteConnection(connectionIds) {
  console.log("DELETE CONNECTIONS\n");

  console.log("Requesting connections deletion...");
  const promises = connectionIds.map(id =>
    fetch(`${apiUrl}/connections/${id}`, {
      method: 'DELETE',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      }
    })
  );

  const results = await Promise.all(promises);
  results.forEach((response, index) => {
    if (response.ok) {
      console.log(`Connection ${connectionIds[index]} deleted.\n`);
    } else {
      console.log(`Connection ${connectionIds[index]} failed on delete, status: ${response.status}\n`);
    }
  });

  console.log("Finished deleting connections.\n");
  console.log("--------------------------------\n");
}

// Function to handle the incoming payload
async function handleActions(payload) {
  console.log("START HANDLING ACTIONS\n");
  console.log("--------------------------------\n");

  for (const item of payload) {
    if (item.action === 'create') {
      const createdConnection = await createConnection(item);

      if (item.accessControl || item.runbook_config) {
        await processUpdatePlugins({ ...item, connectionName: createdConnection.name, connectionId: createdConnection.id });
      }
    }

    if (item.action === 'delete') {
      await deleteConnection(item.connections);
    }
  }

  console.log("ACTIONS HANDLED SUCCESFULLY.\n");
}

// Example of incoming payload

// const incomingPayload = {
//   "payload": [
//     {
//       "action": "create",
//       "name": "PIX-USER",
//       "type": "mysql",
//       "secrets": {
//         "host": "_vault:kv/techcross/hom:PICPAY_DBRE_USER_AWS...:DBHOST",
//         "port": "_vault:SECRETNAME:SECRETKEY:DBPORT",
//         "user": "_vault:SECRETNAME:SECRETKEY:DBUSER",
//         "password": "_vault:SECRETNAME:SECRETKEY:DBPASSWORD",
//         "db": "_vault:SECRETNAME:SECRETKEY:DBNAME",
//         "sslmode": "_vault:SECRETNAME:SECRETKEY:SSL",
//       },
//       "agentId": "75122bce-f957-49eb-a812-2ab60977cd9f",
//       "accessMode": {
//         "runbook": true,
//         "web": false,
//         "native": false
//       },
//       "runbook_config": "/account-statment-prd/",
//       "datamasking": true,
//       "enableReview": true,
//       "reviewGroups": ["group1", "group2"],
//       "schema": true,
//       "accessControl": ["USER"]
//     },
//     {
//       "action": "delete",
//       "connections": ["conn-1", "conn-2", "conn-3"]
//     }
//   ]
// };

const incomingPayload = {{ .payload
      | required "payload is required"
      | type "textarea"}}

// Process the incoming payload
handleActions(incomingPayload.payload);
