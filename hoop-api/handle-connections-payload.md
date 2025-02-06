# Connection Manager Documentation

## Overview
The Connection Manager is a JavaScript module designed to manage database connections and their configurations through a RESTful API. It provides functionality for creating, updating, and deleting connections with support for various database types, security features, and integration capabilities.

## Core Components

### Connection Types
The system supports multiple database connection types:
- MySQL
- PostgreSQL
- Microsoft SQL Server
- Oracle Database
- MongoDB
- Custom connections

Each connection type is categorized with a type and subtype specification:
```javascript
{
  "mysql": { type: "database", subtype: "mysql" },
  "postgres": { type: "database", subtype: "postgres" },
  "mssql": { type: "database", subtype: "mssql" },
  "oracledb": { type: "database", subtype: "oracledb" },
  "mongodb": { type: "database", subtype: "mongodb" },
  "custom": { type: "custom", subtype: "custom" }
}
```

## Payload Structure and Usage

### Top-Level Fields Description

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| action | string | Yes | Action to perform. Valid values: "create" or "delete" |
| name | string | Yes (for create) | Unique identifier for the connection. Immutable after creation |
| type | string | Yes (for create) | Database type. Must match available connection types |
| secrets | object | Yes (for create) | Connection credentials |
| agentId | string | Yes (for create) | Identifier of the agent that will manage this connection |
| accessMode | object | Yes (for create) | Configuration for different types of access (runbook, web, native) |
| datamasking | boolean | No | Enable/disable data masking features |
| enableReview | boolean | No | Enable/disable review process for connection access |
| reviewGroups | array | No | Groups that can review connection access requests |
| schema | boolean | No | Enable/disable schema access for the connection |
| accessControl | array | No | Groups that have access to this connection |
| jiraTemplate/jiraTemplateId | object/string | No | Jira integration configuration (use one or the other, not both) |
| guardrails | array | No | Security rules and constraints for the connection |

### Basic Structure
```javascript
{
  "payload": [
    {
      "action": "create",
      // Connection configuration
    },
    {
      "action": "delete",
      // Delete configuration
    }
  ]
}
```

### Create/Update Connection
```javascript
{
  "action": "create",
  "name": "PIX-USER",        // Connection name
  "type": "mysql",           // Connection type
  "secrets": {
    "host": "_vault:kv/techcross/hom:PICPAY_DBRE_USER_AWS...:DBHOST",
    "port": "_vault:SECRETNAME:SECRETKEY:DBPORT",
    "user": "_vault:SECRETNAME:SECRETKEY:DBUSER",
    "password": "_vault:SECRETNAME:SECRETKEY:DBPASSWORD",
    "db": "_vault:SECRETNAME:SECRETKEY:DBNAME",
    "sslmode": "_vault:SECRETNAME:SECRETKEY:SSL"
  },
  "agentId": "bb816905-000e-57f7-93a6-4acfb54cea2a",
  "accessMode": {
    "runbook": true,         // Enable runbook access
    "web": false,            // Disable web access
    "native": false          // Disable native access
  },
  "datamasking": false,      // Enable/disable data masking
  "enableReview": false,     // Enable/disable review process
  "reviewGroups": ["group1", "group2"],  // Review groups
  "schema": false,           // Enable/disable schema access
  "accessControl": ["admin"] // Access control groups
}
```

### Delete Connection
```javascript
{
  "action": "delete",
  "connections": ["connection-id-1", "connection-id-2"]
}
```

## Optional Components

### Jira Integration
```javascript
"jiraTemplate": {
  "name": "Database Access Request",
  "description": "Template for database access requests",
  "project_key": "DBA",
  "issue_type_name": "Access Request",
  "mapping_types": {
    "items": [
      {
        "type": "custom",
        "value": "value_123",
        "jira_field": "customfield_123",
        "description": "Description here"
      },
      {
        "type": "preset",
        "value": "session.id",
        "jira_field": "customfield_123",
        "description": "Description here"
      }
    ]
  },
  "prompt_types": {
    "items": [
      {
        "label": "Product",
        "jira_field": "customfield_123",
        "required": true,
        "description": "Description here"
      }
    ]
  }
}
```

### Guardrails Configuration
```javascript
"guardrails": [
  // Existing guardrail reference
  "da9c521c-5d09-4f73-94ca-28c6d9805443",
  
  // New guardrail definition
  {
    "name": "prevent-select-all",
    "description": "Prevent usage of SELECT * in queries",
    "input": {
      "rules": [
        {
          "type": "deny_words_list",
          "words": ["SELECT *"],
          "pattern_regex": "",
          "name": "no-select-all"
        }
      ]
    },
    "output": {
      "rules": [
        {
          "type": "pattern_match",
          "words": [],
          "pattern_regex": "[A-Z0-9]+"
        }
      ]
    }
  }
]
```

## Common Use Cases

### Basic Database Connection
```javascript
{
  "payload": [{
    "action": "create",
    "name": "SIMPLE-DB",
    "type": "mysql",
    "secrets": {
      "host": "_vault:kv/simple/prod:HOST",
      "port": "_vault:kv/simple/prod:PORT",
      "user": "_vault:kv/simple/prod:USER",
      "password": "_vault:kv/simple/prod:PASS"
    },
    "agentId": "agent-id",
    "accessMode": {
      "runbook": true,
      "web": true,
      "native": false
    }
  }]
}
```

### Secure Production Database
```javascript
{
  "payload": [{
    "action": "create",
    "name": "PROD-DB",
    "type": "postgres",
    "secrets": {
      "host": "_vault:kv/prod/db:HOST",
      "port": "_vault:kv/prod/db:PORT",
      "user": "_vault:kv/prod/db:USER",
      "password": "_vault:kv/prod/db:PASS"
    },
    "agentId": "agent-id",
    "accessMode": {
      "runbook": true,
      "web": false,
      "native": false
    },
    "datamasking": true,
    "enableReview": true,
    "reviewGroups": ["prod-dba"],
    "guardrails": ["secure-guardrail-id"]
  }]
}
```

## Important Notes

1. The `name` field is immutable after creation
2. For secrets, if you want, use vault references in the format: `_vault:path:key`
3. Either use `jiraTemplate` or `jiraTemplateId`, never both
4. Guardrails can mix existing IDs and new definitions
5. Review groups must exist before being referenced
6. Access control groups must be valid system groups
