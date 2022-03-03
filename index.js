const crypto = require('crypto');

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
    if (!event.requestContext.authorizer) {
        errorResponse('Authorization not configured', context.awsRequestId, callback);
        return;
    }

    // Because we're using a Cognito User Pools authorizer, all of the claims
    // included in the authentication token are provided in the request context.
    // This includes the username as well as other attributes.
    const username = event.requestContext.authorizer.claims['cognito:username'];

    const requestBody = JSON.parse(event.body);

    const userData = requestBody.UserData;

    // const userData = [
    //     { event_id: "event3", user_id: "event3", church_name: "grace" },
    //     { event_id: "event3", user_id: "user1", church_name: "" },
    //     { event_id: "event3", user_id: "user2", church_name: "" },
    //     { event_id: "event3", user_id: "user3", church_name: "" },
    //     { event_id: "event3", user_id: "user4", church_name: "" }
    // ];


    // const userData = { event_id: "event1", user_id: "event1", church_name: "grace" };


    recordUser(username, userData).then(() => {


        // Because this Lambda function is called by an API Gateway proxy integration
        // the result object must use the following structure.
        callback(null, {
            statusCode: 201,
            body: JSON.stringify({
                EventId: userData.event_id,
                UserID: userData.user_id,
                ChurchName: userData.church_name,
                Rider: username,
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        });
    }).catch((err) => {
        console.error(err);

        // If there is an error during processing, catch it and return
        // from the Lambda function successfully. Specify a 500 HTTP status
        // code and provide an error message in the body. This will provide a
        // more meaningful error response to the end client.
        errorResponse(err.message, context.awsRequestId, callback)
    });
};

function recordUser(username, userData) {


    const params = {
        RequestItems: {
            "event_log": userData.map(userData => ({
                PutRequest: {
                    Item: {
                        event_id: userData.event_id,
                        user_id: userData.user_id,
                        church_name: userData.church_name,
                        create_date: new Date().toISOString()
                    }
                }
            }))
        }
    };

    return ddb.batchWrite(params, function(err, data) {
        if (err) {
            console.log("Error", err);
        }
        else {
            console.log("Success", data);
        }
    }).promise();

}


function errorResponse(errorMessage, awsRequestId, callback) {
    callback(null, {
        statusCode: 500,
        body: JSON.stringify({
            Error: errorMessage,
            Reference: awsRequestId,
        }),
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    });
}
