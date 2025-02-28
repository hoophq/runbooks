const apiKey = process.env.API_KEY;
const apiUrl = process.env.API_URL;

const redact_types = [
  'PHONE_NUMBER',
  'CREDIT_CARD_NUMBER',
  'AUTH_TOKEN',
  'AWS_CREDENTIALS',
  'AZURE_AUTH_TOKEN',
  'BASIC_AUTH_HEADER',
  'ENCRYPTION_KEY',
  'GCP_API_KEY',
  'GCP_CREDENTIALS',
  'JSON_WEB_TOKEN',
  'HTTP_COOKIE',
  'OAUTH_CLIENT_SECRET',
  'PASSWORD',
  'SSL_CERTIFICATE',
  'STORAGE_SIGNED_POLICY_DOCUMENT',
  'STORAGE_SIGNED_URL',
  'WEAK_PASSWORD_HASH',
  'XSRF_TOKEN',
  'CREDIT_CARD_TRACK_NUMBER',
  'EMAIL_ADDRESS',
  'IBAN_CODE',
  'HTTP_COOKIE',
  'IMEI_HARDWARE_ID',
  'IP_ADDRESS',
  'STORAGE_SIGNED_URL',
  'URL',
  'VEHICLE_IDENTIFICATION_NUMBER',
  'BRAZIL_CPF_NUMBER',
  'AMERICAN_BANKERS_CUSIP_ID',
  'FDA_CODE',
  'US_PASSPORT',
  'US_SOCIAL_SECURITY_NUMBER'
];

const connectionTypesDictionary = {
  mysql: {
    type: 'database',
    subtype: 'mysql'
  },
  postgres: {
    type: 'database',
    subtype: 'postgres'
  },
  mssql: {
    type: 'database',
    subtype: 'mssql'
  },
  oracledb: {
    type: 'database',
    subtype: 'oracledb'
  },
  mongodb: {
    type: 'database',
    subtype: 'mongodb'
  },
  custom: {
    type: 'custom',
    subtype: 'custom'
  }
};

function parseSecrets(secrets) {
  return Object.entries(secrets).reduce((acc, [key, value]) => {
    const envvarKey = `envvar:${key.toUpperCase()}`;
    acc[envvarKey] = Buffer.from(value).toString('base64');
    return acc;
  }, {});
}

// Function to get a connection by name
async function getConnectionByName(connectionName) {
  console.log(`Checking if connection "${connectionName}" exists...`);

  const response = await fetch(`${apiUrl}/connections/${connectionName}`, {
    method: 'GET',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (response.status === 200) {
    console.log(`Connection "${connectionName}" found.`);
    return response.json();
  } else if (response.status === 404) {
    console.log(`Connection "${connectionName}" does not exist.`);
    return null;
  } else {
    throw new Error(`Error fetching connection by name: ${response.status}`);
  }
}

// Function to create a Jira template
async function createJiraTemplate(template) {
  console.log('CREATE JIRA TEMPlATE\n');

  const response = await fetch(`${apiUrl}/integrations/jira/issuetemplates`, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(template)
  });

  if (response.status === 200) {
    const result = await response.json();
    console.log('Jira template created successfully:', result, '\n');
    console.log('--------------------------------\n');
    return result;
  } else {
    throw new Error(`Error creating Jira template: ${response.status}`);
  }
}

// Function to create a guardrail
async function createGuardrail(guardrail) {
  console.log('creating guardrails...\n');

  const response = await fetch(`${apiUrl}/guardrails`, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(guardrail)
  });

  if (response.status === 200) {
    const result = await response.json();
    console.log('Guardrail created successfully:', result, '\n');
    console.log('--------------------------------\n');
    return result;
  } else {
    throw new Error(`Error creating guardrail: ${response.status}`);
  }
}

// Function to process guardrails
async function processGuardrails(guardrails) {
  console.log('PROCESSING GUARDRAILS\n');

  const guardrailIds = [];

  for (const guardrail of guardrails) {
    if (typeof guardrail === 'string') {
      // If it's a string, we assume it's an existing ID
      console.log(`Using existing guardrail ID: ${guardrail}\n`);
      guardrailIds.push(guardrail);
    } else {
      // If it's an object, we create a new guardrail
      console.log('Creating new guardrail from configuration...\n');
      const created = await createGuardrail(guardrail);
      guardrailIds.push(created.id);
    }
  }

  console.log('Guardrails processing completed.\n');
  console.log('--------------------------------\n');
  return guardrailIds;
}

// Function to create or update a connection
async function createOrUpdateConnection(connection) {
  console.log('CREATE OR UPDATE CONNECTION\n');

  // Determine the Jira template ID
  let jiraTemplateId = null;
  if (connection.jiraTemplate) {
    // If a complete template is provided, create a new one
    console.log('Processing new Jira template...\n');
    const createdTemplate = await createJiraTemplate(connection.jiraTemplate);
    jiraTemplateId = createdTemplate.id;
    console.log(`Jira template created with ID: ${jiraTemplateId}\n`);
  } else if (connection.jiraTemplateId) {
    // If only the ID is provided, use it directly
    console.log(`Using existing Jira template ID: ${connection.jiraTemplateId}\n`);
    jiraTemplateId = connection.jiraTemplateId;
  }

  // Process guardrails if they exist
  let guardrailIds = [];
  if (connection.guardrails && connection.guardrails.length > 0) {
    guardrailIds = await processGuardrails(connection.guardrails);
  }

  // Check if the connection already exists
  const existingConnection = await getConnectionByName(connection.name);

  if (existingConnection) {
    console.log('Updating connection...\n');
    console.log(`Merging new information with existing connection "${connection.name}"...`);

    const secretsParsed = parseSecrets(connection.secrets);
    const accessModeRunbooks = connection.hasOwnProperty('accessMode')
      ? connection.accessMode.runbook
      : existingConnection.access_mode_runbooks;
    const accessModeExec = connection.hasOwnProperty('accessMode')
      ? connection.accessMode.web
      : existingConnection.access_mode_exec;
    const accessModeConnect = connection.hasOwnProperty('accessMode')
      ? connection.accessMode.native
      : existingConnection.access_mode_connect;
    const accessSchema = connection.hasOwnProperty('schema') ? connection.schema : existingConnection.access_schema;

    // Merge the existing connection data with the new connection data
    const updatedConnection = {
      ...existingConnection,
      agent_id: connection.agentId || existingConnection.agent_id,
      secret: { ...existingConnection.secrets, ...secretsParsed },
      access_mode_runbooks: accessModeRunbooks || accessModeRunbooks === 'enabled' ? 'enabled' : 'disabled',
      access_mode_exec: accessModeExec || accessModeExec === 'enabled' ? 'enabled' : 'disabled',
      access_mode_connect: accessModeConnect || accessModeConnect === 'enabled' ? 'enabled' : 'disabled',
      redact_enabled: connection.datamasking !== undefined ? connection.datamasking : existingConnection.redact_enabled,
      redact_types: connection.datamasking ? redact_types : existingConnection.redact_types,
      reviewers: [...new Set([...(existingConnection.reviewers || []), ...(connection.reviewGroups || [])])],
      access_schema: accessSchema || accessSchema === 'enabled' ? 'enabled' : 'disabled',
      jira_issue_template_id: jiraTemplateId || existingConnection.jira_issue_template_id,
      guardrail_rules: guardrailIds.length > 0 ? guardrailIds : existingConnection.guardrail_rules
    };

    // Make the update request to update the existing connection
    const response = await fetch(`${apiUrl}/connections/${connection.name}`, {
      method: 'PUT',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedConnection)
    });

    const result = await response.json();
    console.log(`Connection "${connection.name}" updated successfully:`, result, '\n');
    console.log('--------------------------------\n');
    return result;
  } else {
    // If the connection doesn't exist, create a new one
    console.log('Creating new connection...\n');
    const secretsParsed = parseSecrets(connection.secrets);

    const payload = {
      name: connection.name,
      type: connectionTypesDictionary[connection.type].type,
      subtype: connectionTypesDictionary[connection.type].subtype,
      secret: secretsParsed,
      agent_id: connection.agentId,
      redact_enabled: connection.datamasking,
      redact_types: connection.datamasking ? redact_types : [],
      reviewers: connection.reviewGroups || [],
      access_mode_runbooks: connection.accessMode.runbook ? 'enabled' : 'disabled',
      access_mode_exec: connection.accessMode.web ? 'enabled' : 'disabled',
      access_mode_connect: connection.accessMode.native ? 'enabled' : 'disabled',
      access_schema: connection.schema ? 'enabled' : 'disabled',
      jira_issue_template_id: jiraTemplateId,
      guardrail_rules: guardrailIds
    };

    console.log('Requesting connection creation...');
    const response = await fetch(`${apiUrl}/connections`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Connection created successfully:', result, '\n');
    console.log('--------------------------------\n');
    return result;
  }
}

// Function to get plugins
async function getPlugins() {
  console.log('Requesting plugins...');
  const response = await fetch(`${apiUrl}/plugins`, {
    method: 'GET',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });

  console.log('Plugins fetched successfully.\n');
  return response.json();
}

// Function to update the plugins
async function updatePlugin(pluginName, connections, updatedConnection) {
  console.log(`\nUpdating plugin ${pluginName} for connection "${updatedConnection.name}"...`);
  const payload = {
    name: pluginName,
    priority: 0,
    source: null,
    connections
  };

  // Log the configuration that will be sent
  console.log(`Request configuration for ${pluginName}:`, {
    connection: updatedConnection,
    total_connections: connections.length
  }, '\n');

  console.log(`Sending request to update plugin ${pluginName}...`);
  const response = await fetch(`${apiUrl}/plugins/${pluginName}`, {
    method: 'PUT',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  
  // Log the response details
  console.log(`Response from ${pluginName} update:`, {
    status: response.status,
    success: response.ok,
    connection_found: result.connections?.some(conn => conn.id === updatedConnection.id),
    connection_config: result.connections?.find(conn => conn.id === updatedConnection.id)
  }, '\n');

  if (!response.ok) {
    console.log(`Warning: Plugin ${pluginName} update might have failed. Status: ${response.status}\n`);
  }
}

// Function to process and associate the plugins to the original payload
async function processUpdatePlugins(payload) {
  console.log(`\nPROCESSING UPDATE PLUGINS FOR CONNECTION "${payload.connectionName}"\n`);
  const plugins = await getPlugins();

  // Associate the plugins based on accessControl and runbook_config
  const accessControlPlugin = plugins.find(plugin => plugin.name === 'access_control');
  const runbooksPlugin = plugins.find(plugin => plugin.name === 'runbooks');

  console.log('--------------------------------\n');
  // Update the Access Control plugin if accessControl exists in the payload
  if (payload.accessControl && accessControlPlugin) {
    console.log(`\nUPDATE ACCESS CONTROL PLUGIN FOR CONNECTION "${payload.connectionName}"\n`);

    // Log existing configuration if found
    const existingConfig = accessControlPlugin.connections.find(conn => conn.id === payload.connectionId);
    if (existingConfig) {
      console.log('Current configuration in Access Control plugin:', existingConfig, '\n');
    }

    const newConnection = {
      id: payload.connectionId,
      name: payload.connectionName,
      config: payload.accessControl
    };

    console.log('Configuration to be applied:', newConnection, '\n');

    const accessControlConnections = existingConfig
      ? accessControlPlugin.connections.map(conn => 
          conn.id === payload.connectionId ? newConnection : conn
        )
      : [...accessControlPlugin.connections, newConnection];

    await updatePlugin('access_control', accessControlConnections, newConnection);
    console.log('--------------------------------\n');
  }

  // Update the Runbooks plugin if runbook_config exists in the payload
  if (payload.runbook_config && runbooksPlugin) {
    console.log(`\nUPDATE RUNBOOKS PLUGIN FOR CONNECTION "${payload.connectionName}"\n`);

    // Log existing configuration if found
    const existingConfig = runbooksPlugin.connections.find(conn => conn.id === payload.connectionId);
    if (existingConfig) {
      console.log('Current configuration in Runbooks plugin:', existingConfig, '\n');
    }

    const newConnection = {
      id: payload.connectionId,
      name: payload.connectionName,
      config: [payload.runbook_config]
    };

    console.log('Configuration to be applied:', newConnection, '\n');

    const runbookConnections = existingConfig
      ? runbooksPlugin.connections.map(conn => 
          conn.id === payload.connectionId ? newConnection : conn
        )
      : [...runbooksPlugin.connections, newConnection];

    await updatePlugin('runbooks', runbookConnections, newConnection);
    console.log('--------------------------------\n');
  }
}

// Function to delete a connection
async function deleteConnection(connectionIds) {
  console.log('DELETE CONNECTIONS\n');

  console.log('Requesting connections deletion...');
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

  console.log('Finished deleting connections.\n');
  console.log('--------------------------------\n');
}

// Function to handle the incoming payload
async function handleActions(payload) {
  console.log('START HANDLING ACTIONS\n');
  console.log('--------------------------------\n');

  for (const item of payload) {
    if (item.action === 'create') {
      const createdOrUpdatedConnection = await createOrUpdateConnection(item);

      if (item.accessControl || item.runbook_config) {
        await processUpdatePlugins({
          ...item,
          connectionName: createdOrUpdatedConnection.name,
          connectionId: createdOrUpdatedConnection.id
        });
      }
    }

    if (item.action === 'delete') {
      await deleteConnection(item.connections);
    }
  }

  console.log('ACTIONS HANDLED SUCCESFULLY.\n');
}

/*
const incomingPayload = {
  payload: [
    {
      action: 'create',
      name: 'PIX-USER',
      type: 'mysql',
      secrets: {
        host: '_vault:kv/techcross/hom:PICPAY_DBRE_USER_AWS...:DBHOST',
        port: '_vault:SECRETNAME:SECRETKEY:DBPORT',
        user: '_vault:SECRETNAME:SECRETKEY:DBUSER',
        password: '_vault:SECRETNAME:SECRETKEY:DBPASSWORD',
        db: '_vault:SECRETNAME:SECRETKEY:DBNAME',
        sslmode: '_vault:SECRETNAME:SECRETKEY:SSL'
      },
      agentId: 'bb816905-000e-57f7-93a6-4acfb54cea2a',
      accessMode: {
        runbook: true,
        web: false,
        native: false
      },
      // Can be used either jiraTemplate to create a new one...
      jiraTemplate: {
        name: 'Database Access Request',
        description: 'Template for database access requests',
        project_key: 'DBA',
        issue_type_name: 'Access Request',
        mapping_types: {
          items: [
            {
              type: 'custom',
              value: 'value_123',
              jira_field: 'customfield_123',
              description: 'Description here'
            },
            {
              type: 'preset',
              value: 'session.id',
              jira_field: 'customfield_123',
              description: 'Description here'
            }
          ]
        },
        prompt_types: {
          items: [
            {
              label: 'Product',
              jira_field: 'customfield_123',
              required: true,
              description: 'Description here'
            }
          ]
        },
        cmdb_types: {
          items: [
            {
              description: "Product Field",
              jira_field: "customfield_10109",
              jira_object_type: "Product",
              required: true,
              value: "pix"
            }
          ]
        }
      },
      ... or jiraTemplateId for an existing one.

      // ** NEVER USE BOTH jigraTemplate and jiraTemplateId **

      // jiraTemplateId: '44ee546b-6232-4b9e-bb4f-22ad832d58c2',
      // Guardrails can be a mix of existing IDs and new rules
      guardrails: [
        // Use an existing guardrail by ID
        'da9c521c-5d09-4f73-94ca-28c6d9805443',
        // Or create a new guardrail
        {
          name: 'prevent-select-all',
          description: 'Prevent usage of SELECT * in queries',
          input: {
            rules: [
              {
                type: 'deny_words_list',
                words: ['SELECT *'],
                pattern_regex: '',
                name: 'no-select-all'
              }
            ]
          },
          output: {
            rules: [
              {
                type: 'pattern_match',
                words: [],
                pattern_regex: '[A-Z0-9]+'
              }
            ]
          }
        },
        {
          name: 'validate-where-clause',
          description: 'Ensure WHERE clause in UPDATE/DELETE statements',
          input: {
            rules: [
              {
                type: 'pattern_match',
                words: [],
                pattern_regex: '(?i)(UPDATE|DELETE).*WHERE',
                name: 'require-where'
              }
            ]
          },
          output: {
            rules: [
              {
                type: 'pattern_match',
                words: [],
                pattern_regex: '[A-Z0-9]+'
              }
            ]
          }
        }
      ],
      runbook_config: '/account-statment-prd/',
      datamasking: false,
      enableReview: false,
      reviewGroups: ['group1', 'group2'],
      schema: false,
      accessControl: ['admin']
    }
    // {
    //   action: 'delete',
    //   connections: ['connection-id-1',
    // }
  ]
};
*/

const incomingPayload = {{ .payload
      | required "payload is required"
      | type "textarea"}}

// Process the incoming payload
handleActions(incomingPayload.payload);
