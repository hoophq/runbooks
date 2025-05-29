#!/bin/bash

TABLE_NAME='{{ .tableName | type "select" | description "Select a table or index" | options "default Employee Customers" }}'

# -------- Filters - optional --------
FILTER_VALUE='{{ .filterValue | description "Enter attribute value" }}'
FILTER_TYPE='{{ .filterType | type "select" | description "Type" | options "String" "Number" "Binary" "Boolean" "Null" | default "String" }}'
FILTER_CONDITION='{{ .filterCondition | type "select" | description "Condition" | options "Equal_to" "Not_equal_to" "Less_than_or_equal_to" "Less_than" "Greater_than_or_equal_to" "Greater_than" "Between" "Exists" "Not_exists" "Contains" "Not_contains" "Begins_with" | default "Equal_to" }}'
FILTER_ATTRIBUTE='{{ .filterAttribute | description "Attribute name" }}'


# -------- Build and Run Command --------
CMD="aws dynamodb scan --table-name \"$TABLE_NAME\""

# Add filter if provided
if [ -n "$FILTER_ATTRIBUTE" ] && [ -n "$FILTER_VALUE" ]; then
    # Build attribute value based on type
    case "$FILTER_TYPE" in
        "String")
            ATTR_VALUE="{\"S\": \"$FILTER_VALUE\"}"
            ;;
        "Number")
            ATTR_VALUE="{\"N\": \"$FILTER_VALUE\"}"
            ;;
        "Binary")
            ATTR_VALUE="{\"B\": \"$FILTER_VALUE\"}"
            ;;
        "Boolean")
            # Convert to lowercase for boolean
            if [ "$FILTER_VALUE" == "true" ] || [ "$FILTER_VALUE" == "True" ] || [ "$FILTER_VALUE" == "TRUE" ]; then
                ATTR_VALUE="{\"BOOL\": true}"
            else
                ATTR_VALUE="{\"BOOL\": false}"
            fi
            ;;
        "Null")
            ATTR_VALUE="{\"NULL\": true}"
            ;;
    esac
    
    case "$FILTER_CONDITION" in
        "Equal_to")
            CMD+=" --filter-expression \"#attr = :val\""
            CMD+=" --expression-attribute-names '{\"#attr\": \"$FILTER_ATTRIBUTE\"}'"
            CMD+=" --expression-attribute-values '{\":val\": $ATTR_VALUE}'"
            ;;
        "Not_equal_to")
            CMD+=" --filter-expression \"#attr <> :val\""
            CMD+=" --expression-attribute-names '{\"#attr\": \"$FILTER_ATTRIBUTE\"}'"
            CMD+=" --expression-attribute-values '{\":val\": $ATTR_VALUE}'"
            ;;
        "Less_than")
            CMD+=" --filter-expression \"#attr < :val\""
            CMD+=" --expression-attribute-names '{\"#attr\": \"$FILTER_ATTRIBUTE\"}'"
            CMD+=" --expression-attribute-values '{\":val\": $ATTR_VALUE}'"
            ;;
        "Less_than_or_equal_to")
            CMD+=" --filter-expression \"#attr <= :val\""
            CMD+=" --expression-attribute-names '{\"#attr\": \"$FILTER_ATTRIBUTE\"}'"
            CMD+=" --expression-attribute-values '{\":val\": $ATTR_VALUE}'"
            ;;
        "Greater_than")
            CMD+=" --filter-expression \"#attr > :val\""
            CMD+=" --expression-attribute-names '{\"#attr\": \"$FILTER_ATTRIBUTE\"}'"
            CMD+=" --expression-attribute-values '{\":val\": $ATTR_VALUE}'"
            ;;
        "Greater_than_or_equal_to")
            CMD+=" --filter-expression \"#attr >= :val\""
            CMD+=" --expression-attribute-names '{\"#attr\": \"$FILTER_ATTRIBUTE\"}'"
            CMD+=" --expression-attribute-values '{\":val\": $ATTR_VALUE}'"
            ;;
        "Between")
            # For Between, we'd need a second value field
            CMD+=" --filter-expression \"#attr BETWEEN :val1 AND :val2\""
            CMD+=" --expression-attribute-names '{\"#attr\": \"$FILTER_ATTRIBUTE\"}'"
            CMD+=" --expression-attribute-values '{\":val1\": $ATTR_VALUE, \":val2\": $ATTR_VALUE}'"
            ;;
        "Exists")
            CMD+=" --filter-expression \"attribute_exists(#attr)\""
            CMD+=" --expression-attribute-names '{\"#attr\": \"$FILTER_ATTRIBUTE\"}'"
            ;;
        "Not_exists")
            CMD+=" --filter-expression \"attribute_not_exists(#attr)\""
            CMD+=" --expression-attribute-names '{\"#attr\": \"$FILTER_ATTRIBUTE\"}'"
            ;;
        "Contains")
            CMD+=" --filter-expression \"contains(#attr, :val)\""
            CMD+=" --expression-attribute-names '{\"#attr\": \"$FILTER_ATTRIBUTE\"}'"
            CMD+=" --expression-attribute-values '{\":val\": $ATTR_VALUE}'"
            ;;
        "Not_contains")
            CMD+=" --filter-expression \"NOT contains(#attr, :val)\""
            CMD+=" --expression-attribute-names '{\"#attr\": \"$FILTER_ATTRIBUTE\"}'"
            CMD+=" --expression-attribute-values '{\":val\": $ATTR_VALUE}'"
            ;;
        "Begins_with")
            CMD+=" --filter-expression \"begins_with(#attr, :val)\""
            CMD+=" --expression-attribute-names '{\"#attr\": \"$FILTER_ATTRIBUTE\"}'"
            CMD+=" --expression-attribute-values '{\":val\": $ATTR_VALUE}'"
            ;;
    esac
fi

# Run the command
echo "🔍 Running Scan on $TABLE_NAME:"
echo "$CMD"
echo ""
eval "$CMD"
