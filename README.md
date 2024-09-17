![Runbooks Cover](/assets/runbooks.png)

<h1 align="center"><b>hoop.dev Runbooks</b></h1>
<p align="center">
    Hoop Runbooks is a powerful feature that allows you to automate tasks in your organization. Create templates that run against a connection runtime, sourced directly from your Git server.
    <br />
    <br />
    <a target="_blank" href="https://hoop.dev">Website</a>
    ·
    <a target="_blank" href="https://hoop.dev/docs">Docs</a>
    ·
    <a href="https://github.com/hoophq/hoop/discussions">Discussions</a>
  </p>
</p>


## 📖 Table of Contents

- [Features](#-features)
- [Getting Started](#-getting-started)
- [How It Works](#-how-it-works)
- [Template Specification](#-template-specification)
- [Template Functions](#-template-functions)
- [Security Tips](#-security-tips)
- [Examples](#-examples)
- [Community](#-community)

## 🌟 Features

- **Git Integration**: Source your runbook templates directly from your Git server
- **Flexible Templating**: Use Go's powerful text/template engine
- **Input Validation**: Specify and validate inputs for your runbooks
- **Environment Variables**: Map inputs to environment variables for secure execution
- **Multiple Runtimes**: Execute runbooks against various connection runtimes

## 🚀 Getting Started

1. [Install hoop.dev](https://hoop.dev/docs/getting-started/installation/overview) or use our [managed instance](https://use.hoop.dev)
2. Visit the Runbooks management page in hoop.dev portal by clicking in our side menu on Settings > Runbooks > Configurations
3. Create your Runbook repository by forking this repository or creating your one
4. Add your Git address and SSH key to access your runbook templates
5. Create your first runbook template
6. Execute and automate!

For detailed setup instructions, check out our [official documentation](https://hoop.dev/docs/learn/runbooks/overview).

## 🔧 How It Works

Runbooks use templates that are executed against a connection runtime. Here's a simple example:

```sql
SELECT customerid, firstname, lastname
FROM customers
WHERE customerid = {{ .customer_id
                    | description "the id of the customer"
                    | required "customer_id is required"
                    | type "number"
                    | squote }}
```

This runbook generates an input:
- `customer_id`
  - Type: number
  - Required: true
  - Description: the id of the customer

## 📋 Template Specification

Runbooks use a JSON specification to define inputs. Here's an example:

```json
{
    "items": [
        {
            "name": "team/finops/sql/fetch-customer.runbook.sql",
            "metadata": {
                "customer_id": {
                    "description": "the id of the customer",
                    "required": true,
                    "type": "number"
                }
            }
        }
    ]
}
```

## 🛠 Template Functions

Hoop Runbooks support various template functions to enhance your templates:

- `required`: Ensure an input is provided
- `default`: Set a default value
- `pattern`: Validate input with regex
- `description`: Add input descriptions
- `type`: Specify input types
- `squote`/`dquote`: Quote inputs
- `encodeb64`/`decodeb64`: Base64 encoding/decoding
- `asenv`: Map inputs to environment variables

## 🔒 Security Tips

- Use the `pattern` function to prevent SQL injection
- Utilize the `asenv` function to expose inputs as environment variables
- Always validate and sanitize inputs

## 📚 Examples

Check this repository for a collection of runbook examples covering various use cases.

## 💬 Community

Join our [GitHub Discussions](https://github.com/hoophq/hoop/discussions) to ask questions, share your runbooks, and connect with other users.

---

Built with ❤️ by the Hoop team. [Visit our website](https://hoop.dev) | [Read the docs](https://hoop.dev/docs)

