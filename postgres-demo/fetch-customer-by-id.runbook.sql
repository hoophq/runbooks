SELECT customerid, firstname, lastname, gender, country, phone, email, income
FROM customers
WHERE customerid = {{ .customer_id 
                    | description "the id of the customer"
                    | required "customer_id is required"
                    | type "number"
                    | pattern "^[0-9]+$"
                    | squote }}
