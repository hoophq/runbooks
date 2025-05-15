#!/bin/bash
set -eo pipefail

TABLE_NAME='{{ .tableName | type "select" | description "the name of the table" | options "ats-placement-versions-dev" "ats-direct-v2-configs-dev" "user-details-dev" "launchpadVersions-dev" "multiAccounts-dev" }}'
KEY_CONDITION_EXPR='{{ .keyExpression | description "The condition that specifies the key values for items to beretrieved by the Query action" | required "keyExpression is required" }}'
EXPR_ATTRIBUTE_NAMES='{{ .exprAttributeNames | description "One or more substitution tokens for attribute names in an expression" | required "exprAttributeNames is required" }}'
EXPR_ATTRIBUTE_VALUES='{{ .exprAttributeValues | description " One or more values that can be substituted in an expression" | required "exprAttributeValues is required" }}'

aws dynamodb query \
    --no-cli-pager \
    --no-cli-auto-prompt \
    --table-name $TABLE_NAME \
    --key-condition-expression "$KEY_CONDITION_EXPR" \
    --expression-attribute-names "$EXPR_ATTRIBUTE_NAMES" \
    --expression-attribute-values "$EXPR_ATTRIBUTE_VALUES"
