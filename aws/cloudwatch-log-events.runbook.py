import boto3
import os

def get_latest_log_stream_name(client, log_group_name):
    stream_response = client.describe_log_streams(
        logGroupName=log_group_name,
        orderBy='LastEventTime',
        descending=True,
        limit=2  # Just get the most recent stream
    )
    if not stream_response.get('logStreams'):
        print(f"No log streams found in log group: {log_group_name}")
        return []
    stream_name = stream_response['logStreams'][0]['logStreamName']
    return stream_name

def get_all_logs_from_stream_name(client, log_stream_name):
    all_events = []
    next_token = None
    prev_token = None

    # This is the pagination loop for get_log_events
    while True:
        if next_token:
            event_response = client.get_log_events(
                logGroupName=log_group_name,
                logStreamName=log_stream_name,
                nextToken=next_token
            )
        else:
            event_response = client.get_log_events(
                logGroupName=log_group_name,
                logStreamName=log_stream_name
            )

        # Add events to our collection
        events = event_response.get('events', [])
        all_events.extend(events)

        # Get next token for pagination
        next_token = event_response.get('nextForwardToken')

        # CloudWatch pagination is complete when the same token is returned twice
        if next_token == prev_token:
            break
        prev_token = next_token
    return all_events


log_group_name = '''
{{ .logGroupName    | type "select"
                    | description "The log group name from AWS Cloudwatch to fetch logs"
                    | options   "/aws/containerinsights/myapp-prod/application"
                                "/aws/containerinsights/myapp-prod/dataplane"
                                "/aws/eks/myapp-prod/cluster"
                                "/aws/lambda/logdna_cloudwatch"
                                "/aws/rds/instance/myappdb/postgresql"
                                "/aws/chatbot/core-team-testing"
                                "/aws/apigateway/capi"
                                "/aws-glue/crawlers"
                                "/aws-glue/jobs/error"
                    }}
'''.strip()



# Example usage
if __name__ == "__main__":
    if not log_group_name:
        raise ValueError("log_group_name variable is not set")
    client = boto3.client('logs')
    log_stream_name = get_latest_log_stream_name(client, log_group_name)
    all_logs = get_all_logs_from_stream_name(client, log_stream_name)

    print(f"stream_name={log_stream_name}\nlog_events={len(all_logs)}")
    print('-----')

    # Print the 5 most recent logs
    for log in all_logs:
        print(log['message'])
        # print(f"Timestamp: {log['timestamp']}")
        # print(f"Message: {log['message']}")
        # print("---")
