SELECT customerid, firstname, lastname, gender, country, phone, email, income
FROM customers
WHERE customerid = {{ .customer_id 
                    | description "the id of the customer"
                    | required "customer_id is required"
                    | type "number"
                    | pattern "^[0-9]+$"
                    | squote }}
AND country = {{ .country
                | type "text"
                | description "the country code US; BR, etc"
                | default "US"
                | pattern "^[a-zA-Z]+$"
                | squote }}
AND lastname = {{ .lastname
                | squote }}
